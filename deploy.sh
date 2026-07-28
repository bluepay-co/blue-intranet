#!/usr/bin/env bash
# ============================================================================
#  deploy.sh — Atualiza a Intranet Blue na VM servidora (roda na SUA máquina)
#
#  O que faz:
#    1. Envia o código atual pra VM (rsync, sem node_modules/.git/dist)
#    2. Rebuilda só o que mudou e sobe (docker compose up -d --build) na VM
#    3. Mostra o status dos containers
#
#  NÃO toca no banco de dados nem nos uploads — eles ficam preservados.
#
#  Uso:
#    ./deploy.sh
#
#  Primeira vez (dar permissão de execução):
#    chmod +x deploy.sh
# ============================================================================

set -euo pipefail

# --- Configuração (ajuste aqui se o IP/usuário da VM mudar) ---
VM_USER="blueintranet"
VM_HOST="192.168.0.145"
REMOTE_DIR="~/blue-intranet"

# Diretório do projeto = onde este script está
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Cores pra facilitar a leitura
BOLD="\033[1m"; GREEN="\033[0;32m"; YELLOW="\033[0;33m"; RESET="\033[0m"

echo -e "${BOLD}==> 1/3 Enviando código para a VM (${VM_USER}@${VM_HOST})...${RESET}"
rsync -az --info=progress2 \
  --exclude node_modules \
  --exclude .git \
  --exclude dist \
  "${LOCAL_DIR}/" "${VM_USER}@${VM_HOST}:${REMOTE_DIR}/"

echo -e "${BOLD}==> 2/3 Rebuildando e subindo na VM...${RESET}"
echo -e "${YELLOW}    (só o que mudou é reconstruído; o banco não é tocado)${RESET}"
ssh -t "${VM_USER}@${VM_HOST}" "cd ${REMOTE_DIR} && docker compose up -d --build"

echo -e "${BOLD}==> 3/3 Status dos containers:${RESET}"
ssh "${VM_USER}@${VM_HOST}" "cd ${REMOTE_DIR} && docker compose ps"

echo -e "${GREEN}${BOLD}✔ Deploy concluído!${RESET} Acesse: ${BOLD}https://bluepay-intranet.com.br${RESET}"
echo -e "${YELLOW}Se mudou algo no banco, rode a migration manualmente (ver ATUALIZAR.md).${RESET}"
