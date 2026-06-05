# 🎨 Guia de Assets — Tela de Login

Onde colocar cada arquivo da identidade visual. Tudo vai na pasta
`front-end/public/` e é referenciado pela raiz (`/arquivo.svg`).

> Hoje há **placeholders** em todos os caminhos — basta **substituir** o arquivo
> mantendo o mesmo nome, sem mexer no código.

## 📁 Caminhos exatos

| Onde aparece | Arquivo (substitua aqui) | Formato ideal | Observação |
|---|---|---|---|
| Painel escuro (esquerda) | `front-end/public/logo-branca.svg` | SVG (ou PNG transparente) | Logo **claro/branco** — fica sobre o fundo `#171e23` |
| Card / mobile (fundo branco) | `front-end/public/logo-azul.svg` | SVG (ou PNG transparente) | Logo **escuro/colorido** — fica sobre fundo branco |
| Aba do navegador (favicon) | `front-end/public/favicon.svg` | SVG 32×32 | Ícone da marca |

### Se o seu logo for PNG em vez de SVG
1. Coloque o arquivo em `front-end/public/` (ex.: `logo-branca.png`).
2. Troque a extensão no `src/components/Login.jsx`:
   - `src="/logo-branca.svg"` → `src="/logo-branca.png"`
   - `src="/logo-azul.svg"` → `src="/logo-azul.png"`

## 🎨 Cores da marca (já aplicadas no tema)

Definidas em `src/index.css` como variáveis reutilizáveis:

| Cor | Hex | Variável CSS | Classe Tailwind |
|---|---|---|---|
| Primária (escuro) | `#171e23` | `--brand` / `--primary` | `bg-brand` `bg-primary` |
| Secundária (ciano) | `#33b4e4` | `--brand-accent` / `--ring` | `bg-brand-accent` |
| Texto sobre escuro | `#ffffff` | `--brand-foreground` | `text-brand-foreground` |

> Qualquer componente novo pode usar `bg-brand`, `text-brand-accent`, etc.
> O foco dos inputs/botões já usa o ciano da marca automaticamente.

## (Opcional) Imagem de fundo no painel da marca
Se quiser uma foto/ilustração no painel esquerdo:
1. Coloque em `front-end/public/login-bg.jpg`.
2. No `Login.jsx`, na `<aside>`, adicione a classe de fundo
   `bg-[url('/login-bg.jpg')] bg-cover bg-center` (me peça que eu ajusto o overlay
   pra manter o texto legível).
