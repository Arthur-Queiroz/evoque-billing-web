export type AsaasEnvironment = "Sandbox" | "Production";

export interface IntegrationEnvironmentStatus {
  environment: AsaasEnvironment;
  isConfigured: boolean;
  chargeCreationEnabled: boolean;
}

export interface IntegrationStatus {
  asaasEnvironment: string;
  asaasChargeCreationEnabled: boolean;
  sandbox: IntegrationEnvironmentStatus;
  production: IntegrationEnvironmentStatus;
  evoIsConfigured: boolean;
  evoMessage: string;
}

export interface EvoMembership {
  id: number;
  memberMembershipId: number;
  name: string;
  status: string | null;
  nextMonthValue: number | null;
  nextChargeValue: number | null;
  startDate: string | null;
  endDate: string | null;
  nextChargeDate: string | null;
}

export interface EvoMember {
  id: number;
  branchId: number;
  branchName: string;
  firstName: string;
  lastName: string | null;
  memberships: EvoMembership[];
}

export interface EvoMemberList {
  members: EvoMember[];
  offset: number;
  limit: number;
}

export interface EvoCompany {
  partnershipId: number;
  partnershipDescription: string;
  id: number;
  branchId: number;
  corporateName: string;
  tradeName: string | null;
  taxId: string | null;
  isActive: boolean;
}

export interface CompanySchedule {
  externalCompanyId: string;
  billingDay: number;
  isActive: boolean;
  updatedBy: string;
  updatedAt: string;
}

export interface BillingPeriod {
  id: string;
  year: number;
  month: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingDraftItem {
  description: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  externalMemberId: string | null;
}

export interface BillingDraft {
  id: string;
  billingPeriodId: string;
  externalCompanyId: string;
  companyName: string;
  companyTaxId: string;
  asaasCustomerId: string | null;
  totalAmount: number;
  status: string;
  version: number;
  approvedBy: string | null;
  approvedAt: string | null;
  asaasPaymentId: string | null;
  bankSlipUrl: string | null;
  items: BillingDraftItem[];
}

export interface ChargeBatchItem {
  billingDraftId: string;
  status: string;
  created: boolean;
  asaasPaymentId: string | null;
  bankSlipUrl: string | null;
  error: string | null;
}

export interface ChargeBatch {
  id: string;
  billingPeriodId: string;
  dueDate: string;
  asaasEnvironment: AsaasEnvironment;
  status: string;
  retryOfChargeBatchId: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: ChargeBatchItem[];
}

export interface AsaasCustomer {
  id: string;
  name: string;
  taxId: string | null;
  email: string | null;
  hasEmailRecipient: boolean;
  paymentCreatedEmailEnabled: boolean;
}

export interface AsaasCustomersResponse {
  customers: AsaasCustomer[];
  hasMore: boolean;
  offset: number;
  totalCount: number;
}

const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
const apiBaseUrl = configuredApiBaseUrl || (process.env.NODE_ENV === "development" ? "http://localhost:5207" : "");

function apiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const errorBody = await response.json().catch(() => null) as { message?: string; title?: string } | null;
      throw new Error(errorBody?.message ?? errorBody?.title ?? `A API respondeu com erro ${response.status}.`);
    }

    throw new Error(
      "Não foi possível consultar a API de faturamento. Confirme que o backend está em execução na porta 5207.",
    );
  }

  return response.json() as Promise<T>;
}

export const api = {
  getIntegrationStatus: () => request<IntegrationStatus>("/api/integrations"),
  getMembers: (searchTerm = "") =>
    request<EvoMemberList>(`/api/evo/members?limit=100&status=1${searchTerm ? `&name=${encodeURIComponent(searchTerm)}` : ""}`),
  getCompanies: () => request<{ companies: EvoCompany[] }>("/api/evo/companies"),
  getCompanySchedules: () => request<CompanySchedule[]>("/api/company-billing-schedules"),
  saveCompanySchedule: (externalCompanyId: string, billingDay: number, operatorId: string) =>
    request<CompanySchedule>(`/api/company-billing-schedules/${encodeURIComponent(externalCompanyId)}`, {
      method: "PUT",
      body: JSON.stringify({ billingDay, isActive: true, operatorId }),
    }),
  getBillingPeriods: () => request<BillingPeriod[]>("/api/billing-periods"),
  createBillingPeriod: (year: number, month: number, operatorId: string) =>
    request<BillingPeriod>(`/api/billing-periods/${year}/${month}`, {
      method: "POST",
      body: JSON.stringify({ operatorId }),
    }),
  getBillingDrafts: (year: number, month: number) => request<BillingDraft[]>(`/api/billing-periods/${year}/${month}/drafts`),
  approveBillingDraft: (billingDraftId: string, operatorId: string) =>
    request<BillingDraft>(`/api/billing-drafts/${billingDraftId}/approve`, {
      method: "POST",
      body: JSON.stringify({ operatorId }),
    }),
  getChargeBatches: (year: number, month: number) =>
    request<ChargeBatch[]>(`/api/billing-periods/${year}/${month}/charge-batches`),
  createChargeBatchPreview: (
    billingDraftIds: string[],
    dueDate: string,
    asaasEnvironment: AsaasEnvironment,
    operatorId: string,
  ) =>
    request<ChargeBatch>("/api/charge-batches/previews", {
      method: "POST",
      body: JSON.stringify({ billingDraftIds, dueDate, asaasEnvironment, operatorId }),
    }),
  createScheduledChargeBatchPreview: (
    year: number,
    month: number,
    dueDate: string,
    asaasEnvironment: AsaasEnvironment,
    operatorId: string,
  ) =>
    request<ChargeBatch>(`/api/billing-periods/${year}/${month}/scheduled-charge-batches/previews`, {
      method: "POST",
      body: JSON.stringify({ dueDate, asaasEnvironment, operatorId }),
    }),
  approveChargeBatch: (chargeBatchId: string, operatorId: string) =>
    request<ChargeBatch>(`/api/charge-batches/${chargeBatchId}/approve`, {
      method: "POST",
      body: JSON.stringify({ operatorId }),
    }),
  executeChargeBatch: (chargeBatchId: string, operatorId: string) =>
    request<ChargeBatch>(`/api/charge-batches/${chargeBatchId}/execute`, {
      method: "POST",
      body: JSON.stringify({ operatorId, confirmationPhrase: "CONFIRMAR" }),
    }),
  getAsaasCustomers: (searchTerm: string) =>
    request<AsaasCustomersResponse>(`/api/asaas/customers?limit=25&searchTerm=${encodeURIComponent(searchTerm)}`),
};
