# Setor de Gerentes — Catálogo de Funcionalidades

> Documento de backlog/ideias para o futuro cargo de **Gerente** na intranet.
> Os gerentes são o elo de análise: em vez de terem metas próprias, enxergam e
> acompanham as métricas de todos os funcionários **do seu escopo**, apontando
> onde o time está acertando ou errando.
>
> **Tipos de gerente previstos:**
> - **Gerente Comercial** → Inside Sales (`INSIGHT_SALES`) + KAM (`KAM`) + `VENDAS`
> - **Gerente Pré-Vendas** → Pré-Vendas (`PRE_VENDAS`)
>
> Decisões já tomadas: dois papéis distintos (`GERENTE_COMERCIAL`,
> `GERENTE_PREVENDAS`); fase inicial só de visualização; metas seguem no arquivo
> estático `back-end/data/metas2026.ts` por ora.
>
> Status: catálogo. Implementaremos **por partes**, sem sobrecarga.

---

## A. Visão e navegação de pessoas

1. **Painel de ranking do escopo** — lista todos os funcionários (IS+KAM ou
   Pré-Vendas), com meta, realizado, % e delta, mais KPIs agregados no topo.
   *Escopo:* reusa `RankingTabela` + KPIs agregados. Base de tudo.
2. **Drill-down individual** — clicar num funcionário abre a visão completa dele
   (meta vs realizado, top clientes, YoY). *Escopo:* endpoint seguro por vendedor
   + reuso do layout `DashboardPessoal`.
3. **Perfil 360° do funcionário** — página única com métricas + carteira de
   clientes + atividades/agenda + histórico de desempenho. *Escopo:* agrega dados
   de vários módulos existentes (métricas, carteira, agenda).

## B. Análise de performance

4. **Radar de risco por vendedor** — sinaliza automaticamente quem está abaixo da
   meta, com queda vs mês anterior ou sem atividade. Semáforo verde/amarelo/vermelho.
   *Escopo:* regra de classificação sobre dados já retornados; reusar padrão
   "Radar de Risco" existente.
5. **Comparativo lado a lado** — selecionar 2+ funcionários e comparar métricas em
   colunas/gráfico. *Escopo:* front + reuso do endpoint de drill-down.
6. **Tendência e projeção (forecast)** — projeção de fechamento do mês por
   funcionário e da equipe (ritmo atual vs meta). *Escopo:* cálculo de pace no
   service; médio esforço.
7. **Metas vs realizado por período** — filtro mês/trimestre/ano e evolução
   histórica por funcionário e agregada. *Escopo:* parâmetros já suportados por
   `buscarMetricasCompletas`.

## C. Carteira e clientes (contexto de negócio)

8. **Visão de carteira por vendedor** — quantos clientes, TPV, concentração,
   clientes inativos/em churn. *Escopo:* módulo de carteira já existe; expor no
   contexto do gerente.
9. **Cross-sell e oportunidades** — potencial de venda adicional por
   funcionário/cliente. *Escopo:* já há base de "Cross-sell por vendedor";
   reusar/consolidar.
10. **Alerta de clientes em risco** — clientes de alto valor com queda de receita,
    por funcionário. *Escopo:* regra sobre dados de tickets/clientes.

## D. Acompanhamento e gestão do time (edição — fase mais adiante)

11. **Edição de metas** individuais e de equipe (migrar metas p/ banco, com
    auditoria de quem alterou). *Escopo:* nova tabela `metas` + CRUD. Maior
    esforço; base para tudo que é "manusear".
12. **Anotações/1:1 por funcionário** — registrar observações, planos de ação e
    acompanhamento. *Escopo:* nova tabela simples + tela.
13. **Distribuição/realocação de carteira** — mover clientes entre vendedores.
    *Escopo:* sensível, mexe em `manager_id`; exige auditoria. Alto risco.
14. **Aprovações** — o gerente aprova ajustes, exceções, descontos etc.
    *Escopo:* depende de haver fluxo a aprovar; futuro.

## E. Consolidação executiva

15. **Dashboard consolidado do escopo** — números da equipe inteira num relance
    (receita total, % meta agregada, top e bottom performers). *Escopo:* reusa
    `buscarMetricasEquipe`.
16. **Relatórios exportáveis** (CSV/PDF) do ranking e do detalhe. *Escopo:*
    geração no front ou back; baixo/médio.
17. **Relatório periódico automático** — resumo semanal/mensal do time enviado por
    e-mail/notificação. *Escopo:* usa infra de WebSocket/agenda; futuro.

## F. Produtividade / atividade

18. **Métricas de atividade** — reuniões, tarefas, agenda por funcionário
    (especialmente relevante para o Gerente de Pré-Vendas, medido em reuniões).
    *Escopo:* módulos `prevendas`/`agenda`/`tarefas` já existem.
19. **Funil / conversão** — para Pré-Vendas: reuniões marcadas → realizadas →
    convertidas, por SDR. *Escopo:* dados `pv_*` já existem.

## G. Transversais (infra que habilita o resto)

20. **RBAC dos papéis de gerente** (`GERENTE_COMERCIAL`, `GERENTE_PREVENDAS`) com
    escopo seguro no back-end. *Escopo:* pré-requisito de quase tudo — enum,
    migration do CHECK, middleware, navegação. **Segurança:** validar sempre no
    back-end que o vendedor-alvo pertence ao escopo do gerente.
21. **Componentes de métricas compartilhados** — extrair
    `KpiCard`/`DeltaTag`/`RankingTabela` para `components/metricas/`. *Escopo:*
    refactor leve que evita duplicação nas novas telas.

---

## Ordem sugerida (para não sobrecarregar)

**#20 (RBAC/base) → #1 (painel) → #2 (drill-down) → #4 (radar de risco)** — já
entrega valor real de "ver quem acerta/erra". Itens de edição (#11–14) por último,
pois exigem migrar metas para o banco.
