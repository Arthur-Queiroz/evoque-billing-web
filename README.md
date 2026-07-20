# Client web — Evoque Cobranças

Interface interna em Next.js e Tailwind para os fluxos de consulta no Evo,
configuração de ciclos e criação de lotes no Asaas.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

`NEXT_PUBLIC_API_BASE_URL` aponta para a API ASP.NET Core. Em produção, deixe
vazio para usar o proxy reverso em `/api`.
