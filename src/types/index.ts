export type MemberRole = "owner" | "admin" | "manager" | "sales" | "support";
export type PermissionModule = "leads" | "contacts" | "deals" | "chat" | "analytics" | "settings" | "members";
export type PermissionAction = "view" | "create" | "edit" | "delete";
export type ContactStatus = "lead" | "prospect" | "customer" | "churned";
export type DealStatus = "open" | "won" | "lost" | "archived";
export type ConvStatus = "open" | "pending" | "resolved" | "archived";
export type MessageDirection = "inbound" | "outbound";
export type MessageStatus = "sent" | "delivered" | "read" | "failed";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  business_niche_id: string | null;
  logo_url: string | null;
  display_name: string | null;
  legal_name: string | null;
  document: string | null;
  phone: string | null;
  email: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_district: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zipcode: string | null;
  address_country: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  current_workspace_id: string | null;
  is_superadmin: boolean;
  is_owner: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
}

export type WorkspaceMemberWithProfile = WorkspaceMember & {
  profiles: {
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
};

export interface WorkspaceWithStats {
  id: string;
  name: string;
  slug: string;
  business_niche_id: string | null;
  niche_name: string | null;
  parent_niche_name: string | null;
  logo_url: string | null;
  display_name: string | null;
  legal_name: string | null;
  document: string | null;
  phone: string | null;
  email: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_district: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zipcode: string | null;
  address_country: string | null;
  created_at: string;
  is_active: boolean;
  member_count: number;
  contact_count: number;
  deal_count: number;
}

// ── WhatsApp Integrations (bridge para wa_* tables, somente leitura) ─────────

export type IntegrationStatus = "active" | "inactive" | "pending";

export interface WorkspaceIntegration {
  id: string;
  workspace_id: string;
  integration_type: string;
  provider_id: string | null;
  wa_tenant_id: string | null;
  label: string | null;
  status: IntegrationStatus;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceIntegrationWithWaTenant extends WorkspaceIntegration {
  wa_tenant_name: string | null;
  wa_tenant_display_name: string | null;
  wa_tenant_slug: string | null;
  wa_instance_count: number;
}

export interface WaTenantOption {
  id: string;
  name: string;
  display_name: string | null;
  slug: string;
  is_active: boolean;
  plan_status: string;
  instance_count: number;
}

export interface WaProviderOption {
  id: string;
  name: string;
  type: string;
}

// ── WhatsApp management (BFF — backend WA, ADR-006) ──────────────────────────
// Tipos do backend WhatsApp (FastAPI) consumidos via BFF. Shapes vêm dos
// contratos em backend_zapi/frontend/wa-backend-integration-contracts.md.
// `credentials` da Z-API NUNCA chegam ao frontend (invariante do contrato).

/** Status persistido da instância (espelho no banco do backend WA). */
export type WaInstanceConnStatus = "connected" | "disconnected" | "connecting" | string;

/** Instância retornada por GET /management/tenants/{tenant_id}/instances. */
export interface WaInstance {
  instance_id: string;
  name: string;
  phone?: string | null;
  status: WaInstanceConnStatus;
  provider_id: string;
  connected_at?: string | null;
}

/** Instância + de qual wa_tenant/workspace-integration veio (atado pelo BFF). */
export interface WaInstanceWithTenant extends WaInstance {
  tenant_id: string;
  /** label amigável do vínculo (workspace_integrations.label), se houver. */
  integration_label: string | null;
}

/** GET /management/instances/{instance_id}/status — `connected` é o sinal canônico. */
export interface WaInstanceLiveStatus {
  instance_id: string;
  status: WaInstanceConnStatus;
  connected: boolean;
  smartphoneConnected?: boolean;
  session?: string;
}

/** GET /management/instances/{instance_id}/qrcode — `qrcode` é um data URI. */
export interface WaInstanceQrCode {
  instance_id: string;
  qrcode: string;
}

// ── account-settings (perfil/privacidade da conta WhatsApp, v2.3) ────────────
// Base: /tenants/{tenant_id}/instances/{instance_id}. Contratos em
// backend_zapi/frontend/wa-backend-integration-contracts.md §2.

/** GET .../profile — campos nunca configurados vêm null. */
export interface WaProfile {
  instance_id: string;
  name: string | null;
  picture_url: string | null;
  description: string | null;
  synced_at: string | null;
}

export type WaProfileField = "name" | "description" | "picture";

/** Envelope padrão das mutações de account-settings. */
export interface WaApplied {
  applied: boolean;
  field: string;
  value: unknown;
  updated_at: string;
}

export type WaVisualizationType = "ALL" | "NONE" | "CONTACT_BLACKLIST";

export interface WaPrivacyControl {
  visualizationType?: WaVisualizationType;
  /** group-add usa a chave `type` no lugar de `visualizationType` (peculiaridade Z-API). */
  type?: WaVisualizationType;
  contactsBlacklist?: string[];
}

/** GET .../privacy — cache consolidado dos 8 controles. */
export interface WaPrivacySettings {
  instance_id: string;
  last_seen: WaPrivacyControl;
  photo: WaPrivacyControl;
  description: WaPrivacyControl;
  online: WaPrivacyControl;
  group_add: WaPrivacyControl;
  read_receipts: "enable" | "disable" | string;
  messages_duration: "days90" | "days7" | "hours24" | "disable" | string;
  synced_at: string | null;
}

// ── Business Niches ───────────────────────────────────────────────────────────

export interface BusinessNiche {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children?: BusinessNiche[];
}

// ── RBAC ──────────────────────────────────────────────────────────────────────

export interface Permission {
  id: string;
  key: string;
  description: string;
  module: PermissionModule;
  action: PermissionAction;
  created_at: string;
}

export interface WorkspaceRole {
  id: string;
  workspace_id: string;
  name: string;
  is_system: boolean;
  created_at: string;
  permissions?: Permission[];
}

// ─────────────────────────────────────────────────────────────────────────────

export interface AdminGlobalStats {
  total_workspaces: number;
  total_members: number;
  total_contacts: number;
  total_deals: number;
}

export interface Contact {
  id: string;
  workspace_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  document: string | null;
  company: string | null;
  status: ContactStatus;
  avatar_url: string | null;
  notes: string | null;
  custom_fields: Record<string, unknown>;
  assigned_to: string | null;
  source_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactAccess {
  contact_id: string;
  user_id: string;
  granted_by: string | null;
  created_at: string;
}

export interface ContactSource {
  id: string;
  workspace_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ContactImportRowStatus = "valid" | "invalid" | "duplicate";

export interface ContactImportRow {
  row: number;
  data: {
    name?: string;
    personType?: "fisica" | "juridica";
    document?: string;
    phone?: string;
    email?: string;
    company?: string;
    status?: ContactStatus;
    notes?: string;
    source?: string;
  };
  status: ContactImportRowStatus;
  errors?: string[];
}

export interface ContactImportResult {
  total: number;
  created: number;
  skipped: number;
  already_exists: number;
  invalid_count: number;
  file_duplicates: number;
  errors: { row: number; message: string }[];
}

export interface Pipeline {
  id: string;
  workspace_id: string;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Stage {
  id: string;
  workspace_id: string;
  pipeline_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Deal {
  id: string;
  workspace_id: string;
  pipeline_id: string;
  stage_id: string;
  contact_id: string | null;
  title: string;
  value: number | null;
  status: DealStatus;
  expected_close_date: string | null;
  position: number;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  deal_id: string | null;
  phone: string;
  status: ConvStatus;
  assigned_to: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  workspace_id: string;
  conversation_id: string;
  direction: MessageDirection;
  content: string;
  status: MessageStatus;
  whatsapp_message_id: string | null;
  metadata: Record<string, unknown>;
  sent_by: string | null;
  created_at: string;
}

// ── Vehicle Global Catalog ────────────────────────────────────────────────────

export interface VehicleCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface VehicleBrand {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
}

export interface VehicleModel {
  id: string;
  brand_id: string;
  category_id: string;
  name: string;
  slug: string;
  year_from: number | null;
  year_to: number | null;
  engine_cc: number | null;
  notes: string | null;
  created_at: string;
  // joins opcionais
  brand?: VehicleBrand;
  category?: VehicleCategory;
}

// ── Auto Parts ────────────────────────────────────────────────────────────────

export interface AutoPartsCatalog {
  id: string;
  part_number: string;
  name: string;
  description: string | null;
  category: string;
  color: string | null;
  unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutoPartsCompatibility {
  part_id: string;
  model_id: string;
  notes: string | null;
  // joins opcionais
  model?: VehicleModel;
}

export interface AutoPartsWorkspacePricing {
  part_id: string;
  workspace_id: string;
  cost_price: number;
  sale_price: number;
  markup_pct: number | null;
  margin_pct: number | null;
  updated_at: string;
}

export type AutoPartsQuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

export interface AutoPartsQuote {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  status: AutoPartsQuoteStatus;
  notes: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutoPartsQuoteItem {
  id: string;
  quote_id: string;
  part_id: string | null;
  part_number_snap: string;
  name_snap: string;
  color_snap: string | null;
  unit_snap: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// ── Auto Sales ────────────────────────────────────────────────────────────────

export type VehicleCondition = 'new' | 'used' | 'certified';
export type VehicleStatus = 'available' | 'reserved' | 'sold' | 'inactive';
export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface AutoSalesInventory {
  id: string;
  workspace_id: string;
  model_id: string;
  plate: string | null;
  color: string;
  year_manufacture: number;
  year_model: number;
  trim: string | null;
  mileage_km: number;
  fuel: string | null;
  transmission: string | null;
  chassis: string | null;
  renavam: string | null;
  condition: VehicleCondition;
  has_sinistro: boolean;
  has_cautelar_issue: boolean;
  accepts_trade_in: boolean;
  requires_down_pay: boolean;
  accepts_financing: boolean;
  status: VehicleStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // joins opcionais
  model?: VehicleModel;
  pricing?: AutoSalesInventoryPricing;
}

export interface AutoSalesInventoryPricing {
  inventory_id: string;
  cost_price: number;
  offer_price: number;
  max_discount_price: number | null;
  markup_pct: number | null;
  margin_pct: number | null;
  updated_at: string;
}

export interface AutoSalesOptionalItem {
  id: string;
  inventory_id: string;
  name: string;
  price: number;
  is_included: boolean;
}

export interface AutoSalesProposal {
  id: string;
  workspace_id: string;
  contact_id: string | null;
  deal_id: string | null;
  inventory_id: string | null;
  trade_in_plate: string | null;
  trade_in_model_id: string | null;
  trade_in_year: number | null;
  trade_in_mileage_km: number | null;
  trade_in_estimated_value: number | null;
  final_price: number | null;
  down_payment: number | null;
  financing_months: number | null;
  financing_institution: string | null;
  status: ProposalStatus;
  notes: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Fashion ───────────────────────────────────────────────────────────────────

export type FashionGender = 'feminino' | 'masculino' | 'infantil' | 'unissex';

export interface FashionProduct {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  category: string;
  gender: FashionGender;
  brand: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FashionProductVariant {
  id: string;
  product_id: string;
  color: string;
  size: string;
  sku: string;
  is_active: boolean;
  // joins opcionais
  pricing?: FashionVariantPricing;
  stock?: FashionVariantStock;
}

export interface FashionVariantPricing {
  variant_id: string;
  workspace_id: string;
  cost_price: number;
  sale_price: number;
  markup_pct: number | null;
  margin_pct: number | null;
  updated_at: string;
}

export interface FashionVariantStock {
  variant_id: string;
  workspace_id: string;
  quantity: number;
  min_stock: number;
  updated_at: string;
}

// ── Contact Niche Profiles ────────────────────────────────────────────────────

export interface ContactProfileAutoParts {
  contact_id: string;
  workspace_id: string;
  company_type: string | null;
  fleet_size: number | null;
  segment: 'heavy' | 'light' | 'agro' | 'moto' | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactProfileFashion {
  contact_id: string;
  workspace_id: string;
  shirt_size: string | null;
  pants_size: string | null;
  shoe_size: string | null;
  preferences: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
