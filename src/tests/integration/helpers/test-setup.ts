/**
 * Utilitários para criar e limpar fixtures de teste no Supabase.
 * Usa service_role para criar usuários e dados isolados por prefixo TEST_.
 * Todos os dados criados são removidos no cleanup.
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { join } from "path";

config({ path: join(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export const TEST_PASSWORD = "T3stS3cur1ty!@#";
export const TEST_PREFIX   = "security.test";

export const TEST_EMAILS = {
  ownerA:  `test.owner.a@${TEST_PREFIX}`,
  memberA: `test.member.a@${TEST_PREFIX}`,
  ownerB:  `test.owner.b@${TEST_PREFIX}`,
  memberB: `test.member.b@${TEST_PREFIX}`,
};

export interface TestFixture {
  users: {
    ownerA:  { id: string; email: string };
    memberA: { id: string; email: string };
    ownerB:  { id: string; email: string };
    memberB: { id: string; email: string };
  };
  workspaces: {
    wsA: string;
    wsB: string;
  };
  contacts: {
    contactA: string;
    contactB: string;
  };
}

export async function createTestFixtures(): Promise<TestFixture> {
  // 1. Criar usuários via admin auth
  const users = await createTestUsers();

  // 2. Criar workspaces para cada owner
  const wsA = await createWorkspace("TEST_Workspace_A", users.ownerA.id);
  const wsB = await createWorkspace("TEST_Workspace_B", users.ownerB.id);

  // 3. Adicionar members aos workspaces
  await addMember(wsA, users.memberA.id, "sales");
  await addMember(wsB, users.memberB.id, "sales");

  // 4. Criar 1 contato em cada workspace
  const contactA = await createContact(wsA, users.ownerA.id, "TEST_Contact_A");
  const contactB = await createContact(wsB, users.ownerB.id, "TEST_Contact_B");

  return {
    users,
    workspaces: { wsA, wsB },
    contacts:   { contactA, contactB },
  };
}

export async function cleanupTestFixtures(fixture: TestFixture) {
  const { wsA, wsB } = fixture.workspaces;

  // Limpa em ordem: contacts → members → workspaces → users
  await admin.from("contacts").delete().in("workspace_id", [wsA, wsB]);
  await admin.from("workspace_members").delete().in("workspace_id", [wsA, wsB]);
  await admin.from("workspaces").delete().in("id", [wsA, wsB]);

  // Remove profiles (criados via trigger)
  const userIds = Object.values(fixture.users).map((u) => u.id);
  await admin.from("profiles").delete().in("id", userIds);

  // Remove usuários do auth
  for (const user of Object.values(fixture.users)) {
    await admin.auth.admin.deleteUser(user.id);
  }
}

// ─── helpers internos ─────────────────────────────────────────────────────────

async function createTestUsers() {
  const created: Record<string, { id: string; email: string }> = {};

  for (const [key, email] of Object.entries(TEST_EMAILS)) {
    // Tenta deletar se já existir de um run anterior
    const existing = await admin.auth.admin.listUsers();
    const prev = existing.data?.users?.find((u) => u.email === email);
    if (prev) await admin.auth.admin.deleteUser(prev.id);

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { name: `Test ${key}` },
    });

    if (error || !data.user) throw new Error(`Falha ao criar ${email}: ${error?.message}`);
    created[key] = { id: data.user.id, email };
  }

  return created as TestFixture["users"];
}

async function createWorkspace(name: string, ownerId: string): Promise<string> {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-test";
  const { data, error } = await admin
    .from("workspaces")
    .insert({ name, slug })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Falha ao criar workspace ${name}: ${error?.message}`);

  // Owner via workspace_members
  await admin.from("workspace_members").insert({
    workspace_id: data.id,
    user_id: ownerId,
    role: "owner",
  });

  return data.id;
}

async function addMember(workspaceId: string, userId: string, role: string) {
  const { error } = await admin.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: userId,
    role,
  });
  if (error) throw new Error(`Falha ao adicionar membro: ${error.message}`);
}

async function createContact(workspaceId: string, createdBy: string, name: string): Promise<string> {
  const { data, error } = await admin
    .from("contacts")
    .insert({
      workspace_id: workspaceId,
      name,
      phone: "+5511999999999",
      status: "lead",
      created_by: createdBy,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(`Falha ao criar contact: ${error?.message}`);
  return data.id;
}

/** Autentica como um usuário de teste via magic link (bypassa captcha) */
export async function signInAs(email: string) {
  const client = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkError || !linkData?.properties?.action_link) {
    throw new Error(`Falha ao gerar magic link para ${email}: ${linkError?.message}`);
  }

  const url = new URL(linkData.properties.action_link);
  const tokenHash = url.searchParams.get("token");
  if (!tokenHash) throw new Error(`Token não encontrado no magic link de ${email}`);

  const { data, error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error || !data.session) throw new Error(`Falha ao verificar OTP para ${email}: ${error?.message}`);
  return client;
}
