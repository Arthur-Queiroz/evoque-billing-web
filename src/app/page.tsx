"use client";

import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleDollarSign,
  CreditCard,
  Database,
  FileText,
  LayoutDashboard,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  UsersRound,
  Wifi,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  api,
  AsaasEnvironment,
  BillingDraft,
  BillingPeriod,
  ChargeBatch,
  CompanySchedule,
  EvoCompany,
  EvoMember,
  IntegrationStatus,
} from "@/lib/api";

type Page = "overview" | "members" | "companies" | "charges" | "integrations";

const operatorId = "operador-web";
const billingDays = [2, 18, 20, 25];

function money(value: number | null | undefined): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);
}

function date(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
    .format(new Date(year, month - 1, 1))
    .replace(/^./, (letter) => letter.toUpperCase());
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
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [members, setMembers] = useState<EvoMember[]>([]);
  const [companies, setCompanies] = useState<EvoCompany[]>([]);
  const [schedules, setSchedules] = useState<CompanySchedule[]>([]);
  const [billingPeriods, setBillingPeriods] = useState<BillingPeriod[]>([]);
  const [drafts, setDrafts] = useState<BillingDraft[]>([]);
  const [batches, setBatches] = useState<ChargeBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [scheduleCompanyId, setScheduleCompanyId] = useState("");
  const [scheduleDay, setScheduleDay] = useState("20");
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [confirmationBatch, setConfirmationBatch] = useState<ChargeBatch | null>(null);
  const [confirmationText, setConfirmationText] = useState("");

  const selectedPeriod = useMemo(
    () => billingPeriods.find((period) => period.year === selectedYear && period.month === selectedMonth) ?? null,
    [billingPeriods, selectedMonth, selectedYear],
  );

  const selectedEnvironmentStatus = environment === "Sandbox" ? integrationStatus?.sandbox : integrationStatus?.production;
  const productionReady = integrationStatus?.production.isConfigured && integrationStatus.production.chargeCreationEnabled;
  const visibleMembers = useMemo(() => {
    const normalizedSearch = memberSearch.trim().toLocaleLowerCase("pt-BR");
    if (!normalizedSearch) return members;
    return members.filter((member) => `${member.firstName} ${member.lastName ?? ""} ${member.branchName}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch));
  }, [memberSearch, members]);
  const visibleCompanies = useMemo(() => {
    const normalizedSearch = companySearch.trim().toLocaleLowerCase("pt-BR");
    if (!normalizedSearch) return companies;
    return companies.filter((company) => `${company.corporateName} ${company.taxId ?? ""}`.toLocaleLowerCase("pt-BR").includes(normalizedSearch));
  }, [companies, companySearch]);

  async function refreshData(showLoading = false) {
    if (showLoading) setIsLoading(true);
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      const [status, memberData, companyData, scheduleData, periodData] = await Promise.all([
        api.getIntegrationStatus(),
        api.getMembers(),
        api.getCompanies(),
        api.getCompanySchedules(),
        api.getBillingPeriods(),
      ]);
      setIntegrationStatus(status);
      setMembers(memberData.members);
      setCompanies(companyData.companies);
      setSchedules(scheduleData);
      setBillingPeriods(periodData);
      await refreshBillingData(selectedYear, selectedMonth);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível consultar a API.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
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
      if (!message.includes("não foi encontrada")) setErrorMessage(message);
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

  function selectEnvironment(targetEnvironment: AsaasEnvironment) {
    if (targetEnvironment === "Production" && !productionReady) {
      setNoticeMessage("Produção permanece bloqueada: a API ainda não recebeu uma credencial de produção com criação de cobranças habilitada.");
      return;
    }
    setEnvironment(targetEnvironment);
  }

  async function createSelectedPeriod() {
    try {
      await api.createBillingPeriod(selectedYear, selectedMonth, operatorId);
      setNoticeMessage(`Competência ${monthLabel(selectedYear, selectedMonth)} criada.`);
      await refreshData();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível criar a competência.");
    }
  }

  async function saveSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!scheduleCompanyId.trim()) {
      setErrorMessage("Informe o identificador externo da empresa no Evo.");
      return;
    }
    try {
      await api.saveCompanySchedule(scheduleCompanyId.trim(), Number(scheduleDay), operatorId);
      setScheduleCompanyId("");
      setNoticeMessage("Dia de cobrança salvo.");
      setSchedules(await api.getCompanySchedules());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível salvar o dia de cobrança.");
    }
  }

  async function createBatchPreview(scheduled: boolean) {
    const dueDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(Number(scheduleDay)).padStart(2, "0")}`;
    try {
      if (scheduled) {
        await api.createScheduledChargeBatchPreview(selectedYear, selectedMonth, dueDate, environment, operatorId);
      } else {
        if (selectedDraftIds.length === 0) {
          setErrorMessage("Selecione ao menos uma prévia aprovada.");
          return;
        }
        await api.createChargeBatchPreview(selectedDraftIds, dueDate, environment, operatorId);
      }
      setNoticeMessage("Prévia criada. Nenhuma cobrança foi enviada ao Asaas.");
      await refreshBillingData(selectedYear, selectedMonth);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível criar a prévia do lote.");
    }
  }

  async function approveBatch(chargeBatch: ChargeBatch) {
    try {
      await api.approveChargeBatch(chargeBatch.id, operatorId);
      setNoticeMessage("Lote aprovado. A execução ainda exige confirmação explícita.");
      await refreshBillingData(selectedYear, selectedMonth);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível aprovar o lote.");
    }
  }

  async function executeBatch() {
    if (!confirmationBatch || confirmationText.trim() !== "CONFIRMAR") return;
    try {
      await api.executeChargeBatch(confirmationBatch.id, operatorId);
      setConfirmationBatch(null);
      setConfirmationText("");
      setNoticeMessage(`Lote executado no ambiente ${environment}.`);
      await refreshBillingData(selectedYear, selectedMonth);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível executar o lote.");
    }
  }

  const currentSchedule = schedules.find((schedule) => schedule.externalCompanyId === scheduleCompanyId);
  const activeDrafts = drafts.filter((draft) => draft.status === "Approved");
  const totalMemberValue = members.reduce(
    (total, member) => total + member.memberships.reduce((membershipTotal, membership) => membershipTotal + (membership.nextMonthValue ?? membership.nextChargeValue ?? 0), 0),
    0,
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen bg-[#f5f6f8] text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar currentPage={page} environment={environment} onNavigate={setPage} />
        <div className="min-w-0 flex-1">
          <Header
            environment={environment}
            isRefreshing={isRefreshing}
            month={selectedMonth}
            productionReady={Boolean(productionReady)}
            year={selectedYear}
            onEnvironmentChange={selectEnvironment}
            onMonthChange={setSelectedMonth}
            onRefresh={() => void refreshData()}
            onYearChange={setSelectedYear}
          />
          <div className="mx-auto max-w-[1440px] px-5 py-7 lg:px-8">
            {errorMessage && <Callout tone="error" onDismiss={() => setErrorMessage(null)}>{errorMessage}</Callout>}
            {noticeMessage && <Callout tone="success" onDismiss={() => setNoticeMessage(null)}>{noticeMessage}</Callout>}
            {!selectedEnvironmentStatus?.isConfigured && (
              <Callout tone="warning">
                O ambiente {environment} não possui credenciais configuradas na API. A interface continuará em modo de consulta.
              </Callout>
            )}

            {page === "overview" && (
              <Overview
                activeDrafts={activeDrafts.length}
                companies={companies.length}
                environment={environment}
                memberValue={totalMemberValue}
                members={members.length}
                periodExists={Boolean(selectedPeriod)}
                selectedYear={selectedYear}
                selectedMonth={selectedMonth}
                onCreatePeriod={() => void createSelectedPeriod()}
                onNavigate={setPage}
              />
            )}
            {page === "members" && <MembersPage members={visibleMembers} search={memberSearch} onSearchChange={setMemberSearch} />}
            {page === "companies" && (
              <CompaniesPage
                companies={visibleCompanies}
                currentSchedule={currentSchedule}
                schedules={schedules}
                scheduleCompanyId={scheduleCompanyId}
                scheduleDay={scheduleDay}
                search={companySearch}
                onScheduleCompanyIdChange={setScheduleCompanyId}
                onScheduleDayChange={setScheduleDay}
                onSearchChange={setCompanySearch}
                onSubmitSchedule={saveSchedule}
              />
            )}
            {page === "charges" && (
              <ChargesPage
                batches={batches}
                drafts={drafts}
                environment={environment}
                hasPeriod={Boolean(selectedPeriod)}
                scheduleDay={scheduleDay}
                selectedDraftIds={selectedDraftIds}
                totalDraftValue={getDraftTotal(activeDrafts)}
                onApprove={(batch) => void approveBatch(batch)}
                onCreatePeriod={() => void createSelectedPeriod()}
                onCreatePreview={(scheduled) => void createBatchPreview(scheduled)}
                onExecute={(batch) => setConfirmationBatch(batch)}
                onScheduleDayChange={setScheduleDay}
                onToggleDraft={(draftId) => setSelectedDraftIds((currentIds) => currentIds.includes(draftId) ? currentIds.filter((id) => id !== draftId) : [...currentIds, draftId])}
              />
            )}
            {page === "integrations" && <IntegrationsPage status={integrationStatus} />}
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
    </main>
  );
}

function Sidebar({ currentPage, environment, onNavigate }: { currentPage: Page; environment: AsaasEnvironment; onNavigate: (page: Page) => void }) {
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
          const isActive = currentPage === item.page;
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
        <p className="mt-1 text-[11px] leading-4 text-zinc-400">{environment === "Sandbox" ? "Ambiente de testes — cobranças não são reais." : "Ambiente autorizado para cobranças reais."}</p>
      </div>
    </aside>
  );
}

function Header({ environment, isRefreshing, month, productionReady, year, onEnvironmentChange, onMonthChange, onRefresh, onYearChange }: {
  environment: AsaasEnvironment; isRefreshing: boolean; month: number; productionReady: boolean; year: number;
  onEnvironmentChange: (environment: AsaasEnvironment) => void; onMonthChange: (month: number) => void; onRefresh: () => void; onYearChange: (year: number) => void;
}) {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white px-5 lg:px-8">
      <p className="hidden text-sm font-extrabold sm:block">Evoque Cobranças</p>
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <select aria-label="Competência" className="field hidden w-44 sm:block" value={`${year}-${month}`} onChange={(event) => { const [nextYear, nextMonth] = event.target.value.split("-").map(Number); onYearChange(nextYear); onMonthChange(nextMonth); }}>
          {[-1, 0, 1, 2].map((yearOffset) => {
            const optionDate = new Date(year, month - 1 + yearOffset, 1);
            return <option key={optionDate.toISOString()} value={`${optionDate.getFullYear()}-${optionDate.getMonth() + 1}`}>{monthLabel(optionDate.getFullYear(), optionDate.getMonth() + 1)}</option>;
          })}
        </select>
        <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-extrabold">
          <button className={`rounded-md px-3 py-2 transition ${environment === "Sandbox" ? "bg-white text-charcoal shadow-sm" : "text-slate-500"}`} onClick={() => onEnvironmentChange("Sandbox")}>Sandbox</button>
          <button aria-disabled={!productionReady} className={`rounded-md px-3 py-2 transition ${environment === "Production" ? "bg-charcoal text-white shadow-sm" : "text-slate-500"} ${!productionReady ? "cursor-not-allowed opacity-55" : ""}`} onClick={() => onEnvironmentChange("Production")}>Produção</button>
        </div>
        <button aria-label="Atualizar dados" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" onClick={onRefresh}>
          <RefreshCw className={isRefreshing ? "animate-spin" : ""} size={18} />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-charcoal text-xs font-extrabold text-white">OP</div>
      </div>
    </header>
  );
}

function Overview({ activeDrafts, companies, environment, memberValue, members, periodExists, selectedYear, selectedMonth, onCreatePeriod, onNavigate }: {
  activeDrafts: number; companies: number; environment: AsaasEnvironment; memberValue: number; members: number; periodExists: boolean; selectedYear: number; selectedMonth: number; onCreatePeriod: () => void; onNavigate: (page: Page) => void;
}) {
  return <section className="animate-[fade-in_180ms_ease-out]">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-2xl font-extrabold tracking-tight">Visão geral</p><p className="mt-1 text-sm text-slate-500">Consulte dados do Evo e prepare cobranças no Asaas.</p></div>
      {!periodExists && <button className="button-primary" onClick={onCreatePeriod}><Plus size={17} />Criar competência</button>}
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={UsersRound} label="Pessoas no Evo" value={members.toString()} />
      <MetricCard icon={Building2} label="Empresas no Evo" value={companies.toString()} />
      <MetricCard icon={FileText} label="Prévias aprovadas" value={activeDrafts.toString()} tone="amber" />
      <MetricCard icon={CircleDollarSign} label="Valor nas matrículas" value={money(memberValue)} tone="orange" />
    </div>
    <div className="mt-7 grid gap-5 xl:grid-cols-[1.35fr_0.8fr]">
      <div className="panel p-5"><p className="text-base font-extrabold">O que você quer fazer?</p><p className="mt-1 text-sm text-slate-500">Fluxo seguro para a competência {monthLabel(selectedYear, selectedMonth)}.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <ActionCard icon={UsersRound} title="Colaboradores" description="Consultar matrículas e valores vindos do Evo." onClick={() => onNavigate("members")} />
          <ActionCard icon={Building2} title="Configurar empresas" description="Definir dia de cobrança por empresa vinculada." onClick={() => onNavigate("companies")} />
          <ActionCard dark icon={CalendarDays} title="Faturamento do dia" description="Criar uma prévia de lote para 02, 18, 20 ou 25." onClick={() => onNavigate("charges")} />
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

function CompaniesPage({ companies, currentSchedule, schedules, scheduleCompanyId, scheduleDay, search, onScheduleCompanyIdChange, onScheduleDayChange, onSearchChange, onSubmitSchedule }: {
  companies: EvoCompany[]; currentSchedule: CompanySchedule | undefined; schedules: CompanySchedule[]; scheduleCompanyId: string; scheduleDay: string; search: string;
  onScheduleCompanyIdChange: (value: string) => void; onScheduleDayChange: (value: string) => void; onSearchChange: (value: string) => void; onSubmitSchedule: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return <section><PageHeading title="Empresas" description="Empresas devolvidas pelo módulo Partnership do Evo e seus dias de cobrança." />
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]"><div><div className="mb-4 flex max-w-md items-center gap-2"><Search className="absolute ml-3 text-slate-400" size={17} /><input className="field w-full pl-10" placeholder="Buscar empresa ou CNPJ" value={search} onChange={(event) => onSearchChange(event.target.value)} /></div>
      <div className="panel overflow-hidden"><div className="overflow-x-auto"><table className="min-w-[700px] w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Empresa</th><th className="px-5 py-3">CNPJ</th><th className="px-5 py-3">Dia</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{companies.map((company) => { const companySchedule = schedules.find((schedule) => schedule.externalCompanyId === String(company.id)); return <tr key={company.id} className="border-b border-slate-100"><td className="px-5 py-4 font-bold">{company.corporateName}<p className="mt-0.5 text-xs font-medium text-slate-500">ID Evo {company.id}</p></td><td className="px-5 py-4 text-slate-600">{company.taxId ?? "Não informado"}</td><td className="px-5 py-4 font-extrabold">{companySchedule ? `Dia ${String(companySchedule.billingDay).padStart(2, "0")}` : "Não definido"}</td><td className="px-5 py-4"><span className={`badge ${company.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{company.isActive ? "Ativa" : "Inativa"}</span></td></tr>; })}{companies.length === 0 && <EmptyTable colSpan={4} message="O Evo não retornou empresas pelo endpoint Partnership. Cadastre o identificador externo apenas quando o vínculo estiver confirmado." />}</tbody></table></div></div></div>
      <aside className="panel h-fit p-5"><div className="flex items-center gap-2"><CalendarDays size={19} className="text-orange" /><p className="font-extrabold">Dia de cobrança</p></div><p className="mt-2 text-sm leading-6 text-slate-500">A agenda é persistida no produto. Ela não altera nenhum dado no Evo.</p><form className="mt-5 space-y-3" onSubmit={onSubmitSchedule}><label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">ID externo da empresa<input className="field mt-1.5 w-full" placeholder="Ex.: ID da empresa no Evo" value={scheduleCompanyId} onChange={(event) => onScheduleCompanyIdChange(event.target.value)} /></label><label className="block text-xs font-extrabold uppercase tracking-wide text-slate-500">Dia mensal<select className="field mt-1.5 w-full" value={scheduleDay} onChange={(event) => onScheduleDayChange(event.target.value)}>{billingDays.map((day) => <option key={day} value={day}>{String(day).padStart(2, "0")}</option>)}</select></label>{currentSchedule && <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">Agenda atual: dia {String(currentSchedule.billingDay).padStart(2, "0")}, atualizada em {date(currentSchedule.updatedAt)}.</p>}<button className="button-primary w-full" type="submit"><CheckCircle2 size={17} />Salvar agenda</button></form></aside>
    </div></section>;
}

function ChargesPage({ batches, drafts, environment, hasPeriod, scheduleDay, selectedDraftIds, totalDraftValue, onApprove, onCreatePeriod, onCreatePreview, onExecute, onScheduleDayChange, onToggleDraft }: {
  batches: ChargeBatch[]; drafts: BillingDraft[]; environment: AsaasEnvironment; hasPeriod: boolean; scheduleDay: string; selectedDraftIds: string[]; totalDraftValue: number;
  onApprove: (batch: ChargeBatch) => void; onCreatePeriod: () => void; onCreatePreview: (scheduled: boolean) => void; onExecute: (batch: ChargeBatch) => void; onScheduleDayChange: (day: string) => void; onToggleDraft: (draftId: string) => void;
}) {
  const approvedDrafts = drafts.filter((draft) => draft.status === "Approved");
  return <section><PageHeading title="Cobranças" description="Prévia, aprovação e execução de cobranças por empresa ou por ciclo." />
    {!hasPeriod ? <div className="panel p-8 text-center"><CalendarDays className="mx-auto text-slate-400" size={28} /><p className="mt-3 font-extrabold">Crie a competência antes de faturar</p><p className="mt-1 text-sm text-slate-500">As prévias e lotes são sempre vinculados a uma competência.</p><button className="button-primary mt-5" onClick={onCreatePeriod}>Criar competência</button></div> : <>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]"><div className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-slate-200 p-5"><div><p className="font-extrabold">Prévias aprovadas</p><p className="mt-1 text-sm text-slate-500">Selecione empresas para gerar um lote individual.</p></div><span className="text-sm font-extrabold">{selectedDraftIds.length} selecionada(s)</span></div><div className="overflow-x-auto"><table className="min-w-[720px] w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs font-extrabold uppercase tracking-wide text-slate-500"><tr><th className="w-12 px-5 py-3"></th><th className="px-5 py-3">Empresa</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Valor</th></tr></thead><tbody>{drafts.map((draft) => { const enabled = draft.status === "Approved"; return <tr key={draft.id} className="border-b border-slate-100 last:border-0"><td className="px-5 py-4"><input aria-label={`Selecionar ${draft.companyName}`} checked={selectedDraftIds.includes(draft.id)} disabled={!enabled} type="checkbox" onChange={() => onToggleDraft(draft.id)} /></td><td className="px-5 py-4"><p className="font-bold">{draft.companyName}</p><p className="mt-0.5 text-xs text-slate-500">{draft.companyTaxId}</p></td><td className="px-5 py-4"><span className={`badge ${statusBadge(draft.status)}`}>{readableStatus(draft.status)}</span></td><td className="px-5 py-4 text-right font-extrabold">{money(draft.totalAmount)}</td></tr>; })}{drafts.length === 0 && <EmptyTable colSpan={4} message="Ainda não há prévias nesta competência. Quando a integração Evo corporativa estiver concluída, elas serão geradas a partir das matrículas atuais." />}</tbody></table></div></div>
        <aside className="panel h-fit p-5"><p className="font-extrabold">Preparar cobrança</p><p className="mt-1 text-sm leading-6 text-slate-500">Ambiente selecionado: <strong>{environment}</strong>.</p><label className="mt-5 block text-xs font-extrabold uppercase tracking-wide text-slate-500">Vencimento<select className="field mt-1.5 w-full" value={scheduleDay} onChange={(event) => onScheduleDayChange(event.target.value)}>{billingDays.map((day) => <option key={day} value={day}>Dia {String(day).padStart(2, "0")}</option>)}</select></label><div className="mt-4 rounded-lg bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">Valor de prévias aprovadas</p><p className="mt-1 text-xl font-extrabold">{money(totalDraftValue)}</p></div><button className="button-primary mt-4 w-full" disabled={selectedDraftIds.length === 0} onClick={() => onCreatePreview(false)}><FileText size={17} />Criar prévia selecionada</button><button className="button-secondary mt-2 w-full" onClick={() => onCreatePreview(true)}><CalendarDays size={17} />Prévia do ciclo do dia</button><p className="mt-3 text-xs leading-5 text-slate-500">Criar prévia nunca envia cobranças ao Asaas.</p></aside>
      </div>
      <div className="mt-7"><div className="mb-3 flex items-center justify-between"><div><p className="text-lg font-extrabold">Lotes da competência</p><p className="mt-1 text-sm text-slate-500">Acompanhe cada aprovação e execução.</p></div></div><div className="grid gap-3 lg:grid-cols-2">{batches.map((batch) => <BatchCard key={batch.id} batch={batch} onApprove={() => onApprove(batch)} onExecute={() => onExecute(batch)} />)}{batches.length === 0 && <div className="panel p-8 text-center text-sm text-slate-500">Nenhum lote criado nesta competência.</div>}</div></div>
    </>}</section>;
}

function BatchCard({ batch, onApprove, onExecute }: { batch: ChargeBatch; onApprove: () => void; onExecute: () => void }) {
  const createdItems = batch.items.filter((item) => item.created).length;
  const failedItems = batch.items.filter((item) => item.status === "Failed").length;
  return <article className="panel p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-extrabold">Lote de {date(batch.dueDate)}</p><p className="mt-1 text-xs font-semibold text-slate-500">{batch.items.length} prévia(s) · criado em {date(batch.createdAt)}</p></div><span className={`badge ${statusBadge(batch.status)}`}>{readableStatus(batch.status)}</span></div><div className="mt-5 grid grid-cols-3 gap-2 text-center"><SmallMetric label="Itens" value={batch.items.length.toString()} /><SmallMetric label="Criadas" value={createdItems.toString()} /><SmallMetric label="Falhas" value={failedItems.toString()} /></div><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4"><span className="text-xs font-bold text-slate-500">{batch.asaasEnvironment}</span>{batch.status === "AwaitingApproval" && <button className="button-secondary h-9" onClick={onApprove}>Aprovar</button>}{batch.status === "Approved" && <button className="button-primary h-9" onClick={onExecute}>Executar</button>}{batch.status !== "AwaitingApproval" && batch.status !== "Approved" && <span className="text-xs text-slate-500">{batch.approvedBy ? `Aprovado por ${batch.approvedBy}` : ""}</span>}</div></article>;
}

function IntegrationsPage({ status }: { status: IntegrationStatus | null }) {
  if (!status) return <div className="panel p-6 text-sm text-slate-500">Não foi possível obter o estado das integrações.</div>;
  return <section><PageHeading title="Integrações" description="Estado atual das conexões utilizadas pelo faturamento." /><div className="grid gap-5 lg:grid-cols-2"><IntegrationCard icon={Database} title="Evo" description={status.evoMessage} configured={status.evoIsConfigured} label={status.evoIsConfigured ? "Conectado" : "Aguardando credenciais"} /><IntegrationCard icon={CreditCard} title="Asaas · Sandbox" description="Consulta de clientes e emissão segura de cobranças de teste." configured={status.sandbox.isConfigured} label={status.sandbox.chargeCreationEnabled ? "Criação habilitada" : "Somente consulta"} /><IntegrationCard icon={ShieldCheck} title="Asaas · Produção" description="A criação real fica bloqueada até credencial e habilitação explícita no servidor." configured={status.production.isConfigured && status.production.chargeCreationEnabled} label={status.production.isConfigured ? "Configuração incompleta" : "Não configurado"} /></div></section>;
}

function IntegrationCard({ icon: Icon, title, description, configured, label }: { icon: typeof Database; title: string; description: string; configured: boolean; label: string }) {
  return <article className="panel p-5"><div className="flex items-start justify-between"><div className={`flex h-10 w-10 items-center justify-center rounded-lg ${configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}><Icon size={20} /></div><span className={`badge ${configured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{configured ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}{label}</span></div><p className="mt-5 font-extrabold">{title}</p><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></article>;
}

function ConfirmationModal({ batch, confirmationText, environment, onCancel, onConfirmationTextChange, onConfirm }: { batch: ChargeBatch; confirmationText: string; environment: AsaasEnvironment; onCancel: () => void; onConfirmationTextChange: (value: string) => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><p className="text-lg font-extrabold">Confirmar execução</p><p className="mt-1 text-sm text-slate-500">Esta ação cria cobranças no Asaas.</p></div><button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" onClick={onCancel}><X size={19} /></button></div><div className={`mt-5 rounded-xl p-4 ${environment === "Production" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-800"}`}><p className="text-sm font-extrabold">{environment} · lote de {date(batch.dueDate)}</p><p className="mt-1 text-sm">{batch.items.length} cobrança(s) serão processadas.</p></div><label className="mt-5 block text-sm font-bold">Digite <span className="font-extrabold">CONFIRMAR</span> para continuar<input autoFocus className="field mt-2 w-full" value={confirmationText} onChange={(event) => onConfirmationTextChange(event.target.value)} /></label><div className="mt-6 flex justify-end gap-2"><button className="button-secondary" onClick={onCancel}>Cancelar</button><button className="button-primary" disabled={confirmationText.trim() !== "CONFIRMAR"} onClick={onConfirm}>Executar lote</button></div></div></div>;
}

function PageHeading({ title, description }: { title: string; description: string }) { return <div className="mb-6"><h1 className="text-2xl font-extrabold tracking-tight">{title}</h1><p className="mt-1 text-sm text-slate-500">{description}</p></div>; }
function SmallMetric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-slate-50 p-2.5"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-sm font-extrabold">{value}</p></div>; }
function EmptyTable({ colSpan, message }: { colSpan: number; message: string }) { return <tr><td className="px-5 py-12 text-center text-sm text-slate-500" colSpan={colSpan}>{message}</td></tr>; }
function Callout({ children, onDismiss, tone }: { children: React.ReactNode; onDismiss?: () => void; tone: "error" | "success" | "warning" }) { const styles = tone === "error" ? "border-red-200 bg-red-50 text-red-800" : tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"; return <div className={`mb-5 flex items-start gap-3 rounded-xl border p-4 text-sm ${styles}`}><CircleAlert className="mt-0.5 shrink-0" size={17} /><p className="flex-1">{children}</p>{onDismiss && <button aria-label="Fechar aviso" onClick={onDismiss}><X size={17} /></button>}</div>; }
function LoadingScreen() { return <main className="flex min-h-screen items-center justify-center bg-[#f5f6f8]"><div className="flex items-center gap-3 text-sm font-bold text-slate-500"><LoaderCircle className="animate-spin text-orange" size={22} />Conectando às integrações...</div></main>; }
