import { AppShell } from "@/components/app/app-shell";
import { requireAuth } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace, role } = await requireAuth();

  return (
    <AppShell
      user={{ name: user.name, email: user.email, avatarColor: user.avatarColor }}
      workspace={{
        name: workspace.name,
        plan: workspace.plan,
        creditBalance: workspace.creditBalance,
        creditsIncluded: workspace.creditsIncluded,
        periodStart: workspace.periodStart.toISOString(),
      }}
      role={role}
    >
      {children}
    </AppShell>
  );
}
