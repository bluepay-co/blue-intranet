# ─────────────────────────────────────────────────────────────
#  Blue Intranet — comandos de desenvolvimento
#
#  make dev      → roda local (localhost)
#  make network  → roda com túnel público (compartilhar na rede)
#                  A URL do frontend aparece no terminal.
#                  Adicione ela no Google Console (redirect + origin).
# ─────────────────────────────────────────────────────────────

.PHONY: dev network

TUNNEL_FRONT = bluepay-intranet-lucas-dev

# ── Desenvolvimento local ────────────────────────────────────
dev:
	@echo ""
	@echo "  Iniciando em modo local..."
	@echo "  Frontend : http://localhost:5173"
	@echo "  Backend  : http://localhost:5000"
	@echo ""
	@trap 'kill 0' SIGINT; \
	(cd back-end  && npm run dev) & \
	(cd front-end && npm run dev) & \
	wait

# ── Modo rede com túnel público ──────────────────────────────
# O Vite faz proxy de /api → localhost:5000, portanto apenas
# um túnel (frontend) é necessário. A URL aparece no terminal.
network:
	@echo ""
	@echo "  ╔══════════════════════════════════════════════════════════╗"
	@echo "  ║             MODO REDE — Blue Intranet                    ║"
	@echo "  ╠══════════════════════════════════════════════════════════╣"
	@echo "  ║  A URL do túnel aparecerá abaixo em alguns segundos...   ║"
	@echo "  ║  Copie e adicione no Google Console:                     ║"
	@echo "  ║    → Authorized JavaScript origins                       ║"
	@echo "  ║    → Authorized redirect URIs                            ║"
	@echo "  ╚══════════════════════════════════════════════════════════╝"
	@echo ""
	@trap 'kill 0' SIGINT; \
	(cd back-end && npm run dev) & \
	(cd front-end && npm run dev) & \
	sleep 5 && \
	npx localtunnel --port 5173 --subdomain $(TUNNEL_FRONT) & \
	wait
