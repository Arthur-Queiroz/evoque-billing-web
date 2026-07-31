"use client";

import {
  ArrowLeft,
  Building2,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleDollarSign,
  CreditCard,
  Database,
  FileSpreadsheet,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  UploadCloud,
  UsersRound,
  Wifi,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  api,
  AsaasEnvironment,
  BillingDraft,
  BillingPeriod,
  ChargeBatch,
  Company,
  CompanyBillingHistoryEntry,
  CompanyCatalogImportPreview,
  CompanyCatalogImportResult,
  CompanyCatalogImportSummary,
  CompanyFilters,
  CorporateMember,
  CompanySchedule,
  EvoCorporateMember,
  EvoMember,
  EvoMembership,
  IntegrationStatus,
  BillingSpreadsheetPreview,
} from "@/lib/api";

type Page =
  | "overview"
  | "members"
  | "companies"
  | "companyDetail"
  | "companyForm"
  | "companyCatalogImport"
  | "charges"
  | "spreadsheetImport"
  | "dailyBilling"
  | "integrations";

/** Filtros oferecidos na tela de empresas, na ordem em que aparecem. */
type CompanyFilterKey = "all" | "active" | "inactive" | "withoutClosingDay" | "withoutAsaas";

const companyFilterOptions: Array<{ key: CompanyFilterKey; label: string }> = [
  { key: "all", label: "Todas" },
  { key: "active", label: "Ativas" },
  { key: "inactive", label: "Inativas" },
  { key: "withoutClosingDay", label: "Sem dia" },
  { key: "withoutAsaas", label: "Sem Asaas" },
];

function toCompanyFilters(filterKey: CompanyFilterKey, search: string): CompanyFilters {
  const filters: CompanyFilters = {};
  if (search.trim()) {
    filters.search = search.trim();
  }

  if (filterKey === "active" || filterKey === "inactive") {
    filters.status = filterKey;
  } else if (filterKey === "withoutClosingDay") {
    filters.withoutClosingDay = true;
  } else if (filterKey === "withoutAsaas") {
    filters.asaasLink = "pending";
  }

  return filters;
}

/** Campos editáveis de uma empresa, compartilhados por cadastro e edição. */
interface CompanyFormValues {
  displayName: string;
  closingDay: number | null;
}

function companySourceLabel(source: Company["source"]): string {
  return source === "EvoSpreadsheet" ? "EVO" : "Manual";
}

function companyAsaasLabel(company: Company): string {
  if (company.asaasProductionCustomerId) {
    return "Produção configurado";
  }
  return company.asaasSandboxCustomerId ? "Sandbox configurado" : "Pendente";
}

function registryStatusLabel(company: Company): string {
  const labels: Record<Company["registryLookupStatus"], string> = {
    NotChecked: "Cadastro não consultado",
    Found: company.registrationStatus ?? "Cadastro encontrado",
    NotFound: "CNPJ não encontrado no cadastro público",
    Unavailable: "Cadastro público indisponível na última consulta",
  };
  return labels[company.registryLookupStatus];
}

const operatorId = "operador-web";
const closingDays = [2, 18, 20, 25];
const controlledSandboxEmail = "arthurdequeiroz2005@gmail.com";

function money(value: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
}

/// O fechamento e o vencimento são datas diferentes. No histórico do Asaas, um
/// período que fecha no dia 25 vence por volta do dia 6 do mês seguinte, então
/// dez dias depois do fechamento é um ponto de partida razoável — o operador
/// ajusta antes de gerar a prévia.
function suggestDueDate(year: number, month: number, closingDay: number): string {
  const suggestedDate = new Date(year, month - 1, closingDay + 10);
  const suggestedMonth = String(suggestedDate.getMonth() + 1).padStart(2, "0");
  const suggestedDay = String(suggestedDate.getDate()).padStart(2, "0");
  return `${suggestedDate.getFullYear()}-${suggestedMonth}-${suggestedDay}`;
}

function fileSize(sizeInBytes: number): string {
  if (sizeInBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })} MB`;
}

const dateOnlyPattern = /^(\d{4})-(\d{2})-(\d{2})$/;

// Um vencimento como "2026-08-20" é um dia de calendário, não um instante.
// new Date() o interpretaria como meia-noite UTC e o fuso do Brasil o exibiria
// como o dia anterior, mostrando 19/08 na confirmação da emissão.
function parseDateOnly(value: string): Date {
  const dateOnlyParts = dateOnlyPattern.exec(value);
  return dateOnlyParts
    ? new Date(Number(dateOnlyParts[1]), Number(dateOnlyParts[2]) - 1, Number(dateOnlyParts[3]))
    : new Date(value);
}

function date(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(parseDateOnly(value));
}

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
    .format(new Date(year, month - 1, 1))
    .replace(/^./, (letter) => letter.toUpperCase());
}

function competenceOptions(year: number, month: number): Array<{ label: string; value: string }> {
  return [-1, 0, 1, 2].map((monthOffset) => {
    const optionDate = new Date(year, month - 1 + monthOffset, 1);
    const optionYear = optionDate.getFullYear();
    const optionMonth = optionDate.getMonth() + 1;
    return {
      label: monthLabel(optionYear, optionMonth),
      value: `${optionYear}-${optionMonth}`,
    };
  });
}

function statusBadge(status: string): string {
  const normalizedStatus = status.toLowerCase();
  if (normalizedStatus.includes("completed") || normalizedStatus.includes("approved") || normalizedStatus.includes("created")) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (normalizedStatus.includes("failed") || normalizedStatus.includes("error")) {
    return "bg-red-50 text-red-700";
  }
  if (normalizedStatus.includes("await") || normalizedStatus.includes("pending") || normalizedStatus.includes("processing")) {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-slate-100 text-slate-700";
}

function readableStatus(status: string): string {
  const labels: Record<string, string> = {
    AwaitingApproval: "Aguardando aprovação",
    Approved: "Aprovado",
    Processing: "Em processamento",
    Completed: "Concluído",
    CompletedWithErrors: "Concluído com falhas",
    AwaitingReview: "Aguardando revisão",
    PendingReview: "Aguardando revisão",
    ChargeCreated: "Cobrança criada",
    Draft: "Rascunho",
  };
  return labels[status] ?? status;
}

function getDraftTotal(drafts: BillingDraft[]): number {
  return drafts.reduce((total, draft) => total + draft.totalAmount, 0);
}

export default function BillingApplication() {
  const currentDate = new Date();
  const [page, setPage] = useState<Page>("overview");
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [environment, setEnvironment] = useState<AsaasEnvironment>("Sandbox");
  const [pendingEnvironment, setPendingEnvironment] = useState<AsaasEnvironment | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  // Conjuntos de dados que a última atualização não conseguiu carregar. Um
  // número que não veio da API é exibido como "—", nunca como zero: "0 empresas"
  // é uma afirmação, e afirmar que o catálogo está vazio quando ele tem 63
  // manda o operador investigar o problema errado.
  const [unavailableDataSets, setUnavailableDataSets] = useState<ReadonlySet<string>>(new Set());
  const [members, setMembers] = useState<EvoMember[]>([]);
  const [corporateCatalogMembers, setCorporateCatalogMembers] = useState<CorporateMember[]>([]);
  const [schedules, setSchedules] = useState<CompanySchedule[]>([]);
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriod[]>([]);
  const [drafts, setDrafts] = useState<BillingDraft[]>([]);
  const [batches, setBatches] = useState<ChargeBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatingPeriod, setIsCreatingPeriod] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<CompanyFilterKey>("all");
  const [catalogCompanies, setCatalogCompanies] = useState<Company[]>([]);
  const [visibleCatalogCompanies, setVisibleCatalogCompanies] = useState<Company[]>([]);
  const [latestCatalogImport, setLatestCatalogImport] = useState<CompanyCatalogImportSummary | null>(null);
  const [selectedCompanyTaxId, setSelectedCompanyTaxId] = useState<string | null>(null);
  const [scheduleDay, setScheduleDay] = useState("20");
  const [dueDate, setDueDate] = useState("");
  const messageAreaRef = useRef<HTMLDivElement>(null);
  // Contador de mensagens exibidas. Repetir uma ação que falha do mesmo jeito
  // não muda o texto, e sem este contador a rolagem não voltaria a acontecer:
  // o operador clicaria de novo e teria a impressão de que nada respondeu.
  const [shownMessageCount, setShownMessageCount] = useState(0);
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [confirmationBatch, setConfirmationBatch] = useState<ChargeBatch | null>(null);
  const [confirmationText, setConfirmationText] = useState("");

  const selectedPeriod = useMemo(
    () => billingPeriods.find((period) => period.year === selectedYear && period.month === selectedMonth) ?? null,
    [billingPeriods, selectedMonth, selectedYear],
  );

  const selectedEnvironmentStatus = environment === "Sandbox" ? integrationStatus?.sandbox : integrationStatus?.production;
  const productionAvailable = Boolean(
    integrationStatus?.production.isConfigured
    && integrationStatus.production.readOperationsEnabled,
  );
  const activeCatalogCompanyCount = useMemo(
    () => catalogCompanies.filter((company) => company.isActive).length,
    [catalogCompanies],
  );
  const visibleCorporateCatalogMembers = useMemo(() => {
    const normalizedSearch = memberSearch.trim().toLocaleLowerCase("pt-BR");
    if (!normalizedSearch) return corporateCatalogMembers;
    return corporateCatalogMembers.filter((member) =>
      `${member.memberName} ${member.companyName} ${member.contracts.join(" ")} ${member.evoMemberId}`
        .toLocaleLowerCase("pt-BR")
        .includes(normalizedSearch),
    );
  }, [corporateCatalogMembers, memberSearch]);
  const selectedCompany = useMemo(
    () => catalogCompanies.find((company) => company.taxId === selectedCompanyTaxId) ?? null,
    [catalogCompanies, selectedCompanyTaxId],
  );

  /// Erro e sucesso nunca coexistem. Antes, um erro antigo continuava na tela
  /// depois de a ação seguinte dar certo: aprovar um lote funcionava e o
  /// operador seguia lendo a recusa da tentativa anterior, concluindo que a
  /// aprovação tinha falhado.
  function showError(message: string) {
    setNoticeMessage(null);
    setErrorMessage(message);
    setShownMessageCount((currentCount) => currentCount + 1);
  }

  function showNotice(message: string) {
    setErrorMessage(null);
    setNoticeMessage(message);
    setShownMessageCount((currentCount) => currentCount + 1);
  }

  async function refreshData(showLoading = false) {
    if (showLoading) setIsLoading(true);
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const [statusResult, schedulesResult, periodsResult, catalogImportResult] = await Promise.allSettled([
        api.getIntegrationStatus(),
        api.getCompanySchedules(),
        api.getBillingPeriods(),
        api.getLatestCompanyCatalogImport(),
      ]);

      if (statusResult.status === "fulfilled") setIntegrationStatus(statusResult.value);
      if (schedulesResult.status === "fulfilled") setSchedules(schedulesResult.value);
      if (periodsResult.status === "fulfilled") setBillingPeriods(periodsResult.value);
      if (catalogImportResult.status === "fulfilled") setLatestCatalogImport(catalogImportResult.value);

      const [catalogResult, billingResult, corporateMembersResult, membersResult] = await Promise.allSettled([
        refreshCatalogCompanies(),
        refreshBillingData(selectedYear, selectedMonth),
        api.getCorporateCatalogMembers(),
        api.getMembers(),
      ]);

      if (corporateMembersResult.status === "fulfilled") {
        setCorporateCatalogMembers(corporateMembersResult.value);
      }
      if (membersResult.status === "fulfilled") {
        setMembers(membersResult.value.members);
      }

      const requiredResultsByDataSet = {
        integrations: statusResult,
        schedules: schedulesResult,
        periods: periodsResult,
        catalog: catalogResult,
        billing: billingResult,
        corporateMembers: corporateMembersResult,
      };
      const failedDataSets = Object.entries({ ...requiredResultsByDataSet, evoMembers: membersResult })
        .filter(([, result]) => result.status === "rejected")
        .map(([dataSet]) => dataSet);
      setUnavailableDataSets(new Set(failedDataSets));

      const firstFailure = Object.values(requiredResultsByDataSet)
        .find((result) => result.status === "rejected") as PromiseRejectedResult | undefined;
      if (firstFailure) {
        showError(
          firstFailure.reason instanceof Error
            ? firstFailure.reason.message
            : "Parte dos dados não pôde ser atualizada.",
        );
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : "Não foi possível consultar a API.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  /** Recarrega a lista sem recarregar a aplicação inteira. */
  async function refreshCatalogCompanies(
    filterKey: CompanyFilterKey = companyFilter,
    search: string = companySearch,
  ) {
    const filters = toCompanyFilters(filterKey, search);
    const [allCompanies, filteredCompanies] = await Promise.all([
      api.getCatalogCompanies(),
      api.getCatalogCompanies(filters),
    ]);
    setCatalogCompanies(allCompanies);
    setVisibleCatalogCompanies(filteredCompanies);
  }

  async function applyCompanyFilters(filterKey: CompanyFilterKey, search: string) {
    setCompanyFilter(filterKey);
    setCompanySearch(search);
    try {
      await refreshCatalogCompanies(filterKey, search);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Não foi possível consultar o catálogo de empresas.");
    }
  }

  async function refreshBillingData(year: number, month: number) {
    try {
      const [draftData, batchData] = await Promise.all([api.getBillingDrafts(year, month), api.getChargeBatches(year, month)]);
      setDrafts(draftData);
      setBatches(batchData);
      setSelectedDraftIds((currentIds) => currentIds.filter((draftId) => draftData.some((draft) => draft.id === draftId)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível carregar os faturamentos da competência.";
      if (!message.includes("404") && !message.includes("não foi encontrada")) showError(message);
      setDrafts([]);
      setBatches([]);
    }
  }

  useEffect(() => {
    void refreshData(true);
    // A primeira carga deve consultar a competência atual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void refreshBillingData(selectedYear, selectedMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, selectedYear]);

  // As mensagens ficam no topo, e vários botões estão bem abaixo na rolagem.
  // Sem isto, uma ação recusada pela API parece não ter feito nada: o operador
  // clica em "Gerar prévia", a resposta chega, e ele continua olhando o botão.
  useEffect(() => {
    if (shownMessageCount === 0) {
      return;
    }

    messageAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [shownMessageCount]);

  function selectEnvironment(targetEnvironment: AsaasEnvironment) {
    if (targetEnvironment === environment) {
      return;
    }

    if (targetEnvironment === "Production" && !productionAvailable) {
      showNotice("Produção ainda não está disponível para consulta. Verifique a credencial na tela de Integrações.");
      return;
    }
    setPendingEnvironment(targetEnvironment);
  }

  function confirmEnvironmentChange() {
    if (pendingEnvironment === null) {
      return;
    }

    setEnvironment(pendingEnvironment);
    setPendingEnvironment(null);
    if (pendingEnvironment === "Production" && !integrationStatus?.production.chargeCreationEnabled) {
      showNotice("Produção selecionada em modo de consulta. A emissão de cobranças reais permanece bloqueada.");
    }
  }

  async function createOrRefreshSelectedPeriod() {
    if (isCreatingPeriod) return;

    setIsCreatingPeriod(true);
    try {
      await api.createBillingPeriod(selectedYear, selectedMonth, operatorId);
      showNotice(`Competência ${monthLabel(selectedYear, selectedMonth)} criada.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível iniciar o faturamento.";
      if (message.includes("409")) {
        showNotice(`O faturamento de ${monthLabel(selectedYear, selectedMonth)} já estava iniciado.`);
      } else {
        showError(message);
      }
    } finally {
      await refreshData();
      setIsCreatingPeriod(false);
    }
  }

  async function createSelectedPeriod() {
    try {
      await api.createBillingPeriod(selectedYear, selectedMonth, operatorId);
      showNotice(`Competência ${monthLabel(selectedYear, selectedMonth)} criada.`);
      await refreshData();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Não foi possível criar a competência.");
    }
  }

  async function saveCompany(taxId: string, input: CompanyFormValues) {
    try {
      const savedCompany = await api.updateCatalogCompany(taxId, { ...input, operatorId });
      showNotice(`Empresa ${savedCompany.displayName} salva.`);
      await Promise.all([refreshCatalogCompanies(), api.getCompanySchedules().then(setSchedules)]);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Não foi possível salvar a empresa.");
    }
  }

  async function createCompany(taxId: string, input: CompanyFormValues) {
    try {
      const createdCompany = await api.createCatalogCompany(taxId, { ...input, operatorId });
      showNotice(`Empresa ${createdCompany.displayName} cadastrada.`);
      await Promise.all([refreshCatalogCompanies(), api.getCompanySchedules().then(setSchedules)]);
      setSelectedCompanyTaxId(createdCompany.taxId);
      setPage("companyDetail");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Não foi possível cadastrar a empresa.");
    }
  }

  async function changeCompanyStatus(company: Company, activate: boolean) {
    try {
      const updatedCompany = activate
        ? await api.reactivateCatalogCompany(company.taxId, operatorId)
        : await api.deactivateCatalogCompany(company.taxId, operatorId);
      showNotice(
        activate
          ? `Empresa ${updatedCompany.displayName} reativada.`
          : `Empresa ${updatedCompany.displayName} inativada. O histórico e os lotes foram preservados.`,
      );
      await Promise.all([refreshCatalogCompanies(), api.getCompanySchedules().then(setSchedules)]);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Não foi possível alterar a situação da empresa.");
    }
  }

  async function refreshCompanyRegistry(company: Company) {
    try {
      const updatedCompany = await api.refreshCatalogCompanyRegistry(company.taxId, operatorId);
      showNotice(`Dados cadastrais atualizados: ${registryStatusLabel(updatedCompany)}.`);
      await refreshCatalogCompanies();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Não foi possível atualizar os dados cadastrais.");
    }
  }

  async function synchronizeCompanyAsaasSandbox(company: Company, email: string) {
    try {
      const synchronization = await api.synchronizeCatalogCompanyAsaasSandbox(
        company.taxId,
        email,
        operatorId,
      );
      showNotice(synchronization.message);
      await refreshCatalogCompanies();
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Não foi possível preparar o cliente de teste no Asaas Sandbox.";
      showError(message);
    }
  }

  async function synchronizeCompanyAsaasProduction(company: Company) {
    try {
      const synchronization = await api.synchronizeCatalogCompanyAsaasProduction(
        company.taxId,
        operatorId,
      );
      if (synchronization.status === "Linked") {
        showNotice(synchronization.message);
      } else {
        showError(synchronization.message);
      }
      await refreshCatalogCompanies();
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Não foi possível localizar o cliente no Asaas Produção.";
      showError(message);
    }
  }

  async function createBatchPreview(scheduled: boolean) {
    // O fechamento define o ciclo; o vencimento é escolhido pelo operador e
    // costuma cair no mês seguinte. Enquanto ele não escolher, sugerimos o
    // padrão observado no Asaas: cerca de dez dias após o fechamento.
    const resolvedDueDate = dueDate || suggestDueDate(selectedYear, selectedMonth, Number(scheduleDay));
    try {
      if (scheduled) {
        await api.createScheduledChargeBatchPreview(
          selectedYear,
          selectedMonth,
          Number(scheduleDay),
          resolvedDueDate,
          environment,
          operatorId,
        );
      } else {
        if (selectedDraftIds.length === 0) {
          showError("Selecione ao menos uma prévia aprovada.");
          return;
        }
        await api.createChargeBatchPreview(selectedDraftIds, resolvedDueDate, environment, operatorId);
      }
      showNotice("Prévia criada. Nenhuma cobrança foi enviada ao Asaas.");
      await refreshBillingData(selectedYear, selectedMonth);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Não foi possível criar a prévia do lote.");
    }
  }

  async function approveBatch(chargeBatch: ChargeBatch) {
    try {
      await api.approveChargeBatch(chargeBatch.id, operatorId);
      showNotice("Lote aprovado. A execução ainda exige confirmação explícita.");
      await refreshBillingData(selectedYear, selectedMonth);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Não foi possível aprovar o lote.");
    }
  }

  async function approveDraft(billingDraftId: string) {
    try {
      await api.approveBillingDraft(billingDraftId, operatorId);
      showNotice("Prévia aprovada. Agora ela pode ser incluída em um lote Sandbox.");
      await refreshBillingData(selectedYear, selectedMonth);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Não foi possível aprovar a prévia.");
    }
  }

  async function executeBatch() {
    if (!confirmationBatch || confirmationText.trim() !== "CONFIRMAR") return;
    if (!selectedEnvironmentStatus?.chargeCreationEnabled) {
      setConfirmationBatch(null);
      setConfirmationText("");
      showError(`A emissão de cobranças no ambiente ${environment} está bloqueada.`);
      return;
    }
    try {
      await api.executeChargeBatch(confirmationBatch.id, operatorId);
      setConfirmationBatch(null);
      setConfirmationText("");
      showNotice(`Lote executado no ambiente ${environment}.`);
      await refreshBillingData(selectedYear, selectedMonth);
    } catch (error) {
      showError(error instanceof Error ? error.message : "Não foi possível executar o lote.");
    }
  }

  const activeDrafts = drafts.filter((draft) => draft.status === "Approved");
  const totalMemberValue = members.reduce(
    (total, member) => total + member.memberships.reduce((membershipTotal, membership) => membershipTotal + (membership.nextMonthValue ?? 0), 0),
    0,
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar
          chargeCreationEnabled={selectedEnvironmentStatus?.chargeCreationEnabled ?? false}
          currentPage={page}
          environment={environment}
          onNavigate={setPage}
        />
        <div className="min-w-0 flex-1">
          <Header
            environment={environment}
            isRefreshing={isRefreshing}
            month={selectedMonth}
            productionAvailable={productionAvailable}
            year={selectedYear}
            onEnvironmentChange={selectEnvironment}
            onMonthChange={setSelectedMonth}
            onRefresh={() => void refreshData()}
            onYearChange={setSelectedYear}
          />
          <div className="mx-auto max-w-[1440px] px-5 py-7 lg:px-8">
            <div ref={messageAreaRef}>
              {errorMessage && <Callout tone="error" onDismiss={() => setErrorMessage(null)}>{errorMessage}</Callout>}
              {noticeMessage && <Callout tone="success" onDismiss={() => setNoticeMessage(null)}>{noticeMessage}</Callout>}
            </div>
            {/* Só afirmamos que faltam credenciais quando a API respondeu e
                disse isso. Sem resposta, o estado é desconhecido — dizer que a
                integração está desconfigurada seria inventar um diagnóstico. */}
            {integrationStatus === null ? (
              <Callout tone="warning">
                Não foi possível consultar o estado das integrações. Os dados abaixo podem estar incompletos; use o botão de atualizar.
              </Callout>
            ) : !selectedEnvironmentStatus?.isConfigured && (
              <Callout tone="warning">
                O ambiente {environment} não possui credenciais configuradas na API. A interface continuará em modo de consulta.
              </Callout>
            )}
            {environment === "Production"
              && selectedEnvironmentStatus?.readOperationsEnabled
              && !selectedEnvironmentStatus.chargeCreationEnabled && (
                <Callout tone="warning">
                  Produção está disponível para consulta e sincronização. A emissão de cobranças reais continua bloqueada.
                </Callout>
              )}

            {page === "overview" && (
              <Overview
                activeDrafts={unavailableDataSets.has("billing") ? null : activeDrafts.length}
                activeCatalogCompanies={unavailableDataSets.has("catalog") ? null : activeCatalogCompanyCount}
                environment={environment}
                memberValue={unavailableDataSets.has("evoMembers") ? null : totalMemberValue}
                members={unavailableDataSets.has("corporateMembers")
                  ? null
                  : corporateCatalogMembers.filter((member) => member.isActive).length}
                periodExists={Boolean(selectedPeriod)}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onCreatePeriod={() => void createOrRefreshSelectedPeriod()}
                onNavigate={setPage}
              />
            )}
            {page === "members" && <CorporateMemberCrmPage members={visibleCorporateCatalogMembers} search={memberSearch} onSearchChange={setMemberSearch} onImport={() => setPage("companyCatalogImport")} />}
            {page === "companies" && (
              <CompaniesPage
                companies={visibleCatalogCompanies}
                filterKey={companyFilter}
                latestImport={latestCatalogImport}
                search={companySearch}
                onFiltersChange={(filterKey, search) => void applyCompanyFilters(filterKey, search)}
                onImportCatalog={() => setPage("companyCatalogImport")}
                onNewCompany={() => setPage("companyForm")}
                onOpenCompany={(company) => { setSelectedCompanyTaxId(company.taxId); setPage("companyDetail"); }}
              />
            )}
            {page === "companyForm" && (
              <CompanyFormPage
                onBack={() => setPage("companies")}
                onCreate={(taxId, values) => void createCompany(taxId, values)}
              />
            )}
            {page === "companyCatalogImport" && (
              <CompanyCatalogImportPage
                onBack={() => setPage("companies")}
                onSynchronized={async (message) => {
                  showNotice(message);
                  setLatestCatalogImport(await api.getLatestCompanyCatalogImport());
                  await Promise.all([
                    refreshCatalogCompanies(),
                    api.getCorporateCatalogMembers().then(setCorporateCatalogMembers),
                  ]);
                }}
              />
            )}
            {page === "companyDetail" && selectedCompany && (
              <CompanyDetailPage
                company={selectedCompany}
                onBack={() => setPage("companies")}
                onChangeStatus={(activate) => void changeCompanyStatus(selectedCompany, activate)}
                onOpenCharges={() => setPage("dailyBilling")}
                onRefreshRegistry={() => void refreshCompanyRegistry(selectedCompany)}
                onSave={(values) => void saveCompany(selectedCompany.taxId, values)}
                onSynchronizeSandbox={(email) => synchronizeCompanyAsaasSandbox(selectedCompany, email)}
                onSynchronizeProduction={() => synchronizeCompanyAsaasProduction(selectedCompany)}
                sandboxSynchronizationAvailable={integrationStatus?.sandbox.readOperationsEnabled ?? false}
                productionSynchronizationAvailable={integrationStatus?.production.readOperationsEnabled ?? false}
              />
            )}
            {page === "charges" && (
              <ChargesHubPage
                batches={batches}
                environment={environment}
                onNavigate={setPage}
              />
            )}
            {page === "spreadsheetImport" && (
              <SpreadsheetImportPage
                existingDrafts={drafts}
                environment={environment}
                hasPeriod={Boolean(selectedPeriod)}
                onMonthChange={setSelectedMonth}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
                onBack={() => setPage("charges")}
                onImported={async (message) => {
                  showNotice(message);
                  await refreshData();
                  setPage("dailyBilling");
                }}
              />
            )}
            {page === "dailyBilling" && (
              <ChargesPage
                batches={batches}
                companies={catalogCompanies}
                chargeCreationEnabled={selectedEnvironmentStatus?.chargeCreationEnabled ?? false}
                drafts={drafts}
                environment={environment}
                hasPeriod={Boolean(selectedPeriod)}
                scheduleDay={scheduleDay}
                dueDate={dueDate || suggestDueDate(selectedYear, selectedMonth, Number(scheduleDay))}
                onDueDateChange={setDueDate}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                schedules={schedules}
                selectedDraftIds={selectedDraftIds}
                totalDraftValue={getDraftTotal(drafts.filter((draft) => selectedDraftIds.includes(draft.id)))}
                onApprove={(batch) => void approveBatch(batch)}
                onApproveDraft={(billingDraftId) => void approveDraft(billingDraftId)}
                onCreatePeriod={() => void createOrRefreshSelectedPeriod()}
                onCreatePreview={(scheduled) => void createBatchPreview(scheduled)}
                onExecute={(batch) => setConfirmationBatch(batch)}
                onNavigate={setPage}
                onScheduleDayChange={setScheduleDay}
                onToggleDraft={(draftId) => setSelectedDraftIds((currentIds) => currentIds.includes(draftId) ? currentIds.filter((id) => id !== draftId) : [...currentIds, draftId])}
              />
            )}
            {page === "integrations" && <IntegrationsPage status={integrationStatus} activeCatalogCompanyCount={activeCatalogCompanyCount} latestImport={latestCatalogImport} onOpenCatalog={() => setPage("companies")} onImportCatalog={() => setPage("companyCatalogImport")} />}
          </div>
        </div>
      </div>

      {confirmationBatch && (
        <ConfirmationModal
          batch={confirmationBatch}
          confirmationText={confirmationText}
          environment={environment}
          onCancel={() => { setConfirmationBatch(null); setConfirmationText(""); }}
          onConfirmationTextChange={setConfirmationText}
          onConfirm={() => void executeBatch()}
        />
      )}
      {pendingEnvironment && (
        <EnvironmentSwitchModal
          currentEnvironment={environment}
          targetEnvironment={pendingEnvironment}
          onCancel={() => setPendingEnvironment(null)}
          onConfirm={confirmEnvironmentChange}
        />
      )}
    </main>
  );
}

function Sidebar({ chargeCreationEnabled, currentPage, environment, onNavigate }: {
  chargeCreationEnabled: boolean;
  currentPage: Page;
  environment: AsaasEnvironment;
  onNavigate: (page: Page) => void;
}) {
  const items: Array<{ page: Page; label: string; icon: typeof LayoutDashboard }> = [
    { page: "overview", label: "Visão geral", icon: LayoutDashboard },
    { page: "members", label: "Colaboradores", icon: UsersRound },
    { page: "companies", label: "Empresas", icon: Building2 },
    { page: "charges", label: "Cobranças", icon: CreditCard },
    { page: "integrations", label: "Integrações", icon: Wifi },
  ];

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-charcoal px-3 py-5 md:flex">
      <div className="mb-7 flex items-center gap-3 px-2">
        <img alt="Evoque" className="h-10 w-10 rounded-lg bg-black object-contain p-1" src="/evoque-logo.png" />
        <div>
          <p className="text-[15px] font-extrabold leading-tight text-white">Evoque</p>
          <p className="mt-0.5 text-[11px] font-bold tracking-wide text-zinc-400">COBRANÇAS</p>
        </div>
      </div>
      <nav className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.page
            || (item.page === "companies" && currentPage === "companyDetail")
            || (item.page === "charges" && currentPage === "dailyBilling");
          return (
            <button key={item.page} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-bold transition ${isActive ? "bg-zinc-800 text-white" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"}`} onClick={() => onNavigate(item.page)}>
              <Icon size={19} strokeWidth={1.8} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto rounded-lg border border-amber-600/30 bg-amber-500/10 p-3">
        <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-amber-300"><span className="h-2 w-2 rounded-full bg-amber-300" />Asaas · {environment}</p>
        <p className="mt-1 text-[11px] leading-4 text-zinc-400">
          {environment === "Sandbox"
            ? "Ambiente de testes — cobranças não são reais."
            : chargeCreationEnabled
              ? "Ambiente autorizado para cobranças reais."
              : "Consulta de clientes reais — emissão bloqueada."}
        </p>
      </div>
    </aside>
  );
}

function Header({ environment, isRefreshing, month, productionAvailable, year, onEnvironmentChange, onMonthChange, onRefresh, onYearChange }: {
  environment: AsaasEnvironment; isRefreshing: boolean; month: number; productionAvailable: boolean; year: number;
  onEnvironmentChange: (environment: AsaasEnvironment) => void; onMonthChange: (month: number) => void; onRefresh: () => void; onYearChange: (year: number) => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white px-5 lg:px-8">
      <p className="hidden text-sm font-extrabold sm:block">Evoque Cobranças</p>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <select aria-label="Competência" className="field hidden w-44 sm:block" value={`${year}-${month}`} onChange={(event) => { const [nextYear, nextMonth] = event.target.value.split("-").map(Number); onYearChange(nextYear); onMonthChange(nextMonth); }}>
          {competenceOptions(year, month).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-extrabold">
          <button className={`rounded-md px-3 py-2 transition ${environment === "Sandbox" ? "bg-white text-charcoal shadow-sm" : "text-slate-500"}`} onClick={() => onEnvironmentChange("Sandbox")}>Sandbox</button>
          <button
            className={`rounded-md px-3 py-2 transition ${environment === "Production" ? "bg-charcoal text-white shadow-sm" : "text-slate-500"} ${!productionAvailable ? "cursor-not-allowed opacity-55" : ""}`}
            disabled={!productionAvailable}
            onClick={() => onEnvironmentChange("Production")}
            title={productionAvailable ? "Consultar dados de produção" : "Produção ainda não está disponível para consulta"}
          >
            Produção
          </button>
        </div>
        <button aria-label="Atualizar dados" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={onRefresh}>
          <RefreshCw className={isRefreshing ? "animate-spin" : ""} size={18} />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal text-xs font-extrabold text-white">OP</div>
      </div>
    </header>
  );
}

/** `null` em uma métrica significa "não carregou", que é diferente de zero. */
function Overview({ activeDrafts, activeCatalogCompanies, environment, memberValue, members, periodExists, selectedYear, selectedMonth, onCreatePeriod, onNavigate }: {
  activeDrafts: number | null; activeCatalogCompanies: number | null; environment: AsaasEnvironment; memberValue: number | null; members: number | null; periodExists: boolean; selectedYear: number; selectedMonth: number; onCreatePeriod: () => void; onNavigate: (page: Page) => void;
}) {
  return <section className="animate-[fade-in_180ms_ease-out]">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-2xl font-extrabold tracking-tight">Visão geral</p><p className="mt-1 text-sm text-slate-500">Consulte dados do Evo e prepare cobranças no Asaas.</p></div>
      {!periodExists && <button className="button-primary" onClick={onCreatePeriod}><Plus size={17} />Iniciar faturamento</button>}
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={UsersRound} label="Colaboradores corporativos ativos" value={members === null ? "—" : members.toString()} />
      <MetricCard icon={Building2} label="Empresas ativas no catálogo" value={activeCatalogCompanies === null ? "—" : activeCatalogCompanies.toString()} />
      <MetricCard icon={FileText} label="Prévias aprovadas" value={activeDrafts === null ? "—" : activeDrafts.toString()} tone="amber" />
      <MetricCard icon={CircleDollarSign} label="Valor nas matrículas" value={memberValue === null ? "—" : money(memberValue)} tone="orange" />
    </div>
    <div className="mt-7 grid gap-5 xl:grid-cols-[1.35fr_0.8fr]">
      <div className="panel p-5"><p className="text-base font-extrabold">O que você quer fazer?</p><p className="mt-1 text-sm text-slate-500">Fluxo seguro para a competência {monthLabel(selectedYear, selectedMonth)}.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <ActionCard icon={UsersRound} title="Colaboradores" description="Consultar matrículas e valores vindos do Evo." onClick={() => onNavigate("members")} />
          <ActionCard icon={Building2} title="Catálogo de empresas" description="Manter as empresas pagadoras e definir seus vencimentos." onClick={() => onNavigate("companies")} />
          <ActionCard dark icon={CalendarDays} title="Faturamento do dia" description="Criar uma prévia de lote para 02, 18, 20 ou 25." onClick={() => onNavigate("dailyBilling")} />
        </div>
      </div>
      <div className="panel p-5"><div className="flex items-center justify-between"><p className="text-base font-extrabold">Ambiente atual</p><span className={`badge ${environment === "Sandbox" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{environment}</span></div>
        <p className="mt-4 text-sm leading-6 text-slate-600">{environment === "Sandbox" ? "Use o Sandbox para validar as prévias, o boleto e a notificação sem cobrar clientes reais." : "Produção exige aprovação e confirmação textual antes de qualquer emissão."}</p>
        <div className="mt-5 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">Competência selecionada · {monthLabel(selectedYear, selectedMonth)}</div>
      </div>
    </div>
  </section>;
}

function MetricCard({ icon: Icon, label, value, tone = "slate" }: { icon: typeof UsersRound; label: string; value: string; tone?: "slate" | "amber" | "orange" }) {
  const iconStyle = tone === "amber" ? "bg-amber-50 text-amber-700" : tone === "orange" ? "bg-orange-50 text-orange" : "bg-slate-100 text-slate-700";
  return <div className="panel p-5"><div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconStyle}`}><Icon size={19} /></div><p className="mt-4 text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-2xl font-extrabold tracking-tight">{value}</p></div>;
}

function ActionCard({ dark = false, icon: Icon, title, description, onClick }: { dark?: boolean; icon: typeof UsersRound; title: string; description: string; onClick: () => void }) {
  return <button className={`rounded-xl border p-4 text-left transition ${dark ? "border-charcoal bg-charcoal text-white hover:bg-black" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"}`} onClick={onClick}><div className={`flex h-9 w-9 items-center justify-center rounded-lg ${dark ? "bg-zinc-800 text-orange" : "bg-slate-100 text-charcoal"}`}><Icon size={18} /></div><p className="mt-4 text-sm font-extrabold">{title}</p><p className={`mt-1 text-xs leading-5 ${dark ? "text-zinc-400" : "text-slate-500"}`}>{description}</p></button>;
}

function MembersPage({ members, search, onSearchChange }: { members: EvoMember[]; search: string; onSearchChange: (value: string) => void }) {
  return <section><PageHeading title="Colaboradores" description="Membros e matrículas obtidos da API do Evo." />
    <div className="mb-4 flex max-w-md items-center gap-2"><Search className="absolute ml-3 text-slate-400" size={17} /><input className="field w-full pl-10" placeholder="Buscar por nome ou unidade" value={search} onChange={(event) => onSearchChange(event.target.value)} /></div>
    <div className="panel overflow-hidden"><div className="overflow-x-auto"><table className="min-w-[820px] w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Colaborador</th><th className="px-5 py-3">Unidade</th><th className="px-5 py-3">Matrículas</th><th className="px-5 py-3 text-right">Próximo valor</th></tr></thead><tbody>
      {members.map((member) => { const total = member.memberships.reduce((sum, membership) => sum + (membership.nextMonthValue ?? membership.nextChargeValue ?? 0), 0); return <tr key={member.id} className="border-b border-slate-100 last:border-0"><td className="px-5 py-4"><p className="font-bold">{member.firstName} {member.lastName}</p><p className="mt-0.5 text-xs text-slate-500">ID Evo {member.id}</p></td><td className="px-5 py-4 text-slate-600">{member.branchName}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-1.5">{member.memberships.length === 0 ? <span className="text-slate-400">Sem matrícula</span> : member.memberships.map((membership) => <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600" key={membership.memberMembershipId}>{membership.name}</span>)}</div></td><td className="px-5 py-4 text-right font-extrabold">{money(total)}</td></tr>; })}
      {members.length === 0 && <EmptyTable colSpan={4} message="O Evo não retornou membros para esta consulta." />}
    </tbody></table></div></div>
  </section>;
}

function CompaniesPage({ companies, filterKey, latestImport, search, onFiltersChange, onImportCatalog, onNewCompany, onOpenCompany }: {
  companies: Company[];
  filterKey: CompanyFilterKey;
  latestImport: CompanyCatalogImportSummary | null;
  search: string;
  onFiltersChange: (filterKey: CompanyFilterKey, search: string) => void;
  onImportCatalog: () => void;
  onNewCompany: () => void;
  onOpenCompany: (company: Company) => void;
}) {
  const hasNoCatalogAtAll = companies.length === 0 && filterKey === "all" && !search.trim();

  return <section className="animate-[fade-in_180ms_ease-out]">
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Empresas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Cadastre e mantenha as empresas pagadoras pelo CNPJ. Os dados públicos são preenchidos automaticamente.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="button-secondary" onClick={onImportCatalog}><FileSpreadsheet size={17} />Adicionar em lote</button>
        <button className="button-primary" onClick={onNewCompany}><Plus size={17} />Adicionar empresa</button>
      </div>
    </div>

    {hasNoCatalogAtAll ? (
      <div className="panel border-dashed px-6 py-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><Building2 size={24} /></div>
        <p className="mt-4 font-extrabold">O catálogo de empresas está vazio</p>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">Adicione a primeira empresa pelo CNPJ. A razão social, o nome fantasia, a situação cadastral e o endereço serão consultados automaticamente.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button className="button-primary" onClick={onNewCompany}><Plus size={17} />Adicionar empresa</button>
          <button className="button-secondary" onClick={onImportCatalog}><FileSpreadsheet size={17} />Adicionar várias</button>
        </div>
      </div>
    ) : <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input className="field w-full pl-10" placeholder="Buscar por nome ou CNPJ" value={search} onChange={(event) => onFiltersChange(filterKey, event.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {companyFilterOptions.map((option) => (
            <button
              key={option.key}
              className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${option.key === filterKey ? "border-charcoal bg-charcoal text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
              onClick={() => onFiltersChange(option.key, search)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="panel overflow-hidden"><div className="overflow-x-auto"><table className="min-w-[980px] w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500"><tr>
          <th className="px-5 py-3">Empresa</th>
          <th className="px-5 py-3">CNPJ</th>
          <th className="px-5 py-3">Pessoas</th>
          <th className="px-5 py-3">Dia</th>
          <th className="px-5 py-3">Asaas</th>
          <th className="px-5 py-3">Origem</th>
          <th className="px-5 py-3">Situação</th>
          <th className="px-5 py-3"></th>
        </tr></thead>
        <tbody>
          {companies.map((company) => (
            <tr key={company.taxId} className="border-b border-slate-100 last:border-0">
              <td className="px-5 py-4">
                <p className="font-bold">{company.displayName}</p>
                {company.evoName && company.evoName !== company.displayName && <p className="mt-0.5 text-xs text-slate-500">No EVO: {company.evoName}</p>}
              </td>
              <td className="px-5 py-4 text-slate-600">{company.formattedTaxId}</td>
              <td className="px-5 py-4 text-slate-600">{company.memberCount}</td>
              <td className="px-5 py-4 font-extrabold">{company.closingDay ? String(company.closingDay).padStart(2, "0") : "—"}</td>
              <td className="px-5 py-4 text-slate-600">{companyAsaasLabel(company)}</td>
              <td className="px-5 py-4 text-slate-600">{companySourceLabel(company.source)}</td>
              <td className="px-5 py-4">
                <span className={`badge ${company.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{company.isActive ? "Ativa" : "Inativa"}</span>
              </td>
              <td className="px-5 py-4 text-right"><button className="button-secondary h-9" onClick={() => onOpenCompany(company)}>Abrir</button></td>
            </tr>
          ))}
          {companies.length === 0 && <EmptyTable colSpan={8} message="Nenhuma empresa corresponde a esta busca ou filtro." />}
        </tbody>
      </table></div></div>
    </>}
  </section>;
}

function ChargesHubPage({ batches, environment, onNavigate }: { batches: ChargeBatch[]; environment: AsaasEnvironment; onNavigate: (page: Page) => void }) {
  return <section className="max-w-[1020px] animate-[fade-in_180ms_ease-out]">
    <PageHeading title="Cobranças" description={`Escolha como quer cobrar. Ambiente atual: ${environment}.`} />
    <div className="grid gap-4 md:grid-cols-3">
      <button className="rounded-xl bg-charcoal p-6 text-left text-white shadow-lg shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-black" onClick={() => onNavigate("spreadsheetImport")}><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-orange"><FileSpreadsheet size={21} /></div><p className="mt-4 text-base font-extrabold">Importar fechamento do EVO</p><p className="mt-1 text-sm leading-6 text-zinc-400">Use a planilha exportada para conferir pessoas, empresa e valor antes de preparar a cobrança.</p></button>
      <button className="panel p-6 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md" onClick={() => onNavigate("companies")}><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800"><Building2 size={21} /></div><p className="mt-4 text-base font-extrabold">Nova cobrança por empresa</p><p className="mt-1 text-sm leading-6 text-slate-500">Escolha uma empresa e revise quais colaboradores entram na cobrança.</p></button>
      <button className="panel p-6 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md" onClick={() => onNavigate("dailyBilling")}><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange/10 text-orange"><CalendarDays size={21} /></div><p className="mt-4 text-base font-extrabold">Faturamento do dia</p><p className="mt-1 text-sm leading-6 text-slate-500">Reúna as prévias aprovadas para os vencimentos 02, 18, 20 ou 25.</p></button>
    </div>
    <div className="mt-8"><p className="mb-3 text-sm font-extrabold">Cobranças e lotes criados</p>{batches.length === 0 ? <div className="panel border-dashed px-6 py-10 text-center"><p className="font-extrabold">Nenhuma cobrança criada ainda</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Use um dos caminhos acima. As prévias e lotes aparecerão aqui com o resultado da execução.</p></div> : <div className="panel overflow-hidden"><div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Lote</th><th className="px-5 py-3">Vencimento</th><th className="px-5 py-3">Ambiente</th><th className="px-5 py-3">Itens</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{batches.map((batch) => <tr key={batch.id} className="border-b border-slate-100 last:border-0"><td className="px-5 py-4 font-bold">Lote de {date(batch.dueDate)}</td><td className="px-5 py-4 text-slate-600">{date(batch.dueDate)}</td><td className="px-5 py-4"><span className={`badge ${batch.asaasEnvironment === "Production" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{batch.asaasEnvironment}</span></td><td className="px-5 py-4 text-slate-600">{batch.items.length}</td><td className="px-5 py-4"><span className={`badge ${statusBadge(batch.status)}`}>{readableStatus(batch.status)}</span></td></tr>)}</tbody></table></div></div>}</div>
  </section>;
}

function SpreadsheetImportPage({
  existingDrafts,
  environment,
  hasPeriod,
  onMonthChange,
  selectedMonth,
  selectedYear,
  onYearChange,
  onBack,
  onImported,
}: {
  existingDrafts: BillingDraft[];
  environment: AsaasEnvironment;
  hasPeriod: boolean;
  onMonthChange: (month: number) => void;
  selectedMonth: number;
  selectedYear: number;
  onYearChange: (year: number) => void;
  onBack: () => void;
  onImported: (message: string) => Promise<void>;
}) {
  const [spreadsheetFile, setSpreadsheetFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<BillingSpreadsheetPreview | null>(null);
  const [sandboxEmail, setSandboxEmail] = useState(controlledSandboxEmail);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const previewCompany = preview?.companies.length === 1 ? preview.companies[0] : null;
  const existingCompanyDraft = previewCompany
    ? existingDrafts.find((draft) => draft.companyTaxId === previewCompany.companyTaxId) ?? null
    : null;

  function changeCompetence(value: string) {
    const [nextYear, nextMonth] = value.split("-").map(Number);
    onYearChange(nextYear);
    onMonthChange(nextMonth);
    setLocalError(null);
  }

  async function readSpreadsheet() {
    if (!spreadsheetFile) {
      setLocalError("Selecione uma planilha XLSX exportada do EVO.");
      return;
    }

    setIsReading(true);
    setLocalError(null);
    try {
      setPreview(await api.previewBillingSpreadsheet(selectedYear, selectedMonth, spreadsheetFile));
    } catch (error) {
      setPreview(null);
      setLocalError(error instanceof Error ? error.message : "Não foi possível ler a planilha.");
    } finally {
      setIsReading(false);
    }
  }

  async function createDrafts() {
    if (!spreadsheetFile || !preview) return;
    if (environment !== "Sandbox") {
      setLocalError("A importação de teste está disponível somente no ambiente Sandbox.");
      return;
    }
    if (preview.companies.length !== 1) {
      setLocalError("Para este primeiro fluxo, importe uma planilha com exatamente uma empresa por vez.");
      return;
    }
    if (!sandboxEmail.trim()) {
      setLocalError("Informe um e-mail controlado para receber a notificação do boleto de teste.");
      return;
    }
    if (existingCompanyDraft) {
      setLocalError(
        `Já existe uma prévia de ${previewCompany?.companyName ?? "esta empresa"} em ${monthLabel(selectedYear, selectedMonth)}. Selecione outra competência.`,
      );
      return;
    }

    setIsImporting(true);
    setLocalError(null);
    try {
      if (!hasPeriod) {
        try {
          await api.createBillingPeriod(selectedYear, selectedMonth, operatorId);
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (!message.includes("409") && !message.toLocaleLowerCase("pt-BR").includes("já")) {
            throw error;
          }
        }
      }

      const company = preview.companies[0];
      const customerResult = await api.synchronizeCatalogCompanyAsaasSandbox(
        company.companyTaxId,
        sandboxEmail.trim(),
        operatorId,
      );
      if (!customerResult.customerId) {
        throw new Error("O cliente de teste não pôde ser vinculado ao catálogo da empresa.");
      }
      const importResult = await api.createBillingDraftsFromSpreadsheet(
        selectedYear,
        selectedMonth,
        spreadsheetFile,
        operatorId,
        customerResult.customerId,
      );
      await onImported(
        `${importResult.billingDrafts.length} prévia(s) criada(s) a partir da planilha. Revise e aprove antes de gerar o lote Sandbox.`,
      );
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Não foi possível criar as prévias da planilha.");
    } finally {
      setIsImporting(false);
    }
  }

  const canCreateDrafts =
    preview !== null &&
    preview.companies.length === 1 &&
    existingCompanyDraft === null &&
    environment === "Sandbox" &&
    sandboxEmail.trim().length > 0 &&
    !isImporting;

  return <section className="max-w-[1080px] animate-[fade-in_180ms_ease-out]">
    <button className="mb-6 inline-flex items-center gap-1 text-sm font-bold text-slate-500 transition hover:text-slate-900" onClick={onBack}><ArrowLeft size={16} />Cobranças</button>
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange">Fonte do fechamento</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight">Importar planilha do EVO</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Confira o agrupamento e o total da planilha antes de criar uma prévia. Esta etapa não gera boleto.</p></div>
      <span className="badge border border-amber-200 bg-amber-50 text-amber-800">Asaas · {environment}</span>
    </div>

    {localError && <div className="mt-6"><Callout tone="error" onDismiss={() => setLocalError(null)}>{localError}</Callout></div>}

    <details className="panel mt-6 overflow-hidden" open>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
        <div>
          <p className="font-extrabold">Como exportar uma planilha válida no EVO</p>
          <p className="mt-1 text-sm text-slate-500">Use a planilha financeira oficial do fechamento da empresa, não a exportação completa do cadastro.</p>
        </div>
        <span className="badge bg-orange/10 text-orange">Guia rápido</span>
      </summary>
      <div className="grid gap-6 border-t border-slate-200 bg-slate-50/70 px-6 py-5 lg:grid-cols-[1.2fr_0.8fr]">
        <ol className="space-y-4 text-sm leading-6 text-slate-600">
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-charcoal text-xs font-extrabold text-white">1</span>
            <p>Escolha neste portal a <strong className="text-slate-900">competência da prévia</strong>. O mês selecionado será usado no vencimento do Asaas; não altere datas de cadastro ou contrato dentro do XLSX.</p>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-charcoal text-xs font-extrabold text-white">2</span>
            <p>Selecione a <strong className="text-slate-900">planilha oficial de fechamento de uma empresa</strong>. Ela deve representar os colaboradores e valores que a equipe realmente cobraria naquele fechamento.</p>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-charcoal text-xs font-extrabold text-white">3</span>
            <p>O arquivo precisa conter <strong className="text-slate-900">Nome</strong>, <strong className="text-slate-900">Empresa ou Profissão</strong> com nome e CNPJ, e <strong className="text-slate-900">Valor do contrato</strong>. Clique em <strong className="text-slate-900">Conferir dados</strong> e compare pessoas e total.</p>
          </li>
          <li className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-charcoal text-xs font-extrabold text-white">4</span>
            <p>Só crie a prévia quando o resultado conferir com o fechamento manual. A prévia ainda <strong className="text-slate-900">não cria boleto</strong>; aprovação e execução acontecem depois.</p>
          </li>
        </ol>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">O arquivo precisa conter</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {["Nome", "Profissão", "Valor do contrato"].map((column) => (
              <span className="badge bg-slate-100 text-slate-700" key={column}>{column}</span>
            ))}
          </div>
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
            <p className="font-extrabold">Não use o catálogo como fechamento</p>
            <p className="mt-1">A exportação completa do CRM 2.0 serve para atualizar empresas e colaboradores. Ela pode trazer contratos corporativos com valor zero e não deve gerar cobranças.</p>
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">O sistema lê a primeira aba do arquivo e ignora linhas sem CNPJ ou com valor igual a zero.</p>
        </div>
      </div>
    </details>

    <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_330px]">
      <div className="space-y-5">
        <section className="panel p-6">
          <div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange/10 text-orange"><FileSpreadsheet size={22} /></div><div><h2 className="font-extrabold">1. Escolha o fechamento</h2><p className="mt-1 text-sm leading-6 text-slate-500">Arquivo XLSX exportado do EVO, com nome, empresa, CNPJ e valor do contrato.</p></div></div>
          <label className="mt-5 block rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 transition focus-within:border-orange focus-within:ring-2 focus-within:ring-orange/20">
            <span className="block text-sm font-extrabold">{spreadsheetFile?.name ?? "Selecionar planilha XLSX"}</span>
            <span className="mt-1 block text-xs text-slate-500">{spreadsheetFile ? `${(spreadsheetFile.size / 1024 / 1024).toFixed(1)} MB` : "Máximo de 25 MB"}</span>
            <input
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="mt-4 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-bold file:text-slate-800 file:shadow-sm"
              type="file"
              onChange={(event) => {
                setSpreadsheetFile(event.target.files?.[0] ?? null);
                setPreview(null);
                setLocalError(null);
              }}
            />
          </label>
          <button className="button-secondary mt-4" disabled={!spreadsheetFile || isReading} onClick={() => void readSpreadsheet()}>
            {isReading ? <LoaderCircle className="animate-spin" size={17} /> : <Search size={17} />}
            {isReading ? "Lendo planilha..." : "Conferir dados"}
          </button>
        </section>

        {preview && <section className="panel overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Resultado da leitura</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><h2 className="text-xl font-extrabold">{preview.fileName}</h2><p className="text-2xl font-extrabold">{money(preview.totalAmount)}</p></div></div>
          <div className="grid grid-cols-2 gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-4">
            <ImportMetric label="Empresas" value={String(preview.companies.length)} />
            <ImportMetric label="Pessoas" value={String(preview.importedRowCount)} />
            <ImportMetric label="Duplicadas ignoradas" value={String(preview.duplicateRowCount)} />
            <ImportMetric label="Avisos" value={String(preview.warnings.length)} />
          </div>
          <div className="divide-y divide-slate-100">
            {preview.companies.map((company) => <div className="px-6 py-5" key={company.companyTaxId}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-extrabold">{company.companyName}</p><p className="mt-1 text-xs text-slate-500">CNPJ {company.companyTaxId} · {company.memberCount} pessoa(s)</p></div><p className="font-extrabold">{money(company.totalAmount)}</p></div>
            </div>)}
          </div>
          {preview.warnings.length > 0 && <div className="border-t border-amber-200 bg-amber-50 px-6 py-4"><p className="text-sm font-extrabold text-amber-900">Linhas que precisam de atenção</p><ul className="mt-2 space-y-1 text-xs leading-5 text-amber-800">{preview.warnings.slice(0, 5).map((warning, index) => <li key={`${warning.code}-${warning.sourceRowNumber ?? index}`}>{warning.sourceRowNumber ? `Linha ${warning.sourceRowNumber}: ` : ""}{warning.message}</li>)}</ul></div>}
        </section>}
      </div>

      <aside className="panel h-fit p-6 lg:sticky lg:top-24">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">2. Preparar prévia</p>
        <h2 className="mt-2 text-lg font-extrabold">Cliente de teste no Asaas</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">O e-mail abaixo será associado ao cliente Sandbox para receber notificações de teste. Nenhum cliente real será alterado.</p>
        <label className="mt-5 block text-xs font-extrabold uppercase tracking-wide text-slate-500">Competência da prévia
          <select
            className="field mt-1.5 w-full bg-white text-sm font-bold normal-case tracking-normal text-slate-900"
            value={`${selectedYear}-${selectedMonth}`}
            onChange={(event) => changeCompetence(event.target.value)}
          >
            {competenceOptions(selectedYear, selectedMonth).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Esta escolha define o mês do vencimento enviado ao Asaas e não altera as datas cadastrais da planilha.
        </p>
        {existingCompanyDraft && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-extrabold">Prévia já existente nesta competência</p>
            <p className="mt-1 leading-5">
              {previewCompany?.companyName} já possui uma prévia em {monthLabel(selectedYear, selectedMonth)}. Escolha outro mês para continuar.
            </p>
          </div>
        )}
        <label className="mt-5 block text-xs font-extrabold uppercase tracking-wide text-slate-500">E-mail controlado
          <input className="field mt-1.5 w-full normal-case" placeholder="voce@exemplo.com" type="email" value={sandboxEmail} onChange={(event) => setSandboxEmail(event.target.value)} />
        </label>
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          <p className="font-extrabold text-slate-800">O que acontecerá</p>
          <p className="mt-1">O sistema localizará ou criará o cliente no Sandbox e salvará uma prévia para revisão.</p>
        </div>
        <button className="button-primary mt-5 w-full" disabled={!canCreateDrafts} onClick={() => void createDrafts()}>
          {isImporting ? <LoaderCircle className="animate-spin" size={17} /> : <FileText size={17} />}
          {isImporting ? "Preparando prévia..." : `Criar prévia Sandbox · ${monthLabel(selectedYear, selectedMonth)}`}
        </button>
        {environment !== "Sandbox" && <p className="mt-3 text-xs leading-5 text-red-700">Volte ao ambiente Sandbox para validar este fluxo.</p>}
        {preview && preview.companies.length !== 1 && <p className="mt-3 text-xs leading-5 text-amber-700">Separe uma planilha por empresa para associar o cliente Asaas corretamente.</p>}
      </aside>
    </div>
  </section>;
}

function ImportMetric({ label, value }: { label: string; value: string }) {
  return <div className="bg-white px-5 py-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-xl font-extrabold">{value}</p></div>;
}

function ChargesPage({ batches, companies, chargeCreationEnabled, drafts, dueDate, environment, hasPeriod, scheduleDay, schedules, selectedDraftIds, selectedMonth, selectedYear, totalDraftValue, onApprove, onApproveDraft, onCreatePeriod, onCreatePreview, onDueDateChange, onExecute, onNavigate, onScheduleDayChange, onToggleDraft }: {
  batches: ChargeBatch[]; companies: Company[]; chargeCreationEnabled: boolean; drafts: BillingDraft[]; dueDate: string; environment: AsaasEnvironment; hasPeriod: boolean; scheduleDay: string; schedules: CompanySchedule[]; selectedDraftIds: string[]; selectedMonth: number; selectedYear: number; totalDraftValue: number;
  onApprove: (batch: ChargeBatch) => void; onApproveDraft: (billingDraftId: string) => void; onCreatePeriod: () => void; onCreatePreview: (scheduled: boolean) => void; onDueDateChange: (dueDate: string) => void; onExecute: (batch: ChargeBatch) => void; onNavigate: (page: Page) => void; onScheduleDayChange: (day: string) => void; onToggleDraft: (draftId: string) => void;
}) {
  const selectedDay = Number(scheduleDay);
  const closingDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
  const selectedDueDate = parseDateOnly(dueDate);
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  const isSelectedDueDateInPast = selectedDueDate < currentDate;
  const isDueDateBeforeClosing = selectedDueDate < closingDate;
  const activeSchedulesForDay = schedules.filter((schedule) => schedule.isActive && schedule.closingDay === selectedDay);
  // Os lotes não são filtrados por dia. O lote guarda o vencimento, não o
  // fechamento, e filtrar por `dueDate.getDate()` escondia todo lote cujo
  // vencimento não caísse exatamente em 02, 18, 20 ou 25 — ou seja, todos.
  // O operador ficava sem acesso ao botão de aprovar de um lote existente.
  const openBatches = batches.filter((batch) =>
    batch.status === "AwaitingApproval" || batch.status === "Approved" || batch.status === "Processing");
  const settledBatches = batches.filter((batch) =>
    batch.status === "Completed" || batch.status === "CompletedWithErrors");
  // A agenda guarda o CNPJ normalizado, que é a identidade da empresa no
  // catálogo. Empresas inativas não entram no lote e não são listadas aqui.
  const companiesForSelectedDay = activeSchedulesForDay
    .map((schedule) => companies.find((company) => company.taxId === schedule.externalCompanyId))
    .filter((company): company is Company => company !== undefined && company.isActive);

  return <section>
    <button className="mb-6 inline-flex items-center gap-1 text-sm font-bold text-slate-500 transition hover:text-slate-900" onClick={() => onNavigate("charges")}><ArrowLeft size={16} />Cobranças</button>
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange">Ciclo mensal</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">Faturamento do dia</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Selecione uma data para revisar as empresas configuradas e gerar uma prévia segura do lote.</p></div>
      <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold ${environment === "Sandbox" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-800"}`}><span className="h-2 w-2 rounded-full bg-current" />Asaas · {environment}</div>
    </div>

    <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {closingDays.map((day) => {
        const companiesOnDay = schedules.filter((schedule) => schedule.isActive && schedule.closingDay === day).length;
        const isSelected = day === selectedDay;
        return <button key={day} className={`group rounded-xl border p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-orange/30 ${isSelected ? "border-charcoal bg-charcoal text-white shadow-lg shadow-slate-900/10" : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-orange/50 hover:shadow-md"}`} onClick={() => onScheduleDayChange(String(day))}>
          <div className="flex items-start justify-between"><span className={`text-xs font-extrabold uppercase tracking-[0.16em] ${isSelected ? "text-orange-200" : "text-slate-500"}`}>Dia</span>{isSelected && <CalendarCheck2 size={19} className="text-orange" />}</div>
          <p className="mt-3 text-4xl font-extrabold tracking-tight">{String(day).padStart(2, "0")}</p>
          <p className={`mt-3 text-sm font-semibold ${isSelected ? "text-slate-300" : "text-slate-500"}`}>{companiesOnDay} {companiesOnDay === 1 ? "empresa configurada" : "empresas configuradas"}</p>
        </button>;
      })}
    </div>

    {!hasPeriod ? <div className="panel mt-7 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-extrabold">O faturamento deste mês ainda não foi iniciado</p><p className="mt-1 text-sm text-slate-500">Inicie o faturamento para preparar prévias e lotes. Nenhuma cobrança será criada no Asaas nesta etapa.</p></div><button className="button-primary shrink-0" onClick={onCreatePeriod}><Plus size={17} />Iniciar faturamento de {monthLabel(selectedYear, selectedMonth)}</button></div> : <>
      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange/10 text-orange"><CalendarDays size={21} /></div><div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Fechamento selecionado</p><h2 className="mt-0.5 text-xl font-extrabold">Dia {String(selectedDay).padStart(2, "0")}</h2></div></div><p className="text-sm text-slate-500">{companiesForSelectedDay.length} empresa(s) ativa(s) na agenda</p></div></div>
        <div className="grid gap-5 p-6 xl:grid-cols-[1fr_330px]">
          <div>
            {companiesForSelectedDay.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center"><Building2 className="mx-auto text-slate-400" size={26} /><p className="mt-3 font-extrabold">Nenhuma empresa ativa está pronta para este dia</p><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Abra o catálogo de empresas e defina o dia de fechamento de uma empresa ativa antes de gerar uma prévia.</p><button className="button-secondary mt-5" onClick={() => onNavigate("companies")}>Abrir catálogo de empresas</button></div> : <><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="font-extrabold">Empresas do ciclo</p><p className="mt-1 text-sm text-slate-500">A lista usa o catálogo interno e os vencimentos salvos no faturamento.</p></div><span className="badge bg-slate-100 text-slate-700">{companiesForSelectedDay.length} empresa(s) ativa(s)</span></div><div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">{companiesForSelectedDay.map((company) => <div key={company.taxId} className="flex items-center justify-between gap-4 px-4 py-3.5"><div><p className="font-bold">{company.displayName}</p><p className="mt-0.5 text-xs text-slate-500">{company.formattedTaxId} · {companyAsaasLabel(company)}</p></div><span className="text-xs font-extrabold text-slate-500">Dia {String(company.closingDay ?? selectedDay).padStart(2, "0")}</span></div>)}</div></>}
          </div>
          <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-2"><ReceiptText size={18} className="text-orange" /><p className="font-extrabold">Gerar prévia do ciclo</p></div>
            <p className="mt-2 text-sm leading-6 text-slate-500">A prévia calcula o lote e não cria cobranças no Asaas.</p>
            <div className="mt-5 rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Fechamento do período</p>
              <p className="mt-1 font-extrabold">Dia {String(selectedDay).padStart(2, "0")} · {monthLabel(selectedYear, selectedMonth)}</p>
            </div>
            <label className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">Vencimento do boleto
              <input type="date" className="field mt-1.5 w-full" value={dueDate} onChange={(event) => onDueDateChange(event.target.value)} />
            </label>
            <p className="mt-1.5 text-xs leading-5 text-slate-500">O vencimento é negociado à parte e normalmente cai no mês seguinte ao fechamento.</p>
            <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ambiente</p><p className="mt-1 font-extrabold">{environment}</p></div>
            <button className="button-primary mt-4 w-full" disabled={companiesForSelectedDay.length === 0 || isSelectedDueDateInPast || isDueDateBeforeClosing} onClick={() => onCreatePreview(true)}><FileText size={17} />Gerar prévia do dia {String(selectedDay).padStart(2, "0")}</button>
            <p className={`mt-3 text-xs leading-5 ${isSelectedDueDateInPast || isDueDateBeforeClosing ? "font-semibold text-amber-700" : "text-slate-500"}`}>
              {isSelectedDueDateInPast
                ? `O vencimento ${date(dueDate)} já passou. Escolha uma data futura.`
                : isDueDateBeforeClosing
                  ? `O vencimento ${date(dueDate)} é anterior ao fechamento ${String(selectedDay).padStart(2, "0")}/${String(selectedMonth).padStart(2, "0")}/${selectedYear}.`
                  : "Após criar, revise e aprove o lote antes de qualquer emissão."}
            </p>
          </aside>
        </div>
      </section>

      <section className="mt-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-lg font-extrabold">Lotes de {monthLabel(selectedYear, selectedMonth)}</p>
            <p className="mt-1 text-sm text-slate-500">Acompanhe revisão, aprovação e execução. O lote guarda o vencimento, não o dia de fechamento.</p>
          </div>
          {openBatches.length > 0 && <span className="badge bg-slate-100 text-slate-700">{openBatches.length} em aberto</span>}
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {openBatches.map((batch) => <BatchCard key={batch.id} batch={batch} chargeCreationEnabled={chargeCreationEnabled} onApprove={() => onApprove(batch)} onExecute={() => onExecute(batch)} />)}
          {openBatches.length === 0 && <div className="panel p-7 text-center text-sm text-slate-500">Nenhum lote em aberto nesta competência.</div>}
        </div>
        {/* Um lote concluído não faz mais nada, mas continua sendo o registro de
            uma tentativa de emissão. Ele sai da lista principal e permanece
            acessível: esconder de vez faria a tela contar uma história
            diferente da auditoria. */}
        {settledBatches.length > 0 && (
          <details className="mt-3 rounded-xl border border-slate-200 bg-white">
            <summary className="cursor-pointer list-none p-4 text-sm font-extrabold text-slate-600">
              Mostrar {settledBatches.length} lote(s) concluído(s)
            </summary>
            <div className="grid gap-3 border-t border-slate-200 p-4 lg:grid-cols-2">
              {settledBatches.map((batch) => <BatchCard key={batch.id} batch={batch} chargeCreationEnabled={chargeCreationEnabled} onApprove={() => onApprove(batch)} onExecute={() => onExecute(batch)} />)}
            </div>
          </details>
        )}
      </section>

      <details className="mt-7 rounded-xl border border-slate-200 bg-white" open>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 font-extrabold">
          <span>Prévias por empresa</span>
          <span className="text-sm font-semibold text-slate-500">Revise, aprove e selecione</span>
        </summary>
        <div className="border-t border-slate-200 p-5">
          <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  <tr><th className="w-12 px-5 py-3"></th><th className="px-5 py-3">Empresa</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Valor</th><th className="px-5 py-3 text-right">Ação</th></tr>
                </thead>
                <tbody>
                  {drafts.map((draft) => {
                    const canSelect = draft.status === "Approved";
                    const canApprove = draft.status === "PendingReview" || draft.status === "AwaitingReview" || draft.status === "Draft";
                    return <tr key={draft.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-5 py-4"><input aria-label={`Selecionar ${draft.companyName}`} checked={selectedDraftIds.includes(draft.id)} disabled={!canSelect} type="checkbox" onChange={() => onToggleDraft(draft.id)} /></td>
                      <td className="px-5 py-4"><p className="font-bold">{draft.companyName}</p><p className="mt-0.5 text-xs text-slate-500">{draft.companyTaxId} · {draft.items.length} pessoa(s)</p></td>
                      <td className="px-5 py-4"><span className={`badge ${statusBadge(draft.status)}`}>{readableStatus(draft.status)}</span></td>
                      <td className="px-5 py-4 text-right font-extrabold">{money(draft.totalAmount)}</td>
                      <td className="px-5 py-4 text-right">{canApprove ? <button className="button-secondary h-9" onClick={() => onApproveDraft(draft.id)}><CheckCircle2 size={16} />Aprovar prévia</button> : <span className="text-xs font-semibold text-slate-400">{canSelect ? "Pronta para o lote" : "Sem ação"}</span>}</td>
                    </tr>;
                  })}
                  {drafts.length === 0 && <EmptyTable colSpan={5} message="Ainda não há prévias nesta competência. Importe um fechamento do EVO pela tela de Cobranças." />}
                </tbody>
              </table>
            </div>
            <aside className="rounded-xl bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Prévias selecionadas</p>
              <p className="mt-2 text-2xl font-extrabold">{money(totalDraftValue)}</p>
              <p className="mt-1 text-sm text-slate-500">{selectedDraftIds.length} empresa(s) selecionada(s)</p>
              <button className="button-secondary mt-5 w-full" disabled={selectedDraftIds.length === 0} onClick={() => onCreatePreview(false)}><FileText size={17} />Gerar lote para revisão</button>
            </aside>
          </div>
        </div>
      </details>
    </>}
  </section>;
}

function MembershipSummary({ memberships }: { memberships: EvoMembership[] }) {
  if (memberships.length === 0) {
    return <span className="text-slate-400">Sem matrícula</span>;
  }

  const membershipsByName = new Map<string, EvoMembership>();
  for (const membership of memberships) {
    const normalizedMembershipName = membership.name.trim().toLocaleLowerCase("pt-BR");
    if (!membershipsByName.has(normalizedMembershipName)) {
      membershipsByName.set(normalizedMembershipName, membership);
    }
  }

  const distinctMemberships = Array.from(membershipsByName.values());
  const visibleMemberships = distinctMemberships.slice(0, 2);
  const remainingMembershipCount = distinctMemberships.length - visibleMemberships.length;

  return <div className="flex max-w-[390px] flex-wrap gap-1.5">
    {visibleMemberships.map((membership) => <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600" key={membership.memberMembershipId}>{membership.name}</span>)}
    {remainingMembershipCount > 0 && <span className="rounded bg-orange/10 px-2 py-1 text-xs font-extrabold text-orange">+{remainingMembershipCount} contratos</span>}
  </div>;
}

function CompactEvoMembersPage({ members, corporateMembers, search, onSearchChange }: {
  members: EvoMember[];
  corporateMembers: EvoCorporateMember[];
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const companyNamesByMemberId = useMemo(() => {
    const companyNames = new Map<number, string[]>();
    for (const corporateMember of corporateMembers) {
      const currentNames = companyNames.get(corporateMember.memberId) ?? [];
      if (!currentNames.includes(corporateMember.corporatePartnershipName)) {
        currentNames.push(corporateMember.corporatePartnershipName);
      }
      companyNames.set(corporateMember.memberId, currentNames);
    }
    return companyNames;
  }, [corporateMembers]);

  return <section>
    <PageHeading title="Colaboradores" description="Colaboradores ativos do Evo. A empresa pagadora aparece somente quando o vínculo foi confirmado." />
    <div className="mb-4 flex max-w-md items-center gap-2"><Search className="absolute ml-3 text-slate-400" size={17} /><input className="field w-full pl-10" placeholder="Buscar por nome ou unidade" value={search} onChange={(event) => onSearchChange(event.target.value)} /></div>
    <div className="panel overflow-hidden"><div className="overflow-x-auto"><table className="min-w-[920px] w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Colaborador</th><th className="px-5 py-3">Unidade</th><th className="px-5 py-3">Empresa pagadora</th><th className="px-5 py-3">Matrículas</th></tr></thead><tbody>
      {members.map((member) => { const companyNames = companyNamesByMemberId.get(member.id); return <tr key={member.id} className="border-b border-slate-100 last:border-0"><td className="px-5 py-4"><p className="font-bold">{member.firstName} {member.lastName}</p><p className="mt-0.5 text-xs text-slate-500">ID Evo {member.id}</p></td><td className="px-5 py-4 text-slate-600">{member.branchName}</td><td className="px-5 py-4 text-slate-600">{companyNames?.join(", ") ?? "Ainda não identificada"}</td><td className="px-5 py-4"><MembershipSummary memberships={member.memberships} /></td></tr>; })}
      {members.length === 0 && <EmptyTable colSpan={4} message="O Evo não retornou colaboradores ativos para esta consulta." />}
    </tbody></table></div></div>
  </section>;
}

function CorporateMemberCrmPage({
  members,
  search,
  onSearchChange,
  onImport,
}: {
  members: CorporateMember[];
  search: string;
  onSearchChange: (value: string) => void;
  onImport: () => void;
}) {
  const activeMemberCount = members.filter((member) => member.isActive).length;
  const inactiveMemberCount = members.length - activeMemberCount;

  return <section>
    <PageHeading
      title="Colaboradores corporativos"
      description="Base persistente comparada com a exportação completa de clientes ativos do EVO."
      action={<button className="button-primary" onClick={onImport}><FileSpreadsheet size={17} />Atualizar pelo EVO</button>}
    />

    <div className="mb-5 grid gap-3 sm:grid-cols-3">
      <ImportMetric label="Ativos" value={activeMemberCount.toString()} />
      <ImportMetric label="Inativos" value={inactiveMemberCount.toString()} />
      <ImportMetric label="Total no histórico" value={members.length.toString()} />
    </div>

    <div className="mb-4 flex max-w-xl items-center gap-2">
      <Search className="absolute ml-3 text-slate-400" size={17} />
      <input
        className="field w-full pl-10"
        placeholder="Buscar colaborador, empresa, contrato ou ID EVO"
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
      />
    </div>

    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3">Colaborador</th>
              <th className="px-5 py-3">Empresa pagadora</th>
              <th className="px-5 py-3">Contratos</th>
              <th className="px-5 py-3">Situação</th>
              <th className="px-5 py-3">Última confirmação</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.evoMemberId} className="border-b border-slate-100 last:border-0">
                <td className="px-5 py-4">
                  <p className="font-bold">{member.memberName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">ID EVO {member.evoMemberId}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-700">{member.companyName}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{member.formattedCompanyTaxId}</p>
                </td>
                <td className="px-5 py-4">
                  <div className="flex max-w-[360px] flex-wrap gap-1.5">
                    {member.contracts.length === 0
                      ? <span className="text-slate-400">Não informado</span>
                      : member.contracts.slice(0, 2).map((contract) => (
                        <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600" key={contract}>{contract}</span>
                      ))}
                    {member.contracts.length > 2 && <span className="rounded bg-orange/10 px-2 py-1 text-xs font-extrabold text-orange">+{member.contracts.length - 2}</span>}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`badge ${member.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {member.isActive ? "Ativo" : "Saiu do corporativo"}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-600">{date(member.lastSeenAt)}</td>
              </tr>
            ))}
          {members.length === 0 && <EmptyTable colSpan={5} message="Importe uma exportação completa de clientes ativos do EVO para iniciar a base de colaboradores corporativos." />}
          </tbody>
        </table>
      </div>
    </div>
  </section>;
}

function EvoMembersPage({ members, corporateMembers, search, onSearchChange }: {
  members: EvoMember[];
  corporateMembers: EvoCorporateMember[];
  search: string;
  onSearchChange: (value: string) => void;
}) {
  const companyNamesByMemberId = useMemo(() => {
    const companyNames = new Map<number, string[]>();
    for (const corporateMember of corporateMembers) {
      const currentNames = companyNames.get(corporateMember.memberId) ?? [];
      if (!currentNames.includes(corporateMember.corporatePartnershipName)) {
        currentNames.push(corporateMember.corporatePartnershipName);
      }
      companyNames.set(corporateMember.memberId, currentNames);
    }
    return companyNames;
  }, [corporateMembers]);

  return <section>
    <PageHeading title="Colaboradores" description="Colaboradores ativos do Evo. A empresa pagadora aparece somente quando o vínculo foi confirmado." />
    <div className="mb-4 flex max-w-md items-center gap-2"><Search className="absolute ml-3 text-slate-400" size={17} /><input className="field w-full pl-10" placeholder="Buscar por nome ou unidade" value={search} onChange={(event) => onSearchChange(event.target.value)} /></div>
    <div className="panel overflow-hidden"><div className="overflow-x-auto"><table className="min-w-[820px] w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Colaborador</th><th className="px-5 py-3">Unidade</th><th className="px-5 py-3">Empresa pagadora</th><th className="px-5 py-3">Matrículas</th></tr></thead><tbody>
      {members.map((member) => { const companyNames = companyNamesByMemberId.get(member.id); return <tr key={member.id} className="border-b border-slate-100 last:border-0"><td className="px-5 py-4"><p className="font-bold">{member.firstName} {member.lastName}</p><p className="mt-0.5 text-xs text-slate-500">ID Evo {member.id}</p></td><td className="px-5 py-4 text-slate-600">{member.branchName}</td><td className="px-5 py-4 text-slate-600">{companyNames?.join(", ") ?? "Ainda não identificada"}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-1.5">{member.memberships.length === 0 ? <span className="text-slate-400">Sem matrícula</span> : member.memberships.map((membership) => <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600" key={membership.memberMembershipId}>{membership.name}</span>)}</div></td></tr>; })}
      {members.length === 0 && <EmptyTable colSpan={4} message="O Evo não retornou colaboradores ativos para esta consulta." />}
    </tbody></table></div></div>
  </section>;
}

function CorporateMembersPage({ members, hasMore, search, onLoadMore, onSearchChange }: {
  members: EvoCorporateMember[];
  hasMore: boolean;
  search: string;
  onLoadMore: () => void;
  onSearchChange: (value: string) => void;
}) {
  return <section>
    <PageHeading title="Colaboradores" description="Colaboradores com empresa pagadora identificada explicitamente nas vendas do Evo." />
    <div className="mb-4 flex max-w-md items-center gap-2">
      <Search className="absolute ml-3 text-slate-400" size={17} />
      <input className="field w-full pl-10" placeholder="Buscar colaborador, contrato ou empresa" value={search} onChange={(event) => onSearchChange(event.target.value)} />
    </div>
    <div className="panel overflow-hidden"><div className="overflow-x-auto"><table className="min-w-[820px] w-full text-left text-sm">
      <thead className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Colaborador</th><th className="px-5 py-3">Empresa pagadora</th><th className="px-5 py-3">Contrato</th><th className="px-5 py-3 text-right">Valor da venda</th></tr></thead>
      <tbody>
        {members.map((member) => <tr key={member.memberMembershipId} className="border-b border-slate-100 last:border-0"><td className="px-5 py-4"><p className="font-bold">{member.memberName}</p><p className="mt-0.5 text-xs text-slate-500">Membro Evo #{member.memberId}</p></td><td className="px-5 py-4"><p className="font-semibold text-slate-700">{member.corporatePartnershipName}</p><p className="mt-0.5 text-xs text-slate-500">Parceria Evo #{member.corporatePartnershipId}</p></td><td className="px-5 py-4 text-slate-600">{member.membershipName ?? "Não informado"}</td><td className="px-5 py-4 text-right font-extrabold">{money(member.saleValue)}</td></tr>)}
        {members.length === 0 && <EmptyTable colSpan={4} message="Nenhum vínculo corporativo foi encontrado nesta página do Evo. Carregue a próxima página para continuar a busca." />}
      </tbody>
    </table></div></div>
    {hasMore && <button className="button-secondary mt-4" onClick={onLoadMore}><RefreshCw size={17} />Carregar próxima página do Evo</button>}
  </section>;
}

function CompanyDetailPage({
  company,
  onBack,
  onChangeStatus,
  onOpenCharges,
  onRefreshRegistry,
  onSave,
  onSynchronizeSandbox,
  onSynchronizeProduction,
  sandboxSynchronizationAvailable,
  productionSynchronizationAvailable,
}: {
  company: Company;
  onBack: () => void;
  onChangeStatus: (activate: boolean) => void;
  onOpenCharges: () => void;
  onRefreshRegistry: () => void;
  onSave: (values: CompanyFormValues) => void;
  onSynchronizeSandbox: (email: string) => Promise<void>;
  onSynchronizeProduction: () => Promise<void>;
  sandboxSynchronizationAvailable: boolean;
  productionSynchronizationAvailable: boolean;
}) {
  const [displayName, setDisplayName] = useState(company.displayName);
  const [closingDay, setBillingDay] = useState(company.closingDay ? String(company.closingDay) : "");
  const [sandboxEmail, setSandboxEmail] = useState(controlledSandboxEmail);
  const [isSynchronizingSandbox, setIsSynchronizingSandbox] = useState(false);
  const [isSynchronizingProduction, setIsSynchronizingProduction] = useState(false);
  const [members, setMembers] = useState<CorporateMember[]>([]);
  const [billingHistory, setBillingHistory] = useState<CompanyBillingHistoryEntry[]>([]);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(company.displayName);
    setBillingDay(company.closingDay ? String(company.closingDay) : "");
  }, [company]);

  useEffect(() => {
    let isCurrentCompany = true;
    setDetailError(null);
    void Promise.all([
      api.getCatalogCompanyMembers(company.taxId),
      api.getCatalogCompanyBillingHistory(company.taxId),
    ])
      .then(([memberData, historyData]) => {
        if (!isCurrentCompany) return;
        setMembers(memberData);
        setBillingHistory(historyData);
      })
      .catch((error: unknown) => {
        if (!isCurrentCompany) return;
        setDetailError(error instanceof Error ? error.message : "Não foi possível carregar os detalhes da empresa.");
      });
    return () => { isCurrentCompany = false; };
  }, [company.taxId]);

  const address = company.registryAddress;

  async function synchronizeSandbox() {
    setIsSynchronizingSandbox(true);
    try {
      await onSynchronizeSandbox(sandboxEmail);
    } finally {
      setIsSynchronizingSandbox(false);
    }
  }

  async function synchronizeProduction() {
    setIsSynchronizingProduction(true);
    try {
      await onSynchronizeProduction();
    } finally {
      setIsSynchronizingProduction(false);
    }
  }

  return <section className="max-w-[1100px] animate-[fade-in_180ms_ease-out]">
    <button className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-900" onClick={onBack}><ArrowLeft size={16} />Empresas</button>

    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">{company.displayName}</h1>
        <p className="mt-1 text-sm text-slate-500">{company.formattedTaxId} · origem {companySourceLabel(company.source)} · {registryStatusLabel(company)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="button-secondary" onClick={onRefreshRegistry}><RefreshCw size={17} />Atualizar dados cadastrais</button>
        <button className="button-secondary" onClick={() => onChangeStatus(!company.isActive)}>{company.isActive ? "Inativar" : "Reativar"}</button>
        <button className="button-primary" onClick={onOpenCharges}>Preparar cobranças</button>
      </div>
    </div>

    {detailError && <Callout tone="error" onDismiss={() => setDetailError(null)}>{detailError}</Callout>}

    <div className="mt-5 flex flex-wrap items-center gap-2">
      <span className={`badge ${company.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{company.isActive ? "Ativa" : "Inativa"}</span>
      <span className="badge bg-slate-100 text-slate-700">{company.memberCount} {company.memberCount === 1 ? "pessoa" : "pessoas"} na última sincronização</span>
      <span className="badge bg-slate-100 text-slate-700">{companyAsaasLabel(company)}</span>
      {company.requiresReviewAfterReappearing && <span className="badge bg-amber-50 text-amber-700"><CircleAlert size={14} />Reapareceu na planilha e continua inativa</span>}
    </div>

    <div className="mt-7 grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <div className="panel p-5">
          <p className="font-extrabold">Dados cadastrais</p>
          <p className="mt-1 text-sm text-slate-500">Vêm do cadastro público de CNPJ e nunca sobrescrevem o nome operacional.</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <CompanyFact label="Nome observado no EVO" value={company.evoName} />
            <CompanyFact label="Razão social" value={company.legalName} />
            <CompanyFact label="Nome fantasia" value={company.tradeName} />
            <CompanyFact label="Situação cadastral" value={company.registrationStatus} />
            <CompanyFact label="Última aparição na planilha" value={company.lastSeenAt ? date(company.lastSeenAt) : null} />
            <CompanyFact label="Última consulta cadastral" value={company.registryLastCheckedAt ? date(company.registryLastCheckedAt) : null} />
          </dl>
          {address && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Endereço cadastral</p>
              <p className="mt-1">{[address.street, address.number, address.complement].filter(Boolean).join(", ")}</p>
              <p>{[address.neighborhood, address.city, address.state].filter(Boolean).join(" · ")} {address.postalCode && `· CEP ${address.postalCode}`}</p>
            </div>
          )}
        </div>

        <div className="panel overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4"><p className="font-extrabold">Pessoas na última sincronização</p><p className="mt-1 text-sm text-slate-500">Retrato da planilha do EVO. Não gera prévia nem cobrança.</p></div>
          <div className="overflow-x-auto"><table className="min-w-[560px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-extrabold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Pessoa</th><th className="px-5 py-3">Contrato</th><th className="px-5 py-3 text-right">Linha</th></tr></thead>
            <tbody>
              {members.map((member) => <tr key={member.evoMemberId} className="border-b border-slate-100 last:border-0"><td className="px-5 py-3.5"><p className="font-bold">{member.memberName}</p><p className="mt-0.5 text-xs text-slate-500">ID EVO {member.evoMemberId}</p></td><td className="px-5 py-3.5 text-slate-600">{member.contracts.join(", ") || "Não informado"}</td><td className="px-5 py-3.5 text-right"><span className={`badge ${member.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{member.isActive ? "Ativo" : "Inativo"}</span></td></tr>)}
              {members.length === 0 && <EmptyTable colSpan={3} message="Esta empresa ainda não apareceu em nenhuma sincronização do catálogo." />}
            </tbody>
          </table></div>
        </div>

        <div className="panel overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4"><p className="font-extrabold">Histórico de faturamentos</p><p className="mt-1 text-sm text-slate-500">Prévias criadas para o CNPJ {company.formattedTaxId}.</p></div>
          <div className="overflow-x-auto"><table className="min-w-[640px] w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs font-extrabold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Criada em</th><th className="px-5 py-3">Situação</th><th className="px-5 py-3">Itens</th><th className="px-5 py-3 text-right">Total</th></tr></thead>
            <tbody>
              {billingHistory.map((entry) => <tr key={entry.billingDraftId} className="border-b border-slate-100 last:border-0"><td className="px-5 py-3.5 font-bold">{date(entry.createdAt)}</td><td className="px-5 py-3.5"><span className={`badge ${statusBadge(entry.status)}`}>{readableStatus(entry.status)}</span></td><td className="px-5 py-3.5 text-slate-600">{entry.itemCount}</td><td className="px-5 py-3.5 text-right font-extrabold">{money(entry.totalAmount)}</td></tr>)}
              {billingHistory.length === 0 && <EmptyTable colSpan={4} message="Nenhuma prévia de faturamento foi criada para esta empresa." />}
            </tbody>
          </table></div>
        </div>
      </div>

      <div className="h-fit space-y-5">
        <aside className="panel p-5">
          <div className="flex items-center gap-2"><Settings2 size={19} className="text-orange" /><p className="font-extrabold">Dados operacionais</p></div>
          <p className="mt-2 text-sm leading-6 text-slate-500">Defina como a empresa aparece no portal e em qual dia ela participa do faturamento mensal.</p>
          <form
            className="mt-5 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              onSave({
                displayName,
                closingDay: closingDay ? Number(closingDay) : null,
              });
            }}
          >
            <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">Nome operacional
              <input className="field mt-1.5 w-full" required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
            </label>
            <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">Dia de fechamento
              <select className="field mt-1.5 w-full" value={closingDay} onChange={(event) => setBillingDay(event.target.value)}>
                <option value="">Sem dia definido</option>
                {closingDays.map((day) => <option key={day} value={day}>Dia {String(day).padStart(2, "0")}</option>)}
              </select>
            </label>
            <button className="button-primary w-full" type="submit"><CheckCircle2 size={17} />Salvar dados</button>
          </form>
          <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">Atualizada em {date(company.updatedAt)} por {company.updatedBy}.</p>
        </aside>

        <aside className="panel overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2"><CreditCard size={19} className="text-orange" /><p className="font-extrabold">Integração com Asaas</p></div>
            <p className="mt-2 text-sm leading-6 text-slate-500">Os clientes são localizados automaticamente pelo CNPJ. Você não precisa copiar identificadores.</p>
          </div>

          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold">Ambiente de teste</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Se não existir, um cliente espelho será criado somente no Sandbox.</p>
              </div>
              <span className={`badge shrink-0 ${company.asaasSandboxCustomerId ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {company.asaasSandboxCustomerId ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
                {company.asaasSandboxCustomerId ? "Vinculado" : "Pendente"}
              </span>
            </div>
            <label className="mt-4 block text-xs font-extrabold uppercase tracking-wide text-slate-500">E-mail controlado para testes
              <input
                className="field mt-1.5 w-full normal-case"
                type="email"
                value={sandboxEmail}
                onChange={(event) => setSandboxEmail(event.target.value)}
              />
            </label>
            <button
              className="button-secondary mt-3 w-full"
              disabled={!sandboxSynchronizationAvailable || isSynchronizingSandbox || !sandboxEmail.trim()}
              onClick={() => void synchronizeSandbox()}
              type="button"
            >
              {isSynchronizingSandbox ? <LoaderCircle className="animate-spin" size={17} /> : <RefreshCw size={17} />}
              {company.asaasSandboxCustomerId ? "Verificar novamente" : "Preparar Sandbox"}
            </button>
            {!sandboxSynchronizationAvailable && <p className="mt-2 text-xs leading-5 text-amber-700">As credenciais Sandbox ainda não estão disponíveis nesta API.</p>}
          </div>

          <div className="border-t border-slate-200 bg-slate-50/70 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold">Cliente real</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">A consulta em Produção é somente leitura. Nada será criado ou alterado no Asaas.</p>
              </div>
              <span className={`badge shrink-0 ${company.asaasProductionCustomerId ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                {company.asaasProductionCustomerId ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
                {company.asaasProductionCustomerId ? "Vinculado" : "Não verificado"}
              </span>
            </div>
            <button
              className="button-secondary mt-4 w-full"
              disabled={!productionSynchronizationAvailable || isSynchronizingProduction}
              onClick={() => void synchronizeProduction()}
              type="button"
            >
              {isSynchronizingProduction ? <LoaderCircle className="animate-spin" size={17} /> : <Search size={17} />}
              Localizar por CNPJ
            </button>
            {!productionSynchronizationAvailable && <p className="mt-2 text-xs leading-5 text-slate-500">Disponível quando a API de produção estiver com a credencial Asaas configurada.</p>}
          </div>
        </aside>
      </div>
    </div>
  </section>;
}

function CompanyFact({ label, value }: { label: string; value: string | null }) {
  return <div><dt className="text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{value ?? "—"}</dd></div>;
}

function CompanyFormPage({ onBack, onCreate }: { onBack: () => void; onCreate: (taxId: string, values: CompanyFormValues) => void }) {
  const [taxId, setTaxId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [closingDay, setBillingDay] = useState("");

  return <section className="max-w-[640px] animate-[fade-in_180ms_ease-out]">
    <button className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-900" onClick={onBack}><ArrowLeft size={16} />Empresas</button>
    <PageHeading title="Adicionar empresa" description="Informe o CNPJ. O cadastro público completa automaticamente os dados disponíveis." />
    <form
      className="panel space-y-3 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        onCreate(taxId, {
          displayName,
          closingDay: closingDay ? Number(closingDay) : null,
        });
      }}
    >
      <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">CNPJ
        <input className="field mt-1.5 w-full" required placeholder="00.000.000/0000-00" value={taxId} onChange={(event) => setTaxId(event.target.value)} />
      </label>
      <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">Nome operacional <span className="normal-case font-semibold text-slate-400">· opcional</span>
        <input className="field mt-1.5 w-full" placeholder="Se vazio, usaremos o nome da BrasilAPI" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
      </label>
      <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">Dia de fechamento
        <select className="field mt-1.5 w-full" value={closingDay} onChange={(event) => setBillingDay(event.target.value)}>
          <option value="">Sem dia definido</option>
          {closingDays.map((day) => <option key={day} value={day}>Dia {String(day).padStart(2, "0")}</option>)}
        </select>
      </label>
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        O CNPJ identifica a empresa no catálogo. Os dados cadastrais e o vínculo com o Asaas são resolvidos automaticamente, sem copiar identificadores.
      </div>
      <button className="button-primary w-full" type="submit"><Plus size={17} />Cadastrar empresa</button>
    </form>
  </section>;
}

function CompanyCatalogImportPage({ onBack, onSynchronized }: {
  onBack: () => void;
  onSynchronized: (message: string) => Promise<void>;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CompanyCatalogImportPreview | null>(null);
  const [result, setResult] = useState<CompanyCatalogImportResult | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [completeSnapshotConfirmed, setCompleteSnapshotConfirmed] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  async function loadPreview(file: File) {
    if (!file.name.toLocaleLowerCase("pt-BR").endsWith(".xlsx")) {
      setImportError("Selecione uma planilha do EVO no formato .xlsx.");
      return;
    }

    setIsWorking(true);
    setImportError(null);
    setResult(null);
    setPreview(null);
    setCompleteSnapshotConfirmed(false);
    try {
      setSelectedFile(file);
      setPreview(await api.previewCompanyCatalogImport(file));
    } catch (error) {
      setPreview(null);
      setImportError(error instanceof Error ? error.message : "Não foi possível conferir a planilha.");
    } finally {
      setIsWorking(false);
    }
  }

  async function synchronize() {
    if (!selectedFile) return;

    setIsWorking(true);
    setImportError(null);
    try {
      const synchronization = await api.synchronizeCompanyCatalog(
        selectedFile,
        operatorId,
        completeSnapshotConfirmed,
      );
      setResult(synchronization);
      await onSynchronized(
        `${synchronization.createdCompanyCount} empresa(s) adicionada(s). `
        + `${synchronization.memberComparison.newMemberCount} colaborador(es) novo(s), `
        + `${synchronization.memberComparison.departedMemberCount} inativado(s).`,
      );
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Não foi possível adicionar as empresas da planilha.");
    } finally {
      setIsWorking(false);
    }
  }

  return <section className="max-w-[1040px] animate-[fade-in_180ms_ease-out]">
    <button className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-slate-900" onClick={onBack}><ArrowLeft size={16} />Empresas</button>
    <PageHeading title="Atualizar empresas e colaboradores" description="Compare a exportação completa de clientes ativos do EVO com a base persistente antes de confirmar." />

    <Callout tone="warning">
      Esta importação não cadastra empresa. Ela apenas vincula colaboradores às empresas já cadastradas, comparando pelo IdCliente do EVO. Um CNPJ fora do catálogo é listado como pendência.
    </Callout>

    {importError && <Callout tone="error" onDismiss={() => setImportError(null)}>{importError}</Callout>}

    <div className="panel overflow-hidden">
      <div className="border-b border-slate-200 px-6 py-5">
        <p className="font-extrabold">Arquivo de origem</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">Selecione a exportação completa de clientes ativos do EVO. O arquivo será analisado antes de qualquer cadastro.</p>
      </div>
      <label
        className={`group m-6 flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center outline-none transition ${
          isDraggingFile
            ? "border-orange bg-orange/5 ring-4 ring-orange/10"
            : selectedFile
              ? "border-emerald-300 bg-emerald-50/40 hover:border-emerald-400"
              : "border-slate-300 bg-slate-50/60 hover:border-orange hover:bg-orange/5"
        }`}
        htmlFor="company-catalog-file"
        onDragEnter={() => setIsDraggingFile(true)}
        onDragLeave={() => setIsDraggingFile(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDraggingFile(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDraggingFile(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void loadPreview(file);
        }}
        tabIndex={0}
      >
        <input
          id="company-catalog-file"
          className="sr-only"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void loadPreview(file);
            event.target.value = "";
          }}
        />

        <span className={`flex h-14 w-14 items-center justify-center rounded-xl ${
          selectedFile ? "bg-emerald-100 text-emerald-700" : "bg-orange/10 text-orange"
        }`}>
          {isWorking
            ? <LoaderCircle className="animate-spin" size={26} />
            : selectedFile
              ? <CheckCircle2 size={26} />
              : <UploadCloud size={27} />}
        </span>

        {selectedFile ? (
          <>
            <p className="mt-4 max-w-full truncate text-base font-extrabold text-slate-900">{selectedFile.name}</p>
            <p className="mt-1 text-sm text-slate-500">{fileSize(selectedFile.size)} · arquivo selecionado</p>
            <span className="button-secondary mt-5 pointer-events-none">
              <FileSpreadsheet size={17} />Trocar planilha
            </span>
          </>
        ) : (
          <>
            <p className="mt-4 text-base font-extrabold text-slate-900">Arraste a planilha do EVO para cá</p>
            <p className="mt-1 text-sm text-slate-500">ou escolha o arquivo no seu computador</p>
            <span className="button-primary mt-5 pointer-events-none">
              <FileSpreadsheet size={17} />Escolher planilha
            </span>
            <p className="mt-3 text-xs font-semibold text-slate-400">Somente .xlsx</p>
          </>
        )}
      </label>
      {isWorking && <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-sm font-bold text-slate-600"><span className="inline-flex items-center gap-2"><LoaderCircle className="animate-spin text-orange" size={17} />Lendo empresas, CNPJs e pessoas...</span></div>}
    </div>

    {preview && (
      <>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <ImportMetric label="Novas empresas" value={preview.newCompanyCount.toString()} />
          <ImportMetric label="Já cadastradas" value={preview.existingCompanyCount.toString()} />
          <ImportMetric label="Pessoas encontradas" value={preview.discoveredMemberCount.toString()} />
          <ImportMetric label="CNPJs inválidos" value={preview.invalidTaxIdCount.toString()} />
          <ImportMetric label="Avisos" value={preview.warnings.length.toString()} />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <ImportMetric label="Colaboradores novos" value={preview.memberComparison.newMemberCount.toString()} />
          <ImportMetric label="Permanecem ativos" value={preview.memberComparison.retainedMemberCount.toString()} />
          <ImportMetric label="Saíram" value={preview.memberComparison.departedMemberCount.toString()} />
          <ImportMetric label="Reativados" value={preview.memberComparison.reactivatedMemberCount.toString()} />
          <ImportMetric label="Conflitos" value={preview.memberComparison.conflictMemberCount.toString()} />
        </div>

        <div className="panel mt-5 overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4"><p className="font-extrabold">Resultado da análise</p><p className="mt-1 text-sm text-slate-500">{preview.analyzedRowCount} linhas analisadas em {preview.fileName}. Somente as empresas marcadas como novas serão cadastradas.</p></div>
          <div className="max-h-[420px] overflow-auto"><table className="min-w-[640px] w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-slate-200 bg-white text-xs font-extrabold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Empresa no EVO</th><th className="px-5 py-3">CNPJ</th><th className="px-5 py-3">Ação</th><th className="px-5 py-3 text-right">Pessoas</th></tr></thead>
            <tbody>
              {preview.companies.map((company) => <tr key={company.taxId} className={`border-b border-slate-100 last:border-0 ${company.isAlreadyRegistered ? "bg-slate-50/70 text-slate-500" : ""}`}><td className="px-5 py-3.5 font-bold">{company.evoName}</td><td className="px-5 py-3.5">{company.formattedTaxId}</td><td className="px-5 py-3.5"><span className={`badge ${company.isAlreadyRegistered ? "bg-slate-200 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>{company.isAlreadyRegistered ? "Ignorar" : "Cadastrar"}</span></td><td className="px-5 py-3.5 text-right">{company.memberCount}</td></tr>)}
              {preview.companies.length === 0 && <EmptyTable colSpan={4} message="Nenhuma empresa com CNPJ válido foi encontrada nesta planilha." />}
            </tbody>
          </table></div>
        </div>

        {preview.warnings.length > 0 && (
          <div className="panel mt-5 p-5">
            <p className="font-extrabold">Avisos</p>
            <p className="mt-1 text-sm text-slate-500">Linhas que não geraram empresa. Nenhum cadastro é inventado a partir delas.</p>
            <ul className="mt-3 max-h-56 space-y-1.5 overflow-auto text-sm text-slate-600">
              {preview.warnings.slice(0, 100).map((warning, warningIndex) => (
                <li key={`${warning.code}-${warning.sourceRowNumber}-${warningIndex}`} className="rounded bg-slate-50 px-3 py-2">
                  {warning.sourceRowNumber ? `Linha ${warning.sourceRowNumber}: ` : ""}{warning.message}
                </li>
              ))}
            </ul>
            {preview.warnings.length > 100 && <p className="mt-2 text-xs text-slate-500">Mostrando os 100 primeiros de {preview.warnings.length} avisos.</p>}
          </div>
        )}

        <div className="panel mt-5 flex flex-col gap-5 p-5">
          <div>
            <p className="font-extrabold">Confirmar atualização do CRM</p>
            <p className="mt-1 text-sm text-slate-500">Serão adicionadas {preview.newCompanyCount} empresa(s). Os colaboradores ausentes nesta exportação serão inativados, sem apagar histórico.</p>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            <input
              className="mt-1 h-4 w-4 accent-orange"
              type="checkbox"
              checked={completeSnapshotConfirmed}
              onChange={(event) => setCompleteSnapshotConfirmed(event.target.checked)}
            />
            <span><strong>Confirmo que esta é a exportação completa de clientes ativos do EVO.</strong><br />Um arquivo filtrado ou parcial poderia marcar colaboradores ausentes como inativos.</span>
          </label>
          <div className="flex justify-end">
            <button className="button-primary shrink-0" disabled={isWorking || !completeSnapshotConfirmed || preview.memberComparison.conflictMemberCount > 0} onClick={() => void synchronize()}><CheckCircle2 size={17} />Atualizar base</button>
          </div>
          {preview.memberComparison.conflictMemberCount > 0 && <p className="text-sm font-semibold text-red-700">Resolva os conflitos de empresa antes de aplicar esta atualização. Nenhum colaborador será movido automaticamente.</p>}
        </div>
      </>
    )}

    {result && (
      <div className="panel mt-5 p-5">
        <p className="font-extrabold">Inclusão concluída</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <ImportMetric label="Adicionadas" value={result.createdCompanyCount.toString()} />
          <ImportMetric label="Já existentes e ignoradas" value={result.ignoredExistingCompanyCount.toString()} />
          <ImportMetric label="Cadastro enriquecido" value={result.registryEnrichedCount.toString()} />
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Colaboradores: {result.memberComparison.newMemberCount} novo(s), {result.memberComparison.retainedMemberCount} mantido(s), {result.memberComparison.departedMemberCount} inativado(s) e {result.memberComparison.reactivatedMemberCount} reativado(s).
        </p>
        {result.registryUnavailableCount > 0 && (
          <p className="mt-3 text-sm text-slate-500">{result.registryUnavailableCount} empresa(s) ficaram sem dados do cadastro público. O catálogo continua funcionando com o nome do EVO.</p>
        )}
      </div>
    )}
  </section>;
}

function BatchCard({ batch, chargeCreationEnabled, onApprove, onExecute }: {
  batch: ChargeBatch;
  chargeCreationEnabled: boolean;
  onApprove: () => void;
  onExecute: () => void;
}) {
  const createdItems = batch.items.filter((item) => item.created).length;
  const failedItems = batch.items.filter((item) => item.status === "Failed").length;
  // O boleto emitido precisa ser alcançável pelo portal. Sem isso, conferir a
  // emissão depende de o e-mail do Asaas chegar, e uma falha de entrega vira
  // uma emissão que ninguém consegue verificar.
  const resolvedItems = batch.items.filter((item) => item.bankSlipUrl || item.error);
  return <article className="panel p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-extrabold">Lote de {date(batch.dueDate)}</p><p className="mt-1 text-xs font-semibold text-slate-500">{batch.items.length} prévia(s) · criado em {date(batch.createdAt)}</p></div><span className={`badge ${statusBadge(batch.status)}`}>{readableStatus(batch.status)}</span></div><div className="mt-5 grid grid-cols-3 gap-2 text-center"><SmallMetric label="Itens" value={batch.items.length.toString()} /><SmallMetric label="Criadas" value={createdItems.toString()} /><SmallMetric label="Falhas" value={failedItems.toString()} /></div>
    {resolvedItems.length > 0 && (
      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
        <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Cobranças emitidas</p>
        {resolvedItems.map((item) => (
          <div key={item.billingDraftId} className="rounded-lg bg-slate-50 p-3">
            {item.bankSlipUrl ? (
              <>
                <a
                  className="inline-flex items-center gap-1.5 text-sm font-extrabold text-orange hover:underline"
                  href={item.bankSlipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText size={15} />Abrir boleto
                </a>
                {item.asaasPaymentId && <p className="mt-1 text-xs text-slate-500">{item.asaasPaymentId}</p>}
              </>
            ) : (
              <p className="text-xs font-semibold text-red-700">{item.error}</p>
            )}
          </div>
        ))}
      </div>
    )}
    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-xs font-bold text-slate-500">{batch.asaasEnvironment}</span>{batch.status === "AwaitingApproval" && <button className="button-secondary h-9" onClick={onApprove}>Aprovar</button>}{batch.status === "Approved" && (chargeCreationEnabled ? <button className="button-primary h-9" onClick={onExecute}>Executar</button> : <span className="text-xs font-bold text-amber-700">Emissão bloqueada</span>)}{batch.status !== "AwaitingApproval" && batch.status !== "Approved" && <span className="text-xs text-slate-500">{batch.approvedBy ? `Aprovado por ${batch.approvedBy}` : ""}</span>}</div></article>;
}

function IntegrationCard({ icon: Icon, title, description, configured, label }: { icon: typeof Database; title: string; description: string; configured: boolean; label: string }) {
  return <article className="panel p-5"><div className="flex items-start justify-between"><div className={`flex h-10 w-10 items-center justify-center rounded-lg ${configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}><Icon size={20} /></div><span className={`badge ${configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{configured ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}{label}</span></div><p className="mt-5 font-extrabold">{title}</p><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></article>;
}

function IntegrationsPage({ status, activeCatalogCompanyCount, latestImport, onOpenCatalog, onImportCatalog }: {
  status: IntegrationStatus | null;
  activeCatalogCompanyCount: number;
  latestImport: CompanyCatalogImportSummary | null;
  onOpenCatalog: () => void;
  onImportCatalog: () => void;
}) {
  if (!status) return <div className="panel p-6 text-sm text-slate-500">Não foi possível obter o estado das integrações.</div>;

  return <section>
    <PageHeading title="Integrações" description="Acompanhe as conexões e mantenha o catálogo de empresas pronto para o faturamento." />
    <div className="grid gap-5 lg:grid-cols-2">
      <IntegrationCard
        icon={Database}
        title="Evo"
        description={status.evoMessage}
        configured={status.evoIsConfigured}
        label={status.evoIsConfigured ? "Conectado" : "Aguardando credenciais"}
      />
      <IntegrationCard
        icon={CreditCard}
        title="Asaas · Sandbox"
        description="Consulta de clientes e emissão segura de cobranças de teste."
        configured={status.sandbox.isConfigured && status.sandbox.readOperationsEnabled}
        label={status.sandbox.chargeCreationEnabled ? "Criação de teste habilitada" : "Somente consulta"}
      />
      <IntegrationCard
        icon={ShieldCheck}
        title="Asaas · Produção"
        description={status.production.chargeCreationEnabled
          ? "Consultas e emissão de cobranças reais estão habilitadas."
          : "Clientes reais podem ser consultados e sincronizados. A emissão de cobranças reais permanece bloqueada."}
        configured={status.production.isConfigured && status.production.readOperationsEnabled}
        label={status.production.chargeCreationEnabled
          ? "Criação habilitada"
          : status.production.readOperationsEnabled
            ? "Consulta habilitada"
            : "Não configurado"}
      />
      <IntegrationCard
        icon={Building2}
        title="Cadastro público de CNPJ"
        description="A BrasilAPI enriquece razão social, situação e endereço. O catálogo continua funcionando com o nome do EVO quando ela falha."
        configured
        label="Enriquecimento opcional"
      />
    </div>

    <div className="panel mt-5 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-extrabold">Catálogo de empresas</p>
          <p className="mt-1 text-sm text-slate-500">
            {latestImport
              ? `Última inclusão em lote em ${date(latestImport.synchronizedAt)} por ${latestImport.operatorId}, a partir de ${latestImport.fileName}.`
              : "O catálogo é permanente. Cadastre empresas individualmente ou use uma planilha para adicionar várias de uma vez."}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button className="button-secondary" onClick={onOpenCatalog}><Building2 size={17} />Abrir catálogo</button>
          <button className="button-secondary" onClick={onImportCatalog}><FileSpreadsheet size={17} />Adicionar em lote</button>
        </div>
      </div>
      {latestImport && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SmallMetric label="Empresas encontradas" value={latestImport.discoveredCompanyCount.toString()} />
          <SmallMetric label="Adicionadas" value={latestImport.createdCompanyCount.toString()} />
          <SmallMetric label="Já existentes" value={latestImport.ignoredExistingCompanyCount.toString()} />
          <SmallMetric label="Avisos" value={latestImport.warningCount.toString()} />
        </div>
      )}
      <p className="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-500">{activeCatalogCompanyCount} empresa(s) ativa(s) no catálogo.</p>
    </div>
  </section>;
}

function EnvironmentSwitchModal({ currentEnvironment, targetEnvironment, onCancel, onConfirm }: {
  currentEnvironment: AsaasEnvironment;
  targetEnvironment: AsaasEnvironment;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isEnteringProduction = targetEnvironment === "Production";
  const targetDescription = isEnteringProduction
    ? "Você passará a consultar dados reais do Asaas. Uma execução posterior de lote poderá criar cobranças reais, sempre após aprovação e confirmação explícita."
    : "Você voltará ao ambiente de testes. As cobranças criadas nele não afetam clientes reais.";

  return <div aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px]" role="dialog">
    <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
      <div className={`border-b px-6 py-5 ${isEnteringProduction ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={`text-xs font-extrabold uppercase tracking-[0.16em] ${isEnteringProduction ? "text-red-700" : "text-amber-700"}`}>Troca de ambiente</p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-950">Mudar para {targetEnvironment}?</h2>
          </div>
          <button aria-label="Cancelar troca de ambiente" className="rounded-lg p-2 text-slate-500 transition hover:bg-white/70 hover:text-slate-900" onClick={onCancel}><X size={19} /></button>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Atual</p><p className="mt-1 font-extrabold text-slate-900">{currentEnvironment}</p></div>
          <ChevronRight className="text-orange" size={22} />
          <div className={`rounded-xl border px-4 py-3 ${isEnteringProduction ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}><p className={`text-xs font-extrabold uppercase tracking-wide ${isEnteringProduction ? "text-red-700" : "text-amber-700"}`}>Destino</p><p className="mt-1 font-extrabold text-slate-900">{targetEnvironment}</p></div>
        </div>
        <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${isEnteringProduction ? "border-red-200 bg-red-50 text-red-950" : "border-amber-200 bg-amber-50 text-amber-950"}`}>
          <p className="font-extrabold">{isEnteringProduction ? "Atenção ao ambiente real" : "Ambiente seguro para testes"}</p>
          <p className="mt-1">{targetDescription}</p>
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-500">Apenas trocar o ambiente não cria nenhuma cobrança.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button className="button-secondary" onClick={onCancel}>Manter {currentEnvironment}</button>
          <button className={isEnteringProduction ? "inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-300" : "button-primary"} onClick={onConfirm}>Entrar em {targetEnvironment}</button>
        </div>
      </div>
    </div>
  </div>;
}

function ConfirmationModal({ batch, confirmationText, environment, onCancel, onConfirmationTextChange, onConfirm }: { batch: ChargeBatch; confirmationText: string; environment: AsaasEnvironment; onCancel: () => void; onConfirmationTextChange: (value: string) => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-lg font-extrabold">Confirmar execução</p><p className="mt-1 text-sm text-slate-500">Esta ação cria cobranças no Asaas.</p></div><button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" onClick={onCancel}><X size={19} /></button></div><div className={`mt-5 rounded-xl p-4 ${environment === "Production" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}><p className="text-sm font-extrabold">{environment} · lote de {date(batch.dueDate)}</p><p className="mt-1 text-sm">{batch.items.length} cobrança(s) serão processadas.</p></div><label className="mt-5 block text-sm font-bold">Digite <span className="font-extrabold">CONFIRMAR</span> para continuar<input autoFocus className="field mt-2 w-full" value={confirmationText} onChange={(event) => onConfirmationTextChange(event.target.value)} /></label><div className="mt-6 flex justify-end gap-2"><button className="button-secondary" onClick={onCancel}>Cancelar</button><button className="button-primary" disabled={confirmationText.trim() !== "CONFIRMAR"} onClick={onConfirm}>Executar lote</button></div></div></div>;
}

function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="text-2xl font-extrabold tracking-tight">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>{action}</div>;
}
function SmallMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-2.5"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-sm font-extrabold">{value}</p></div>; }
function EmptyTable({ colSpan, message }: { colSpan: number; message: string }) { return <tr><td className="px-5 py-12 text-center text-sm text-slate-500" colSpan={colSpan}>{message}</td></tr>; }
function Callout({ children, onDismiss, tone }: { children: React.ReactNode; onDismiss?: () => void; tone: "error" | "success" | "warning" }) { const styles = tone === "error" ? "border-red-200 bg-red-50 text-red-800" : tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"; return <div className={`mb-5 flex items-start gap-3 rounded-xl border p-4 text-sm ${styles}`}><CircleAlert className="mt-0.5 shrink-0" size={17} /><p className="flex-1">{children}</p>{onDismiss && <button aria-label="Fechar aviso" onClick={onDismiss}><X size={17} /></button>}</div>; }
function LoadingScreen() { return <main className="flex min-h-screen items-center justify-center bg-[#f5f6f8]"><div className="flex items-center gap-3 text-sm font-bold text-slate-500"><LoaderCircle className="animate-spin text-orange" size={22} />Conectando às integrações...</div></main>; }
