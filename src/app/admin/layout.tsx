import { requireAdmin } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-dvh">
      <Sidebar email={admin.email} />
      <main className="px-4 pb-28 pt-8 sm:px-8 lg:ml-64 lg:pb-12">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
