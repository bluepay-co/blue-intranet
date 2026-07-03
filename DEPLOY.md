# 🚀 Deploy da Intranet Blue no Hyper-V (Docker)

Guia para subir a aplicação (front + back + banco) numa **VM Ubuntu Server dentro do Hyper-V**,
usando **Docker Engine** (leve, sem Docker Desktop no servidor).

Arquitetura final (tudo numa porta só, a `80`):

```
Navegador → :80 Nginx (front-end) ──/api ─→ backend:5000 (Express)
                                   ──/uploads─→ backend:5000
                                                     │
                                          db:5432 (Postgres intranet)
                                          35.198.37.22 (banco de consulta, remoto, read-only)
```

---

## Visão geral do que instalar

| Onde | O que instalar |
|------|----------------|
| **Sua máquina (dev)** | Nada obrigatório além do que já tem. (Docker Desktop é opcional — dá pra buildar direto na VM.) |
| **VM servidora (Ubuntu)** | Docker Engine + plugin Docker Compose. Só isso. |

> 💡 Você **não precisa** do Docker Desktop no servidor. O caminho mais simples é copiar o
> projeto pra VM e rodar `docker compose up --build` lá — a própria VM builda as imagens.

---

## Passo 1 — Criar a VM Ubuntu no Hyper-V

1. Baixe a ISO do **Ubuntu Server 24.04 LTS**: https://ubuntu.com/download/server
2. No **Gerenciador do Hyper-V** → *Ação → Novo → Máquina Virtual*:
   - **Geração 2**
   - Memória: **4096 MB** (mínimo 2 GB), pode marcar memória dinâmica
   - Disco: **40 GB**
   - Rede: conecte ao **Virtual Switch externo** (pra ficar acessível na rede da empresa).
     Se não existir um, crie em *Gerenciador de Comutadores Virtuais → Externo*.
   - Aponte a ISO baixada como mídia de instalação.
3. **Antes de ligar**: nas *Configurações* da VM → *Segurança* → em "Modelo" selecione
   **Microsoft UEFI Certificate Authority** (senão o Ubuntu não dá boot na Geração 2).
4. Ligue, instale o Ubuntu Server (marque **"Install OpenSSH server"** na tela de features).
5. Após instalar, descubra o IP da VM: `ip a` → anote (ex.: `192.168.0.50`). Esse é o **IP_DO_SERVIDOR**.

---

## Passo 2 — Instalar o Docker Engine na VM

Conecte na VM (pelo console do Hyper-V ou `ssh usuario@IP_DO_SERVIDOR`) e rode:

```bash
# Instala Docker Engine + Compose (script oficial)
curl -fsSL https://get.docker.com | sudo sh

# Permite usar docker sem sudo (relogue depois)
sudo usermod -aG docker $USER

# Confirma
docker --version
docker compose version
```

Saia e entre de novo na sessão (pra valer o grupo `docker`).

---

## Passo 3 — Exportar o banco da INTRANET da sua máquina

Na **sua máquina** (onde o Postgres da intranet está hoje), gere um dump completo:

```bash
# Ajuste usuário/porta se necessário. Vai pedir a senha do banco.
pg_dump -h localhost -U dev_intranet -d intranet_dev -Fc -f intranet_dump.dump
```

> `-Fc` = formato comprimido (restaura com `pg_restore`). Preserva schema `blue_intranet`, tabelas e dados.
> O banco de **consulta** (35.198.37.22) **não** precisa de dump — é remoto e você só o consome.

---

## Passo 4 — Levar o projeto e o dump para a VM

Do diretório do projeto na sua máquina:

```bash
# Copia o projeto (o rsync ignora node_modules pra ficar rápido)
rsync -az --exclude node_modules --exclude .git \
  "./" usuario@IP_DO_SERVIDOR:~/blue-intranet/

# Copia o dump do banco
scp intranet_dump.dump usuario@IP_DO_SERVIDOR:~/blue-intranet/
```

> Se não tiver `rsync`, pode zipar a pasta (sem `node_modules`) e usar `scp`.
> **Importante:** os arquivos `back-end/.env` e `front-end/.env` são ignorados pelo git,
> mas o `rsync` acima os copia normalmente — confira que eles chegaram na VM.

---

## Passo 5 — Configurar as variáveis na VM

Na VM, dentro de `~/blue-intranet`:

```bash
cp .env.deploy.example .env
nano .env
```

Preencha no `.env` da raiz:
- `DB_USER` / `DB_PASSWORD` / `DB_NAME` → **iguais** aos de `back-end/.env`.
- `VITE_API_BASE_URL=http://IP_DO_SERVIDOR` (o IP real! não localhost).
- `VITE_GOOGLE_REDIRECT_URI=http://IP_DO_SERVIDOR`
- Demais `VITE_*` conforme seu `front-end/.env` atual.

Depois edite **`back-end/.env`** na VM e ajuste:
- `DB_HOST` → deixe `localhost` mesmo (o compose sobrescreve pra `db` automaticamente).
- `GOOGLE_REDIRECT_URI` → `http://IP_DO_SERVIDOR`
- `FRONTEND_URL` → `http://IP_DO_SERVIDOR`
- Mantenha os segredos (`JWT_SECRET`, `*_ENCRYPTION_KEY`, `SLACK_*`, `CONSULTA_DB_*`) como estão.

> ⚠️ **Google OAuth:** no [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
> no seu OAuth Client, adicione `http://IP_DO_SERVIDOR` em *Authorized JavaScript origins* e
> em *Authorized redirect URIs* — senão o login com Google falha em produção.

---

## Passo 6 — Subir os containers

Na VM, em `~/blue-intranet`:

```bash
docker compose up -d --build
```

Isso builda as 3 imagens e sobe tudo. Acompanhe:

```bash
docker compose ps
docker compose logs -f backend
```

---

## Passo 7 — Restaurar o banco dentro do container

Com os containers de pé, restaure o dump no Postgres do container:

```bash
# Copia o dump pra dentro do container do banco
docker compose cp intranet_dump.dump db:/tmp/intranet_dump.dump

# Restaura (ajuste DB_USER/DB_NAME se mudou no .env)
docker compose exec db pg_restore -U dev_intranet -d intranet_dev --clean --if-exists /tmp/intranet_dump.dump
```

Reinicie o back-end pra pegar o banco já populado:

```bash
docker compose restart backend
```

> Se você **não** tiver dados a migrar e quiser começar do zero, pule o dump e rode
> as migrations em `back-end/database/migrations/` manualmente via
> `docker compose exec -T db psql -U dev_intranet -d intranet_dev < arquivo.sql`.

---

## Passo 8 — Testar

No navegador de qualquer máquina da rede: **`http://IP_DO_SERVIDOR`**

- A tela do front deve carregar.
- Faça login (Google) e confira se os dados aparecem.
- Se algo falhar, veja os logs: `docker compose logs -f backend` / `... frontend`.

---

## Operação do dia a dia

```bash
docker compose ps                 # status
docker compose logs -f backend    # logs ao vivo
docker compose restart backend    # reiniciar um serviço
docker compose down               # derrubar tudo (dados do banco ficam no volume pgdata)
docker compose up -d --build      # atualizar após mudar o código
```

Backup do banco a qualquer momento:

```bash
docker compose exec db pg_dump -U dev_intranet -Fc intranet_dev > backup_$(date +%F).dump
```

---

## Notas importantes

- **Chat em tempo real (socket.io):** ainda não está ligado no `server.ts` (nem nas dependências).
  O Nginx já está preparado pra WebSocket, mas quando ativarem o socket será preciso criar um
  `http.createServer(app)` + `socket.io` no back-end. Nada disso bloqueia o deploy de hoje.
- **HTTPS:** este guia usa HTTP na porta 80 (rede interna). Se precisar de HTTPS, dá pra colocar
  um Nginx/Caddy na frente com certificado — posso te ajudar depois.
- **Persistência:** o banco vive no volume `pgdata` e os uploads em `back-end/uploads/`
  (bind-mount) — ambos sobrevivem a `docker compose down`.
