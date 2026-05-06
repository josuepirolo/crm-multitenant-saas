import { createAdminClient } from "@/lib/supabase/admin";
import { RegisterForm } from "@/components/auth/register-form";
import type { BusinessNiche } from "@/types";

export default async function RegisterPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("business_niches")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  const niches: BusinessNiche[] = (data ?? []) as BusinessNiche[];

  return <RegisterForm niches={niches} />;
}
