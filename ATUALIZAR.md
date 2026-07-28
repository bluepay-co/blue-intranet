# 🔄 Como atualizar a Intranet (guia rápido)

> Para quando você fizer mudanças no código e quiser subir pra VM servidora.
> **O banco de dados e os uploads NUNCA são apagados nesse processo.**

---

## ✅ O jeito fácil: um comando só

Na **sua máquina**, dentro da pasta do projeto:

```bash
./deploy.sh
```

Isso faz tudo sozinho:
1. Envia seu código pra VM
2. Rebuilda **só o que mudou** e reinicia (o banco fica intocado)
3. Mostra o status no final

Vai pedir a **senha da VM** (`blueintranet`) 1 ou 2 vezes durante o processo. No fim, acesse:
**https://bluepay-intranet.com.br**

> **Primeira vez apenas:** se der erro de permissão, rode uma vez:
> ```bash
> chmod +x deploy.sh
> ```

---

## 🐢 O jeito manual (se preferir ou o script falhar)

**1. Na sua máquina** — envia o código:
```bash
cd "/home/lucas-silva/Área de trabalho/blue-intranet"
rsync -az --exclude node_modules --exclude .git --exclude dist \
  ./ blueintranet@192.168.0.145:~/blue-intranet/
```

**2. Na VM** (via `ssh blueintranet@192.168.0.145`) — rebuilda e sobe:
```bash
cd ~/blue-intranet
docker compose up -d --build
docker compose ps
```

---

## 🗄️ Se a atualização mexeu no BANCO (nova tabela/coluna)

Só nesse caso, depois de subir, rode a migration **uma vez** na VM:
```bash
cd ~/blue-intranet
docker compose exec -T db psql -U postgres -d postgres < back-end/database/migrations/NOME_DA_MIGRATION.sql
```
(Isso só adiciona/altera — não apaga os dados existentes.)

---

## 🆘 Coisas úteis

**Ver logs se algo der errado:**
```bash
docker compose logs --tail 50 backend
docker compose logs --tail 50 frontend
```

**Reiniciar um serviço sem rebuildar:**
```bash
docker compose restart backend
```

**Fazer backup do banco (recomendado antes de updates grandes):**
```bash
docker compose exec db pg_dump -U postgres -Fc postgres > backup_$(date +%F).dump
```

---

## ⛔ NUNCA faça isso numa atualização

```bash
docker compose down -v   # ❌ o -v APAGA o banco de dados!
```
O `-v` só foi usado **uma vez**, na configuração inicial. Para parar tudo sem perder dados,
use `docker compose down` (sem o `-v`) — mas normalmente nem precisa: o `up -d --build` já
recria o necessário.
