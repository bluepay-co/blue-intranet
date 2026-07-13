# Prospecção via CNPJ — nova aba em "Meus Clientes"

> Documento de especificação para implementação. Escrito para o agente que
> trabalha neste repositório (`blue-intranet`). Descreve **o que** construir e
> **como encaixar** no que já existe. Não é código final — é o contrato.

## 1. Problema / ideia

Hoje o módulo **Meus Clientes** só olha para dentro: lista os clientes que já
pertencem ao vendedor logado (ver `back-end/services/cliente.service.ts` →
`listarClientesDoVendedor`, escopado por `manager_id`).

Falta o passo de **prospecção**: o vendedor quer digitar um CNPJ e descobrir

1. **É meu cliente?** → mostra a ficha que já temos.
2. **É cliente da Bluepay, mas de outro vendedor?** → avisa que já tem dono
   (evita canibalizar carteira), sem expor dados sigilosos de outro vendedor.
3. **Não é cliente de ninguém?** → **disponível para prospecção**. Aí puxamos
   dados públicos da empresa (razão social, nome fantasia, CNAE/segmento,
   porte, situação cadastral, cidade/UF) via API externa de CNPJ.

O objetivo é transformar "Meus Clientes" num hub onde o vendedor tanto
gerencia a carteira atual quanto **qualifica novos alvos** sem sair da tela.

## 2. Escopo desta entrega

Implementar **apenas** a parte de prospecção por CNPJ, reaproveitando o módulo
`cliente` existente. Não mexer na listagem/detalhe atuais além do necessário
para adicionar a nova aba.

- [ ] Endpoint novo de prospecção no backend.
- [ ] Serviço de consulta à API externa de CNPJ (com cache).
- [ ] Mapa CNAE → segmento Bluepay.
- [ ] Função no módulo de API do front (`front-end/src/api/modules/clientes.js`).
- [ ] Nova aba "Prospecção" dentro da página `MeusClientes.jsx`.

## 3. Regras de negócio

Dado um CNPJ (normalizado para apenas dígitos), o backend decide entre 3 status:

| Situação | `status` | O que retornar |
|----------|----------|----------------|
| CNPJ pertence ao vendedor logado | `MEU_CLIENTE` | `{ clienteId }` → o front navega para a ficha existente (`/api/clientes/:id`). Nada de dado novo. |
| CNPJ existe em `clients` mas de outro `manager_id` | `CLIENTE_DE_OUTRO` | Mensagem "Empresa já é cliente Bluepay (carteira de outro vendedor)". **Não** expor nome do vendedor, taxa nem métricas. No máximo o nome comercial. |
| CNPJ não existe em `clients` | `DISPONIVEL` | Dados públicos da Receita via API externa + segmento mapeado. |

> **Segurança:** manter o padrão do módulo — o escopo de "meu cliente" vem
> SEMPRE do `manager_id` do vendedor logado (via `buscarVendedorPorEmail`),
> nunca de id vindo do request. O caso `CLIENTE_DE_OUTRO` existe justamente
> para NÃO vazar carteira alheia; trate-o como o mínimo de informação possível.

## 4. API externa de CNPJ — escolha

Consultar dados públicos da Receita Federal. Recomendação:

- **Primária: BrasilAPI** — `GET https://brasilapi.com.br/api/cnpj/v1/{cnpj}`.
  Grátis, sem chave, estável. Retorna razão social, nome fantasia, CNAE
  principal + secundários, situação cadastral, porte, capital social,
  endereço, sócios, data de abertura.
- **Fallback: CNPJá** (`https://open.cnpja.com/office/{cnpj}`) — dados mais
  ricos (Simples Nacional, inscrições estaduais), free com rate limit menor.

Boas práticas obrigatórias:

- **Consulta é feita no backend**, nunca no front (evita CORS, esconde chave
  de eventual plano pago, permite cache). Usar o `axios` já presente no projeto.
- **Cache por CNPJ** — dado de Receita muda pouco. Começar com cache em memória
  (TTL ~24h) e/ou tabela própria; protege contra rate limit.
- **Timeout curto** (~5s) + tratamento de erro: se a API externa cair, devolver
  `status: DISPONIVEL` com `dadosReceita: null` e uma flag `receitaIndisponivel`,
  não derrubar a request.

## 5. "Segmento" a partir do CNAE

A Receita **não** entrega o segmento pronto — entrega o **CNAE** (código de
atividade). O front precisa do segmento no vocabulário Bluepay (a tabela
`segments` que já usamos em `cliente.service.ts` via `LEFT JOIN segments`).

Criar um **de-para CNAE → segmento** em
`back-end/services/prospeccao/cnae-segmento.ts` (mapa estático, revisável).
Regra: casar pelo prefixo do CNAE (divisão/grupo) e cair num `"Outros"` quando
não houver match. Exemplos ilustrativos (validar com o time comercial):

```
6201-5, 6202-3, 6209-1  → "Tecnologia / Software"
4711-3, 4712-1, 4713-0  → "Varejo"
5611-2, 5612-1          → "Alimentação / Food Service"
8610-1, 8630-5          → "Saúde"
6810-2, 6821-8          → "Imobiliário"
default                 → "Outros"
```

## 6. Backend — arquivos a criar/editar

Seguir o padrão em camadas já usado (routes → controller → service).

### `back-end/routes/cliente.routes.ts` (editar)
Adicionar rota nova, mesmo `ACESSO` (KAM, INSIGHT_SALES, DESENVOLVEDOR):

```ts
// GET /api/clientes/prospeccao?cnpj=00000000000000
clienteRouter.get('/prospeccao', ACESSO, prospectarCnpj);
```

> Registrar **antes** de `'/:id'` para o Express não tratar "prospeccao" como id.

### `back-end/controllers/cliente.controller.ts` (editar)
Nova função `prospectarCnpj(req, res)`:
1. Validar/normalizar `cnpj` (14 dígitos). 400 se inválido.
2. `buscarVendedorPorEmail(req.usuario.email)` → 404 se não achar (padrão atual).
3. Chamar `service.prospectarCnpj(vendedor.id, cnpjLimpo)`.
4. Retornar o objeto `{ status, ... }`. Mesmo formato de try/catch com `AppError`
   dos outros handlers.

### `back-end/services/cliente.service.ts` (editar) + `services/prospeccao/*`
Função `prospectarCnpj(managerId, cnpj)`:
1. Query em `clients` por `cnpj` (comparar só dígitos): existe?
   - Sim e `manager_id === managerId` → `{ status: 'MEU_CLIENTE', clienteId }`.
   - Sim e outro manager → `{ status: 'CLIENTE_DE_OUTRO', nomeComercial }`.
   - Não → segue para a Receita.
2. `consultarReceita(cnpj)` (novo `services/prospeccao/receita.client.ts`, com
   cache + axios) → normaliza para um DTO estável.
3. `mapearSegmento(cnaePrincipal)` → segmento Bluepay.
4. Retornar:

```ts
{
  status: 'DISPONIVEL',
  cnpj,
  razaoSocial, nomeFantasia,
  situacaoCadastral,        // "ATIVA" / "BAIXADA" ...
  porte,
  cnaePrincipal: { codigo, descricao },
  segmento,                 // já no vocabulário Bluepay
  endereco: { cidade, uf },
  aberturaEm,
  receitaIndisponivel: false
}
```

## 7. Front-end — arquivos a editar

### `front-end/src/api/modules/clientes.js` (editar)
Adicionar:

```js
/** Prospecção por CNPJ: verifica se já é cliente; se não, puxa dados públicos. */
export async function prospectarCnpj(cnpj) {
  const { data } = await api.get('/api/clientes/prospeccao', { params: { cnpj } })
  return data // { status, ... }
}
```

### `front-end/src/pages/clientes/MeusClientes.jsx` (editar)
- Adicionar um seletor de abas: **"Meus Clientes"** (lista atual) e
  **"Prospecção"** (nova).
- Aba Prospecção: input de CNPJ + botão. Ao submeter, chamar `prospectarCnpj`.
- Renderizar por `status`:
  - `MEU_CLIENTE` → botão/redirect para a ficha (`ClienteDetalhe`) via `clienteId`.
  - `CLIENTE_DE_OUTRO` → aviso neutro (âmbar): "Já é cliente Bluepay".
  - `DISPONIVEL` → card verde "Disponível para prospecção" com razão social,
    nome fantasia, segmento, CNAE, porte, situação, cidade/UF.
  - `receitaIndisponivel` → mostrar "dados da Receita indisponíveis no momento".

Reaproveitar os componentes de card/estado já usados na página; manter o mesmo
visual da aba de listagem.

## 8. Fluxo (resumo)

```
Vendedor digita CNPJ na aba "Prospecção"
        │
        ▼
GET /api/clientes/prospeccao?cnpj=...   (escopo = vendedor logado)
        │
        ├─ CNPJ na carteira do vendedor ──► MEU_CLIENTE  → abre a ficha existente
        │
        ├─ CNPJ é cliente de outro ───────► CLIENTE_DE_OUTRO → aviso neutro
        │
        └─ CNPJ não é cliente ────────────► BrasilAPI + CNAE→segmento
                                            → DISPONIVEL (dados p/ prospectar)
```

## 9. Fora de escopo (por enquanto)

- Salvar o alvo prospectado como lead/pré-venda (já existe módulo `prevendas` —
  integração futura, não agora).
- Enriquecimento pago (Serpro/Assertiva).
- Consulta em lote de CNPJs.
