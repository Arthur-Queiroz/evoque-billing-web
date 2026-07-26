# Deploy e CI/CD do client

O client é publicado exclusivamente pelo GitHub Actions em
`.github/workflows/deploy.yml`.

1. O workflow compila a imagem Next.js.
2. Publica `ghcr.io/arthur-queiroz/evoque-billing-web` com as tags `main` e SHA.
3. A VPS é acessada pelo Cloudflare Access usando a chave de deploy do Actions.
4. Se a stack já existe, somente o serviço `web` é atualizado pelo Compose.
5. No primeiro deploy, a imagem web é publicada; a execução do pipeline da API
   instala a stack completa.

O workflow depende de `KVM2_DEPLOY_SSH_PRIVATE_KEY`, `DEPLOY_ENABLED`,
`KVM2_DEPLOY_HOST` e `KVM2_CLOUDFLARE_SSH_HOST`. Não use SSH manual para
publicar código ou reiniciar containers.

