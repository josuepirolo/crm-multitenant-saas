"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginSchema, registerSchema } from "@/lib/validations/auth";
import { SupabaseWorkspaceRepository } from "@/repositories/workspace.repository";
import { uniqueSlug } from "@/lib/utils/slug";
import { redirect } from "next/navigation";

export async function signIn(_: unknown, formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "E-mail ou senha inválidos" };
  }

  redirect("/dashboard");
}

export async function signUp(_: unknown, formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    workspaceName: formData.get("workspaceName") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name } },
  });

  if (authError) {
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: "Erro ao criar usuário. Tente novamente." };
  }

  // Cria workspace e vincula o usuário como owner via service_role
  try {
    const admin = createAdminClient();
    const workspaceRepo = new SupabaseWorkspaceRepository(admin);

    await workspaceRepo.create({
      name: parsed.data.workspaceName,
      slug: uniqueSlug(parsed.data.workspaceName),
      owner_id: authData.user.id,
    });
  } catch (err) {
    // Workspace falhou mas usuário foi criado — logar para investigar
    console.error("[signUp] Erro ao criar workspace:", err);
    return { error: "Conta criada, mas houve um erro ao configurar seu workspace. Entre em contato com o suporte." };
  }

  redirect("/dashboard");
}
