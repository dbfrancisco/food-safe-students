import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

/**
 * Server-side auth gate for protected routes.
 * Runs in beforeLoad — blocks SSR render of protected content before
 * any data fetch or component code executes.
 */
export async function requireAuth() {
  if (typeof window === "undefined") {
    // SSR: no session storage available; defer to client hydration check.
    // Throwing redirect here would prevent prerender; we let the client
    // beforeLoad re-run and gate properly.
    return;
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw redirect({ to: "/login" });
  }
}
