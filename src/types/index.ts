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
  logo_url: string | null;
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
  logo_url: string | null;
  created_at: string;
  member_count: number;
  contact_count: number;
  deal_count: number;
}

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
  created_by: string | null;
  created_at: string;
  updated_at: string;
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
