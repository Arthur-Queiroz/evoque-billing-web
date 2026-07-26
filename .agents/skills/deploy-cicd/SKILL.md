---
name: deploy-cicd
description: Publicar ou diagnosticar o CI/CD do client Evoque na KVM2 via GitHub Actions, GHCR e Cloudflare Access. Use ao alterar workflow, Dockerfile, imagem Next.js, variáveis de deploy ou falhas de Actions; nunca para orientar publicação manual por SSH.
---

# Deploy CI/CD do client

1. Leia `references/pipeline.md` e `.agents/specs/DEPLOYMENT.md` antes de
   alterar o deploy.
2. Publique exclusivamente pelo GitHub Actions. Não execute Git, Docker ou
   restart manual na VPS como forma de publicar o client.
3. Mantenha `NEXT_PUBLIC_API_BASE_URL` vazio na imagem de produção para usar
   `/api` no mesmo domínio.
4. Nunca coloque tokens Evo/Asaas ou credenciais da VPS em variáveis `NEXT_*`,
   Dockerfile, código do browser ou logs.
5. Execute `npm run build` antes de alterar o pipeline.

