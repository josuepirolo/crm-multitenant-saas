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
