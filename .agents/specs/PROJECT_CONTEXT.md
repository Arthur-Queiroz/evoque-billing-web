# Contexto do produto

Evoque Cobranças é uma aplicação interna para faturamento corporativo. Ela
consulta dados atuais no Evo através do backend e cria cobranças somente pelo
Asaas, sempre após fluxo de revisão e aprovação.

## Limitação confirmada da API EVO

Os endpoints públicos de recebíveis e vendas possuem os campos necessários
para relacionar uma venda a uma parceria corporativa, mas os registros reais
testados da Evoque retornaram esses campos vazios. Os dados também não
reproduziram o fechamento corporativo conhecido das funcionárias.

Por isso a tela `Empresas` não deriva empresas de vendas corporativas do EVO.
Ela consome `GET /api/companies`, o catálogo interno mantido pelo backend e
identificado por CNPJ. Nunca voltar a depender de `GET /api/evo/companies` ou
da descoberta por parcerias para listar empresas.

A planilha de fechamento validada continua sendo a fonte da prévia financeira.
A importação não emite boleto.

## O que o client faz

- consulta o CRM persistente de colaboradores corporativos exposto pela API;
- lista, busca e filtra o catálogo interno de empresas;
- cadastra empresas individualmente pelo CNPJ e permite inclusão opcional em
  lote pela exportação do CRM 2.0;
- cadastra, edita, inativa e reativa empresas, e pede atualização cadastral;
- importa uma planilha de fechamento do Portal EVO;
- mostra empresa, CNPJ, pessoas, avisos e total antes de persistir a prévia;
- permite agendar empresas para os dias `02`, `18`, `20` e `25`;
- prepara prévias e lotes de cobrança;
- apresenta resultado e falhas por item;
- mostra o estado das integrações e a última inclusão em lote.

A exportação completa do CRM 2.0 **não cadastra empresa**. Ela compara o
snapshot de colaboradores pelo `IdCliente` e os vincula a empresas já
cadastradas; um CNPJ fora do catálogo aparece como pendência. A base preserva
quem saiu como inativo e não move uma pessoa automaticamente entre CNPJs.

A coluna `Profissão` do EVO traz o empregador do aluno, não a empresa pagadora.
Tratá-la como empresa cadastrou sindicatos, igrejas e planos internos como
clientes. Nunca reintroduzir descoberta de empresa a partir da planilha.

## O que o client não faz

- não chama APIs Evo, Asaas ou BrasilAPI diretamente;
- não contém tokens, credenciais ou connection strings;
- não deduz empresa pagadora por nome;
- não oferece exclusão de empresa: a ação é inativar;
- não envia e-mails: o Asaas notifica o cliente cadastrado.

O repositório `evoque-billing-api` é dono das regras financeiras, banco,
infraestrutura de produção e gateway das integrações.
