# Pipeline do client

O workflow `deploy.yml` é acionado por `main` ou manualmente e só executa quando
`DEPLOY_ENABLED=true`.

Ele publica a imagem web no GHCR. Se `/opt/evoque/current` já contém a stack,
conecta pela chave de deploy e Cloudflare Access, autentica o Docker com o
token efêmero do workflow, faz pull da imagem e atualiza somente o serviço
`web`. Antes da primeira release da API, ele termina após publicar a imagem
para que a API possa subir a stack completa.
