# Regras de negócio visíveis no client

## Ambientes

- **Sandbox** é o ambiente ativo para validação e pode criar boletos de teste.
- **Produção** só é habilitada pela resposta da API; o seletor não pode burlar
  as regras do backend.
- Nunca rotule uma cobrança Sandbox como cobrança real ou definitiva.

## Faturamento por empresa e por ciclo

O usuário pode preparar cobrança para uma empresa específica ou para todas as
empresas com agenda ativa no dia escolhido. Os únicos dias recorrentes aceitos
são `02`, `18`, `20` e `25`.

O fluxo mostrado deve respeitar:

```text
prévia → aprovação → confirmação CONFIRMAR → execução → resultado
```

Não oferecer ação de emissão se a API não retornar uma prévia aprovada. Mostre
erros reais da API sem renderizar HTML bruto, respostas técnicas extensas ou
dados fictícios.

