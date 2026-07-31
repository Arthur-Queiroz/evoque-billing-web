# Regras de negócio visíveis no client

## Ambientes

- **Sandbox** é o ambiente ativo para validação e pode criar boletos de teste.
- **Produção** só é habilitada pela resposta da API; o seletor não pode burlar
  as regras do backend.
- Nunca rotule uma cobrança Sandbox como cobrança real ou definitiva.

## Faturamento por empresa e por ciclo

O usuário pode preparar cobrança para uma empresa específica ou para todas as
empresas cujo período **fecha** no dia escolhido. Os únicos dias de fechamento
aceitos são `02`, `18`, `20` e `25`.

Fechamento e vencimento são campos distintos na tela e não podem voltar a ser
o mesmo. O dia escolhido nos cards seleciona o ciclo; o vencimento do boleto é
uma data à parte, normalmente no mês seguinte, sugerida em fechamento + 10 dias
e editável pelo operador. Nenhum vencimento real cai em 02, 18, 20 ou 25.

O fluxo mostrado deve respeitar:

```text
prévia → aprovação → confirmação CONFIRMAR → execução → resultado
```

Não oferecer ação de emissão se a API não retornar uma prévia aprovada. Mostre
erros reais da API sem renderizar HTML bruto, respostas técnicas extensas ou
dados fictícios.

## Catálogo de empresas

A tela `Empresas` mostra o catálogo interno vindo de `GET /api/companies`, com
busca textual e os filtros: todas, ativas, inativas, sem dia e sem Asaas.

A tabela apresenta empresa, CNPJ, pessoas, dia, Asaas, origem e situação.

Regras visíveis:

- o fluxo principal é `Adicionar empresa`, informando o CNPJ. O estado vazio
  não exige uma planilha;
- nome operacional e dia são opcionais no cadastro; o backend consulta os dados
  públicos pelo CNPJ;
- nenhuma empresa fictícia é inserida para preencher a tela;
- a ação principal nunca é `Excluir`. Uma empresa que sai do corporativo é
  inativada e pode ser reativada;
- o identificador do cliente Asaas não é editável. O portal solicita ao backend
  a resolução automática pelo CNPJ;
- no Sandbox, o backend pode criar um cliente espelho de teste com e-mail
  controlado; em Produção, a resolução é somente leitura e nunca cria cliente.

## Inclusão em lote pelo EVO

- A exportação completa do CRM 2.0 é lida primeiro em modo de conferência.
- O preview separa empresas novas das já cadastradas e compara colaboradores
  pelo `IdCliente`.
- A tela explica que valores financeiros não são usados nessa importação.
- A inclusão exige confirmação explícita de que o arquivo contém todos os
  clientes ativos. Arquivo parcial não pode ser aplicado.
- **Nenhuma empresa é cadastrada por esta importação.** Ela apenas vincula
  colaboradores a empresas já existentes; CNPJ fora do catálogo é listado como
  pendência para alguém decidir se é cliente.
- Colaboradores novos são incluídos; presentes permanecem ativos; ausentes são
  inativados; quem reaparece na mesma empresa é reativado.
- Se o mesmo `IdCliente` aparecer em outro CNPJ, mostrar conflito e bloquear a
  aplicação. Não oferecer mudança automática de empresa.
- O resultado informa empresas adicionadas e colaboradores novos, mantidos,
  inativados, reativados e em conflito.
- A lista é atualizada sem recarregar a aplicação.

## CRM de colaboradores

- A tela `Colaboradores` usa `GET /api/corporate-members`, não a lista bruta de
  membros do EVO.
- Exibir uma pessoa por `IdCliente`, com empresa, contratos, situação e última
  confirmação.
- Colaborador inativo permanece pesquisável para preservar histórico.

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
