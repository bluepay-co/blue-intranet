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

Acesso: **https://bluepay-intranet.com.br**

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
- `SERVER_URL`, `VITE_API_BASE_URL`, `VITE_GOOGLE_REDIRECT_URI` → **`https://bluepay-intranet.com.br`**
  (domínio próprio, registrado no Registro.br — necessário pro login Google, que não aceita
  IP puro nem HTTP).
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

## Passo 6 — Apontar o domínio e gerar o certificado HTTPS

**6a. DNS (no painel do Registro.br)**

Crie um registro **A** apontando o domínio pro IP da VM na rede interna:
```
bluepay-intranet.com.br.   A   192.168.0.145
```
> O domínio resolve publicamente para um IP privado — isso é normal e intencional: só quem
> está na VPN consegue de fato alcançar `192.168.0.145`. Quem não está na VPN resolve o nome
> mas não consegue conectar.

**6b. Certificado Let's Encrypt via desafio DNS (na VM)**

Como a VM só é alcançável via VPN (não dá pra usar o desafio HTTP-01, que exige a porta 80
acessível publicamente), o certificado é emitido com desafio **DNS-01 manual**:
```bash
sudo apt install -y certbot
sudo certbot certonly --manual --preferred-challenges dns \
  -d bluepay-intranet.com.br \
  --agree-tos -m SEU_EMAIL@bluepaysolutions.com.br
```
O certbot vai mostrar um valor e pedir pra criar um registro **TXT** no Registro.br:
```
_acme-challenge.bluepay-intranet.com.br.   TXT   "valor-mostrado-pelo-certbot"
```
Crie o TXT no painel do Registro.br, espere a propagação (confira com
`dig TXT _acme-challenge.bluepay-intranet.com.br +short`) e só então confirme no certbot
apertando Enter.

**6c. Copiar o certificado para a pasta que o Nginx usa**
```bash
cd ~/blue-intranet
mkdir -p certs
sudo cp /etc/letsencrypt/live/bluepay-intranet.com.br/fullchain.pem certs/server.crt
sudo cp /etc/letsencrypt/live/bluepay-intranet.com.br/privkey.pem   certs/server.key
sudo chown $USER:$USER certs/server.crt certs/server.key
```
> ⚠️ **Renovação:** certificados Let's Encrypt expiram em 90 dias. Como o desafio é manual
> (DNS-01), a renovação (`sudo certbot renew`) vai pedir um **novo TXT** no Registro.br a cada
> vez — repita o passo 6b/6c. Se isso incomodar, dá pra automatizar depois com a API do
> Registro.br + um hook do certbot.

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
no OAuth Client (Web), adicione **`https://bluepay-intranet.com.br`** em:
- **Authorized JavaScript origins**
- **Authorized redirect URIs**

> Se o cliente OAuth ainda tiver a URL antiga (`https://192.168.0.145.sslip.io`) cadastrada,
> pode remover depois de confirmar que o novo domínio está funcionando.

## Passo 10 — Testar

Acesse **https://bluepay-intranet.com.br** → como o certificado agora é Let's Encrypt (confiável),
não deve aparecer mais aviso de segurança → faça login com Google.

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

- **Certificado Let's Encrypt (DNS-01 manual)** expira em 90 dias e a renovação exige recriar
  o TXT no Registro.br (ver Passo 6). Se ficar repetitivo, considerar automatizar via API do
  Registro.br.
- **Chat em tempo real (socket.io):** o `socket.io-client` já está nas dependências do front,
  mas o servidor ainda não instancia o `socket.io` no `server.ts` — quando ativarem, o Nginx
  já está preparado (proxy `/socket.io/`).
