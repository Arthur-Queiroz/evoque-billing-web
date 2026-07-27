export type AsaasEnvironment = "Sandbox" | "Production";

export interface IntegrationEnvironmentStatus {
  environment: AsaasEnvironment;
  isConfigured: boolean;
  readOperationsEnabled: boolean;
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

export interface EvoCorporateMember {
  memberId: number;
  memberName: string;
  membershipId: number;
  memberMembershipId: number;
  branchId: number;
  saleId: number;
  saleValue: number | null;
  membershipName: string | null;
  membershipStatus: number | null;
  corporatePartnershipId: number;
  corporatePartnershipName: string;
}

export interface EvoCorporateMemberList {
  corporateMembers: EvoCorporateMember[];
  offset: number;
  limit: number;
  processedMemberMembershipCount: number;
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

export interface BillingSpreadsheetMember {
  memberName: string;
  contractName: string;
  amount: number;
  sourceRowNumber: number;
}

export interface BillingSpreadsheetCompany {
  companyName: string;
  companyTaxId: string;
  memberCount: number;
  totalAmount: number;
  members: BillingSpreadsheetMember[];
}

export interface BillingSpreadsheetWarning {
  sourceRowNumber: number | null;
  code: string;
  message: string;
}

export interface BillingSpreadsheetPreview {
  fileName: string;
  importedRowCount: number;
  duplicateRowCount: number;
  totalAmount: number;
  companies: BillingSpreadsheetCompany[];
  warnings: BillingSpreadsheetWarning[];
}

export interface BillingSpreadsheetDraftImport {
  spreadsheetPreview: BillingSpreadsheetPreview;
  billingDrafts: BillingDraft[];
}

export interface CompanyRegistryAddress {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
}

export type CompanyRegistryLookupStatus = "NotChecked" | "Found" | "NotFound" | "Unavailable";

export type CompanySource = "EvoSpreadsheet" | "Manual";

/** Empresa do catálogo interno, já reunida com a agenda de cobrança. */
export interface Company {
  taxId: string;
  formattedTaxId: string;
  displayName: string;
  evoName: string | null;
  legalName: string | null;
  tradeName: string | null;
  registrationStatus: string | null;
  registryAddress: CompanyRegistryAddress | null;
  registryLookupStatus: CompanyRegistryLookupStatus;
  registryLastCheckedAt: string | null;
  isActive: boolean;
  source: CompanySource;
  memberCount: number;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  seenInLastImport: boolean;
  requiresReviewAfterReappearing: boolean;
  billingDay: number | null;
  hasActiveSchedule: boolean;
  asaasSandboxCustomerId: string | null;
  asaasProductionCustomerId: string | null;
  updatedAt: string;
  updatedBy: string;
}

export interface CorporateMember {
  evoMemberId: number;
  memberName: string;
  companyTaxId: string;
  formattedCompanyTaxId: string;
  companyName: string;
  contracts: string[];
  isActive: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  deactivatedAt: string | null;
}

export interface CompanyCatalogImportedMember {
  evoMemberId: number;
  memberName: string;
  contracts: string[];
  sourceRowNumber: number;
}

export interface CorporateMemberComparison {
  newMemberCount: number;
  retainedMemberCount: number;
  departedMemberCount: number;
  reactivatedMemberCount: number;
  conflictMemberCount: number;
}

export interface CompanyBillingHistoryEntry {
  billingDraftId: string;
  billingPeriodId: string;
  status: string;
  version: number;
  itemCount: number;
  totalAmount: number;
  asaasPaymentId: string | null;
  approvedAt: string | null;
  createdAt: string;
}

export interface CompanyCatalogImportCompany {
  taxId: string;
  formattedTaxId: string;
  evoName: string;
  isAlreadyRegistered: boolean;
  memberCount: number;
  members: CompanyCatalogImportedMember[];
}

export interface CompanyCatalogImportWarning {
  sourceRowNumber: number | null;
  code: string;
  message: string;
}

export interface CompanyCatalogImportPreview {
  fileName: string;
  analyzedRowCount: number;
  discoveredCompanyCount: number;
  newCompanyCount: number;
  existingCompanyCount: number;
  discoveredMemberCount: number;
  duplicateMemberCount: number;
  invalidTaxIdCount: number;
  nameConflictCount: number;
  memberComparison: CorporateMemberComparison;
  companies: CompanyCatalogImportCompany[];
  warnings: CompanyCatalogImportWarning[];
}

export interface CompanyCatalogImportResult {
  importId: string;
  synchronizedAt: string;
  operatorId: string;
  createdCompanyCount: number;
  ignoredExistingCompanyCount: number;
  registryEnrichedCount: number;
  registryUnavailableCount: number;
  memberComparison: CorporateMemberComparison;
  preview: CompanyCatalogImportPreview;
}

export interface CompanyCatalogImportSummary {
  importId: string;
  fileName: string;
  operatorId: string;
  synchronizedAt: string;
  analyzedRowCount: number;
  discoveredCompanyCount: number;
  createdCompanyCount: number;
  ignoredExistingCompanyCount: number;
  warningCount: number;
}

export interface CompanyFilters {
  search?: string;
  status?: "all" | "active" | "inactive";
  billingDay?: number;
  withoutBillingDay?: boolean;
  source?: CompanySource;
  seenInLastImport?: boolean;
  asaasLink?: "configured" | "pending";
}

export interface SaveCompanyInput {
  displayName?: string | null;
  billingDay: number | null;
  operatorId: string;
}

export interface CreateSandboxAsaasCustomerResponse {
  customer: AsaasCustomer;
  createdNow: boolean;
}

export interface CompanyAsaasSynchronization {
  environment: AsaasEnvironment;
  status: "Linked" | "NotFound" | "Ambiguous";
  customerId: string | null;
  customerName: string | null;
  createdNow: boolean;
  message: string;
}

const configuredApiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
// Em desenvolvimento, o Next encaminha /api para o backend local. Assim o
// navegador sempre usa a mesma origem do client e nÃ£o depende de CORS.
const apiBaseUrl = configuredApiBaseUrl;

function apiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const requestHeaders = new Headers(options?.headers);
  requestHeaders.set("Accept", "application/json");
  if (!(options?.body instanceof FormData) && options?.body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...options,
      headers: requestHeaders,
    });
  } catch {
    throw new Error("Não foi possível conectar à API. Verifique sua conexão e tente novamente.");
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const errorBody = await response.json().catch(() => null) as { error?: string; message?: string; title?: string } | null;
      throw new Error(errorBody?.error ?? errorBody?.message ?? errorBody?.title ?? `A API respondeu com erro ${response.status}.`);
    }

    throw new Error(`A API respondeu com erro ${response.status} ao consultar ${path}.`);
  }

  return response.json() as Promise<T>;
}

/** Para endpoints que respondem `204 No Content` quando ainda não há dado. */
async function requestOptional<T>(path: string): Promise<T | null> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), { headers: { Accept: "application/json" } });
  } catch {
    throw new Error("Não foi possível conectar à API. Verifique sua conexão e tente novamente.");
  }
  if (response.status === 204) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`A API respondeu com erro ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

function buildCompanyQuery(filters: CompanyFilters): string {
  const query = new URLSearchParams();
  if (filters.search) {
    query.set("search", filters.search);
  }
  if (filters.status && filters.status !== "all") {
    query.set("status", filters.status);
  }
  if (filters.billingDay !== undefined) {
    query.set("billingDay", String(filters.billingDay));
  }
  if (filters.withoutBillingDay) {
    query.set("withoutBillingDay", "true");
  }
  if (filters.source) {
    query.set("source", filters.source);
  }
  if (filters.seenInLastImport !== undefined) {
    query.set("seenInLastImport", String(filters.seenInLastImport));
  }
  if (filters.asaasLink) {
    query.set("asaasLink", filters.asaasLink);
  }

  const queryText = query.toString();
  return queryText ? `?${queryText}` : "";
}

export const api = {
  getIntegrationStatus: () => request<IntegrationStatus>("/api/integrations"),
  getMembers: (searchTerm = "") =>
    request<EvoMemberList>(`/api/evo/members?limit=100&status=1${searchTerm ? `&name=${encodeURIComponent(searchTerm)}` : ""}`),
  getCompanies: () => request<{ companies: EvoCompany[] }>("/api/evo/companies"),
  getCorporateMembers: (offset = 0, limit = 5) =>
    request<EvoCorporateMemberList>(`/api/evo/corporate-members?offset=${offset}&limit=${limit}`),
  getCatalogCompanies: (filters: CompanyFilters = {}) =>
    request<Company[]>(`/api/companies${buildCompanyQuery(filters)}`),
  getCatalogCompany: (taxId: string) => request<Company>(`/api/companies/${encodeURIComponent(taxId)}`),
  createCatalogCompany: (taxId: string, input: SaveCompanyInput) =>
    request<Company>("/api/companies", {
      method: "POST",
      body: JSON.stringify({ taxId, ...input }),
    }),
  updateCatalogCompany: (taxId: string, input: SaveCompanyInput) =>
    request<Company>(`/api/companies/${encodeURIComponent(taxId)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  deactivateCatalogCompany: (taxId: string, operatorId: string) =>
    request<Company>(`/api/companies/${encodeURIComponent(taxId)}/deactivate`, {
      method: "POST",
      body: JSON.stringify({ operatorId }),
    }),
  reactivateCatalogCompany: (taxId: string, operatorId: string) =>
    request<Company>(`/api/companies/${encodeURIComponent(taxId)}/reactivate`, {
      method: "POST",
      body: JSON.stringify({ operatorId }),
    }),
  refreshCatalogCompanyRegistry: (taxId: string, operatorId: string) =>
    request<Company>(`/api/companies/${encodeURIComponent(taxId)}/registry-refresh`, {
      method: "POST",
      body: JSON.stringify({ operatorId }),
    }),
  synchronizeCatalogCompanyAsaasSandbox: (
    taxId: string,
    email: string,
    operatorId: string,
  ) =>
    request<CompanyAsaasSynchronization>(
      `/api/companies/${encodeURIComponent(taxId)}/asaas/sandbox-sync`,
      {
        method: "POST",
        body: JSON.stringify({ email, operatorId }),
      },
    ),
  synchronizeCatalogCompanyAsaasProduction: (taxId: string, operatorId: string) =>
    request<CompanyAsaasSynchronization>(
      `/api/companies/${encodeURIComponent(taxId)}/asaas/production-sync`,
      {
        method: "POST",
        body: JSON.stringify({ operatorId }),
      },
    ),
  getCatalogCompanyMembers: (taxId: string) =>
    request<CorporateMember[]>(`/api/companies/${encodeURIComponent(taxId)}/members`),
  getCorporateCatalogMembers: () =>
    request<CorporateMember[]>("/api/corporate-members"),
  getCatalogCompanyBillingHistory: (taxId: string) =>
    request<CompanyBillingHistoryEntry[]>(`/api/companies/${encodeURIComponent(taxId)}/billing-history`),
  previewCompanyCatalogImport: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<CompanyCatalogImportPreview>("/api/company-catalog-imports/preview", {
      method: "POST",
      body: formData,
    });
  },
  synchronizeCompanyCatalog: (
    file: File,
    operatorId: string,
    completeSnapshotConfirmed: boolean,
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("operatorId", operatorId);
    formData.append("completeSnapshotConfirmed", String(completeSnapshotConfirmed));
    return request<CompanyCatalogImportResult>("/api/company-catalog-imports", {
      method: "POST",
      body: formData,
    });
  },
  getLatestCompanyCatalogImport: () =>
    requestOptional<CompanyCatalogImportSummary>("/api/company-catalog-imports/latest"),
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
  createSandboxAsaasCustomer: (name: string, taxId: string, email: string) =>
    request<CreateSandboxAsaasCustomerResponse>("/api/asaas/customers/sandbox", {
      method: "POST",
      body: JSON.stringify({ name, taxId, email }),
    }),
  previewBillingSpreadsheet: (year: number, month: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<BillingSpreadsheetPreview>(
      `/api/billing-periods/${year}/${month}/spreadsheet-imports/preview`,
      { method: "POST", body: formData },
    );
  },
  createBillingDraftsFromSpreadsheet: (
    year: number,
    month: number,
    file: File,
    operatorId: string,
    asaasCustomerId: string,
  ) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("operatorId", operatorId);
    formData.append("asaasCustomerId", asaasCustomerId);
    return request<BillingSpreadsheetDraftImport>(
      `/api/billing-periods/${year}/${month}/spreadsheet-imports/drafts`,
      { method: "POST", body: formData },
    );
  },
};
