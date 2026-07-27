# Arquitetura do client

## Stack

- Next.js com App Router;
- TypeScript;
- Tailwind CSS;
- componentes de ícone Lucide;
- cliente HTTP tipado em `src/lib/api.ts`.

## Comunicação

```text
Browser → Next.js → /api pelo Nginx → API ASP.NET Core
```

Em desenvolvimento, `NEXT_PUBLIC_API_BASE_URL` pode apontar para a API local.
Em produção a variável fica vazia e o browser usa o mesmo domínio, evitando
CORS desnecessário e impedindo exposição de serviços internos.

O Route Handler `src/app/api/[...path]/route.ts` encaminha as chamadas para a
API local em desenvolvimento. O limite do proxy é 30 MB para comportar os
metadados de uma planilha, enquanto o backend mantém o limite de arquivo em
25 MB. Em produção, o Nginx continua encaminhando `/api` diretamente ao
backend.

`src/lib/api.ts` deve converter falhas HTTP em mensagens legíveis. Nunca exiba
o corpo HTML de um 404/500 como conteúdo da tela.

## Direção de interface

Use o design aprovado como referência visual, sem importar funcionalidades que
não pertencem ao MVP. A sidebar contém somente: Visão geral, Colaboradores,
Empresas, Cobranças e Integrações.

As telas de empresa são `CompaniesPage` (lista), `CompanyDetailPage`
(detalhe/edição), `CompanyFormPage` (cadastro manual) e
`CompanyCatalogImportPage` (sincronização). Elas consomem exclusivamente
`/api/companies` e `/api/company-catalog-imports`. Os componentes antigos que
derivavam empresas de vendas corporativas do EVO foram removidos; não
reintroduzir uma lista de empresas calculada no browser.

Priorize dados reais, estados vazios úteis, carregamento e falhas explícitas.
