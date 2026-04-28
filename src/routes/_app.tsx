import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    // Auth check happens client-side via component (SSR has no session)
    return {};
  },
  component: AppLayout,
});

function AppLayout() {
  return <Outlet />;
}
