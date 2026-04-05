import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Shell } from "@/components/layout/shell";
import { ToastContainer } from "@/components/ui/toast";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as {
    name?: string | null;
    orgName?: string;
    isSuperAdmin?: boolean;
  };

  return (
    <Shell
      orgName={user.orgName ?? undefined}
      userName={user.name ?? undefined}
      isSuperAdmin={user.isSuperAdmin ?? false}
    >
      {children}
      <ToastContainer />
    </Shell>
  );
}
