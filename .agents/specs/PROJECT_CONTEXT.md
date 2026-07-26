# Contexto do produto

Evoque Cobranças é uma aplicação interna para faturamento corporativo. Ela
consulta dados atuais no Evo através do backend e cria cobranças somente pelo
Asaas, sempre após fluxo de revisão e aprovação.

## O que o client faz

- consulta colaboradores e empresas expostos pela API;
- permite visualizar/agendar empresas para os dias `02`, `18`, `20` e `25`;
- prepara prévias e lotes de cobrança;
- apresenta resultado e falhas por item;
- mostra o estado das integrações e o ambiente selecionado.

## O que o client não faz

- não chama APIs Evo ou Asaas diretamente;
- não contém tokens, credenciais ou connection strings;
- não deduz empresa pagadora por nome;
- não envia e-mails: o Asaas notifica o cliente cadastrado.

O repositório `evoque-billing-api` é dono das regras financeiras, banco,
infraestrutura de produção e gateway das integrações.

