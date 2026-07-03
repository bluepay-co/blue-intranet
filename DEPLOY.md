# 🚀 Deploy da Intranet Blue no Hyper-V (Docker)

Guia da instalação inicial da aplicação (front + back + banco) numa **VM Ubuntu dentro do
Hyper-V**, usando **Docker Engine**. Para **atualizações do dia a dia**, veja o
[ATUALIZAR.md](ATUALIZAR.md).

Arquitetura final:

```
Navegador → :443 HTTPS Nginx (front) ──/api ─────→ backend:5000 (Express)
                 (frontend)          ──/uploads──→ backend:5000
                 :80 → redirect 443                     │
                                            db:5432 (Postgres 18, banco `postgres`,
                                                     schema blue_intranet)
                                            35.198.37.22 (banco de consulta, remoto, read-only)
```

Acesso: **https://192.168.0.145.sslip.io**

---

## O que instalar

| Onde | O que instalar |
|------|----------------|
| **Sua máquina (dev)** | Nada além do que já tem (`rsync`, `ssh`, `openssl`, `pg_dump`). |
| **VM servidora (Ubuntu)** | Docker Engine + plugin Docker Compose. |

---

## Passo 1 — Criar a VM Ubuntu no Hyper-V

- **Geração 2**, 4 GB+ de RAM, disco 40 GB, conectada a um **Virtual Switch Externo**.
- Em *Configurações → Segurança → Modelo*, use **"Autoridade de Certificação UEFI da Microsoft"**
  (senão a Geração 2 não dá boot no Ubuntu).
- Instale o Ubuntu escolhendo **"Use an entire disk"** (é o disco virtual, vazio).
- Após instalar, **remova a ISO** do drive de DVD (Configurações → DVD → "Nenhum") para não
  dar boot pela mídia de instalação de novo.
- Descubra o IP: `ip -4 addr show | grep inet` → aqui usamos **`192.168.0.145`**.

## Passo 2 — SSH e Docker na VM

```bash
sudo apt update && sudo apt install -y openssh-server
sudo systemctl enable --now ssh

curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```
Saia e reentre no SSH (pra valer o grupo `docker`) e teste: `docker run --rm hello-world`.

## Passo 3 — Exportar o banco da INTRANET (na SUA máquina)

O banco da intranet usa o database **`postgres`**, schema **`blue_intranet`**:
```bash
pg_dump -h localhost -U postgres -d postgres -n blue_intranet -Fc -f intranet_dump.dump
```
> ⚠️ A versão do Postgres do container (**18**) precisa ser **igual ou maior** que a do seu
> banco local, senão o `pg_restore` falha com "unsupported version in file header".

## Passo 4 — Configurar variáveis (na SUA máquina)

Copie o template e ajuste (o `.env` da raiz é usado pelo docker-compose):
```bash
cp .env.deploy.example .env
```
Preencha no `.env` da raiz:
- `DB_USER`, `DB_PASSWORD`, `DB_NAME` → **iguais** aos de `back-end/.env` (aqui: `postgres` / senha / `postgres`).
- `SERVER_URL`, `VITE_API_BASE_URL`, `VITE_GOOGLE_REDIRECT_URI` → **`https://192.168.0.145.sslip.io`**
  (hostname `sslip.io` resolve automaticamente pro IP — necessário pro login Google, que não
  aceita IP puro nem HTTP).
- Demais `VITE_*` conforme o `front-end/.env`.

> Os segredos do back-end (`JWT_SECRET`, `*_ENCRYPTION_KEY`, `CONSULTA_DB_*`, `SLACK_*`)
> permanecem em `back-end/.env`. O compose lê esse arquivo via `env_file` e sobrescreve
> `DB_HOST`, `GOOGLE_REDIRECT_URI` e `FRONTEND_URL` automaticamente.

## Passo 5 — Enviar tudo para a VM (na SUA máquina)

```bash
rsync -az --exclude node_modules --exclude .git --exclude dist \
  ./ blueintranet@192.168.0.145:~/blue-intranet/
scp intranet_dump.dump blueintranet@192.168.0.145:~/blue-intranet/
```
> Confira que `back-end/.env`, `front-end/.env` e o `.env` da raiz chegaram na VM
> (são ignorados pelo git, mas o rsync os copia).

## Passo 6 — Gerar o certificado HTTPS (na VM)

Certificado autoassinado para o hostname `sslip.io`:
```bash
cd ~/blue-intranet
mkdir -p certs
openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
  -keyout certs/server.key -out certs/server.crt \
  -subj "/CN=192.168.0.145.sslip.io" \
  -addext "subjectAltName=DNS:192.168.0.145.sslip.io"
```

## Passo 7 — Subir os containers (na VM)

```bash
cd ~/blue-intranet
docker compose up -d --build
docker compose ps      # os 3 serviços devem ficar Up; o db, "healthy"
```

## Passo 8 — Restaurar o banco (na VM)

```bash
docker compose cp intranet_dump.dump db:/tmp/dump.dump
docker compose exec db pg_restore -U postgres -d postgres /tmp/dump.dump
docker compose restart backend
```
Confira: `docker compose exec db psql -U postgres -d postgres -c "\dt blue_intranet.*"`

## Passo 9 — Google OAuth

No [Google Cloud Console → Credenciais](https://console.cloud.google.com/apis/credentials),
no OAuth Client (Web), adicione **`https://192.168.0.145.sslip.io`** em:
- **Authorized JavaScript origins**
- **Authorized redirect URIs**

## Passo 10 — Testar

Acesse **https://192.168.0.145.sslip.io** → aceite o aviso do certificado autoassinado
(*Avançado → Prosseguir*, uma vez) → faça login com Google.

---

## Depois do deploy

- **Atualizar a aplicação:** use `./deploy.sh` na sua máquina — veja [ATUALIZAR.md](ATUALIZAR.md).
- **Persistência:** banco no volume `pgdata`, uploads em `back-end/uploads/` — ambos sobrevivem
  a `docker compose down` (mas **nunca** use `down -v`, que apaga o volume do banco).
- **Backup do banco:**
  ```bash
  docker compose exec db pg_dump -U postgres -Fc postgres > backup_$(date +%F).dump
  ```

## Notas

- **Certificado autoassinado** gera aviso no navegador. Para remover, emita um cert real
  (Let's Encrypt via desafio DNS) quando houver acesso ao DNS do domínio, ou distribua o
  cert/CA interno nas máquinas.
- **Chat em tempo real (socket.io):** o `socket.io-client` já está nas dependências do front,
  mas o servidor ainda não instancia o `socket.io` no `server.ts` — quando ativarem, o Nginx
  já está preparado (proxy `/socket.io/`).
