# Regras de requisições — polling, tempo real e rate limit

> Leitura obrigatória antes de criar uma rota na API, uma página ou um
> componente que busca dados. Vale para pessoas e para agentes de IA que
> trabalham neste repositório.

## Por que este documento existe

Em 2026-09 a intranet ficou **inacessível no login** ("Muitas requisições.
Tente novamente em alguns minutos."). Os bancos estavam saudáveis; o problema
era volume de requisições somado a um rate limit mal chaveado:

- Cada aba aberta fazia **4 buscas por minuto** (blog, chamados, atualizações,
  Kanban), visível ou não, o dia inteiro — ~240 requisições/hora por aba.
- Abas com sessão expirada continuavam fazendo polling e recebendo 401.
- O rate limit contava **por IP**, e a empresa inteira sai pelo mesmo IP
  (VPN/NAT). Quando o balde enchia, **ninguém conseguia logar**.

A correção (branch `fix-rate-limit-login`) trocou o polling por avisos em
tempo real via Socket.IO e passou o rate limit a contar por usuário. As regras
abaixo existem para o problema não voltar.

---

## Regra de ouro

**O cliente não pergunta "mudou algo?". O servidor avisa quando muda.**

Dado que muda por ação de alguém → o back-end emite um aviso `sync` pelo
socket após a escrita, e o front busca só quando recebe o aviso. Polling
existe apenas como rede de segurança (5 min com o socket conectado).

---

## Front-end

### 1. Nunca use `setInterval` para buscar dados

Todo dado que precisa ficar atualizado usa o hook `usePolling`
(`front-end/src/lib/usePolling.js`). Ele já:

- pausa com a aba oculta e busca na hora ao voltar (se o dado está velho ou
  chegou aviso enquanto estava oculta);
- busca quando chega o aviso `sync` do tipo informado;
- com o socket conectado, só repete a cada 5 min; sem socket, volta ao
  intervalo informado;
- recua em 429 respeitando o `Retry-After`;
- nunca sobrepõe chamadas.

```jsx
import { usePolling } from '@/lib/usePolling'

const buscar = useCallback(async () => {
  setChamados(await resumo())   // pode lançar — o hook trata o erro
}, [])

usePolling(buscar, {
  intervaloMs: 60_000,          // usado só SEM socket; com socket vira 5 min
  ativo: Boolean(usuario),      // false desliga (ex.: cargo sem acesso)
  evento: 'chamados',           // tipo do aviso sync que dispara a busca
})
```

`setInterval` só é aceitável para **efeito visual sem requisição** (ex.:
recalcular os selos "Atrasada"/"Esquecida" a cada minuto em
`KanbanEquipe.jsx`).

**Tipo novo de dado em tempo real?** Adicione o tipo em `TipoSync`
(`back-end/socket/sync.ts`) e no JSDoc do `usePolling`, e emita o aviso nas
escritas (ver Back-end, regra 1).

### 2. Intervalos mínimos

| Tipo de dado | `intervaloMs` (sem socket) |
|---|---|
| Notificação que o usuário espera ver logo (chamados, Kanban) | 60 s |
| Conteúdo que não é urgente (blog, avisos do T.I.) | 5 min |
| Qualquer coisa abaixo de 60 s | **não** — use aviso `sync` |

### 3. Busca ao carregar a página: uma vez só

- O padrão é `const carregar = useCallback(..., [deps])` +
  `useEffect(() => { carregar() }, [carregar])`.
- As dependências do `useCallback` devem ser **valores primitivos** (string,
  número, boolean). Objeto ou array recriado a cada render faz a página
  buscar em loop.
- Não faça "busca de montagem" **e** "busca quando o filtro muda" em dois
  effects: o segundo também roda na montagem e duplica a requisição
  (bug corrigido em `ChamadosProdutos.jsx`). Um único effect por filtro
  efetivo.

### 4. Campo de texto que consulta o servidor: debounce de 400 ms

Nunca uma requisição por tecla. Padrão usado em `MeusClientes.jsx`,
`ClientesDaEquipe.jsx` e `ChamadosProdutos.jsx`:

```jsx
const DEBOUNCE_BUSCA_MS = 400
useEffect(() => {
  const t = setTimeout(() => setBusca(buscaInput.trim()), DEBOUNCE_BUSCA_MS)
  return () => clearTimeout(t)
}, [buscaInput])
```

Se o filtro pode ser aplicado sobre dados já carregados, filtre no cliente
e não chame a API.

### 5. Socket: uma conexão só

A conexão é do `SocketProvider` (`front-end/src/realtime/`). Para escutar
eventos, use `useSocket()`; **nunca** crie outro `io(...)`. Ao registrar
handlers, remova-os no cleanup com `socket.off(evento, handler)` — não chame
`socket.disconnect()` fora do provider.

### 6. Páginas novas: sempre lazy

Toda página nova entra em `App.jsx` com `lazyComRecarga`
(`front-end/src/lib/lazyComRecarga.js`), nunca com `import` estático. Mantém
o bundle inicial leve e sobrevive a deploy (chunk antigo → recarrega uma vez).

```jsx
const MinhaPagina = lazyComRecarga(() => import('@/pages/MinhaPagina'))
```

### 7. Sessão expirada

Não trate 401 de sessão em cada página: o interceptor de `api.ts` dispara
`SESSAO_EXPIRADA_EVENT` e o `AuthProvider` desloga (o que para todo o
polling). Componentes só usam o módulo de API — nunca Axios/fetch direto.

---

## Back-end

### 1. Toda escrita que outro usuário precisa ver emite `sync`

Helpers em `back-end/socket/sync.ts`:

| Situação | Como avisar |
|---|---|
| Todos precisam saber (post do blog, aviso do T.I.) | `sincronizarAposEscrita('tipo')` no router |
| Só alguns usuários/cargos (chamado → autor + T.I.) | `sincronizarAposEscrita('tipo', async (req) => [salaUsuario(id), salaCargo(Role.TI)])` na rota |
| Dentro de um service/transação | `sincronizarSalas([...], 'tipo')` **depois do COMMIT** |

Regras:

- **Avise só quem precisa.** Aviso para todos faz todos os clientes buscarem.
  Prefira `salaUsuario(id)` / `salaCargo(role)` — todo socket entra nas
  duas salas ao conectar.
- **Nunca antes do COMMIT.** O cliente busca na hora e não veria o dado.
  Veja o padrão `avisosPendentes` + `transacao()` em `kanban.service.ts`.
- **Não avise em ações que não mudam o que os outros observam** (ex.:
  reação a post não emite `blog`).
- O middleware só avisa em escrita bem-sucedida (status < 400) e ignora GET.
- `req.params` só existe dentro da rota: middleware que lê `:id` vai **na
  rota**, não no `router.use`.
- O aviso não leva dados. O cliente busca pela rota REST, que aplica as
  permissões de sempre.

### 2. Coisas que vencem com o tempo: job no servidor, não polling no cliente

Lembrete, prazo, SLA etc. não são disparados por uma ação. Em vez de cada
aba perguntar a cada minuto, um job no servidor faz **uma consulta** e avisa
só os afetados. Modelo: `back-end/socket/lembretes-kanban.ts`
(`setInterval(...).unref()`, registrado em `server.ts`).

### 3. Rate limit

- O limite global (`middleware/api-rate-limit.middleware.ts`) conta **por
  usuário** (id do JWT): 1000 req/15 min. Sem token válido, por IP: 300.
- **Nunca** crie limitador chaveado só por IP para rota autenticada — a
  empresa inteira compartilha o IP. Use o padrão de
  `kanban-rate-limit.middleware.ts`: `req.usuario?.email`, IP como fallback.
- Limitador de rota específica (escrita, API de terceiros) fica **depois**
  do `authMiddleware` e responde 429 com mensagem clara.
- O login (`/api/auth/google`) não passa pelo limite global e só conta
  tentativas que falham. Não mude isso.
- `app.set('trust proxy', 1)` é obrigatório enquanto o nginx estiver na frente.

### 4. 401 só para sessão da intranet

O front desloga quando recebe 401 com `codigo: 'SESSAO_INVALIDA'`
(`CODIGO_SESSAO_INVALIDA` em `auth.middleware.ts`). Para outros casos
(ex.: sessão do Google expirada na Agenda), use 401 **sem** esse código ou
outro status — senão o usuário é deslogado da intranet sem motivo.

### 5. Rotas consultadas com frequência devem ser baratas

Se uma rota é chamada a cada aviso ou na abertura de toda página (resumo,
contadores, notificações): uma query, indexada, sem chamar API externa, sem
payload grande. Devolva só os campos que o cliente usa para decidir se há
novidade.

---

## Infra (nginx)

Mudanças em `front-end/nginx.conf` não podem remover:

- `resolver 127.0.0.11` + `proxy_pass` com variável — sem isso a API fica
  em 502 depois que o deploy recria o container do backend;
- `gzip`;
- cache `immutable` em `/assets/`, `no-cache` no `index.html` e `404` para
  asset inexistente (nunca devolver `index.html` no lugar de um `.js`).

Valide antes de subir:

```bash
docker run --rm -v "$PWD/front-end/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
  -v "$PWD/certs:/etc/nginx/certs:ro" nginx:alpine nginx -t
```

---

## Checklist de PR

Front-end:

- [ ] Nenhum `setInterval` que faz requisição (use `usePolling`)
- [ ] Dado que muda por ação de outro usuário usa `evento` no `usePolling`
- [ ] Página abre com **uma** requisição por dado (confira na aba Network)
- [ ] Campo de busca que consulta o servidor tem debounce
- [ ] Página nova registrada com `lazyComRecarga`
- [ ] Nenhuma conexão de socket nova (use `useSocket()`)

Back-end:

- [ ] Escrita que outros precisam ver emite `sync` para o público certo
- [ ] Aviso de transação sai depois do COMMIT
- [ ] Rate limit novo é chaveado por usuário, não só por IP
- [ ] 401 com `SESSAO_INVALIDA` só para JWT da intranet
- [ ] Rota chamada com frequência é uma query barata

---

## Como verificar em produção (Grafana / Loki)

Requisições por rota nas últimas 24 h (o label do job pode variar conforme o
Promtail):

```logql
topk(15, sum by (request_uri) (count_over_time({job="nginx"} | json | request_uri=~"/api/.*" [24h])))
```

429 e 401 (devem ficar perto de zero — vale criar alerta):

```logql
sum by (status) (count_over_time({job="nginx"} | json | status=~"429|401" [1h]))
```

**Sinal de alerta:** uma rota de leitura (`/resumo`, `/recentes`,
`/notificacoes`…) dominando o volume sem ninguém estar usando o sistema de
forma diferente. Isso quase sempre é polling novo fora do `usePolling` ou
um effect buscando em loop.
