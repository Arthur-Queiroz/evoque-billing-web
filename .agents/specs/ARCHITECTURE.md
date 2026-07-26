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

`src/lib/api.ts` deve converter falhas HTTP em mensagens legíveis. Nunca exiba
o corpo HTML de um 404/500 como conteúdo da tela.

## Direção de interface

Use o design aprovado como referência visual, sem importar funcionalidades que
não pertencem ao MVP. A sidebar contém somente: Visão geral, Colaboradores,
Empresas, Cobranças e Integrações.

Priorize dados reais, estados vazios úteis, carregamento e falhas explícitas.

