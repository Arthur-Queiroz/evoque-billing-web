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

## Catálogo de empresas

A tela `Empresas` mostra o catálogo interno vindo de `GET /api/companies`, com
busca textual e os filtros: todas, ativas, inativas, sem dia, sem Asaas e não
vistas na última importação.

A tabela apresenta empresa, CNPJ, pessoas, dia, Asaas, origem e situação.

Regras visíveis:

- o estado vazio oferece `Importar catálogo do EVO` ou `Nova empresa`; ele não
  afirma que o endpoint Partnership resolverá o problema;
- nenhuma empresa fictícia é inserida para preencher a tela;
- a ação principal nunca é `Excluir`. Uma empresa que sai do corporativo é
  inativada e pode ser reativada;
- configurar um cliente Asaas no catálogo não cria cliente nem cobrança.

## Importação do catálogo do EVO

- A exportação completa do CRM 2.0 é lida primeiro em modo de conferência.
- O preview mostra quantidade de empresas, pessoas, CNPJs inválidos, conflitos
  de nome e avisos.
- A tela explica que valores financeiros não são usados nessa importação.
- A sincronização exige confirmação explícita do operador.
- O resultado informa quantas empresas foram criadas, atualizadas, tiveram o
  nome operacional preservado e quantas não foram vistas.
- A lista é atualizada sem recarregar a aplicação.

## Importação do fechamento

- A planilha XLSX deve ser lida primeiro em modo de conferência.
- Conferir quantidade de empresas, pessoas, duplicidades, avisos e valor total.
- No primeiro MVP, importar uma empresa por planilha para que o cliente Asaas
  seja associado sem ambiguidade.
- A criação de uma prévia a partir da planilha não aprova a prévia e não cria
  cobrança.
- O cliente Asaas criado pelo portal nesta etapa é sempre Sandbox e utiliza um
  e-mail controlado informado pelo operador.
- Linhas duplicadas não podem ser somadas duas vezes.
