import { cache } from "react";
import { createClient } from "./server";

/**
 * getUser() deduplicado por request via React.cache().
 * Todas as chamadas dentro do mesmo render tree retornam o mesmo resultado
 * sem round-trip adicional ao Supabase Auth.
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient();
  return supabase.auth.getUser();
});
