# Evoque Billing Web

Leia antes de alterar o client:

1. `.agents/specs/PROJECT_CONTEXT.md`
2. `.agents/specs/BUSINESS_RULES.md`
3. `.agents/specs/ARCHITECTURE.md`
4. `.agents/specs/DEPLOYMENT.md` para imagens, Actions ou ambiente.

## Stack e integração

- Use Next.js, TypeScript e Tailwind CSS.
- O client consome apenas a API Evoque pelo mesmo host em produção (`/api`) ou
  por `NEXT_PUBLIC_API_BASE_URL` no desenvolvimento.
- Não acessar Evo, Asaas, MySQL ou segredos diretamente pelo browser.
- Não inventar empresas, colaboradores, valores, status ou cobranças em telas
  operacionais. Estados vazios e erros devem ser explícitos e compreensíveis.

## Produto financeiro

- Exiba Sandbox e Produção como ambientes distintos; Produção só pode estar
  disponível quando a API informar que ela é configurada e autorizada.
- Nunca tratar clique visual como autorização de cobrança: respeite prévia,
  aprovação e confirmação `CONFIRMAR` expostas pela API.
- As telas necessárias são visão geral, colaboradores, empresas/agendas,
  cobranças e integrações. Não adicione módulos como auditoria, competências ou
  configurações sem requisito aprovado.

## Verificação

Execute `npm run build` após alterações. Para publicar, use a skill local
`deploy-cicd`; o deploy ocorre pelo GitHub Actions, não por SSH manual.

