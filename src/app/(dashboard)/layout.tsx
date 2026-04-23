import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/api/auth/signin");

  return (
    <div className="flex min-h-screen bg-gray-950 text-gray-100">
      <aside className="w-52 shrink-0 border-r border-gray-800 p-4 flex flex-col gap-1">
        <Link href="/" className="mb-4 text-sm font-semibold text-gray-400 hover:text-white">
          ← Control Plane
        </Link>
        <NavLink href="/configs">Research Configs</NavLink>
        <NavLink href="/strategies">Strategies</NavLink>
        <NavLink href="/signals">Signals</NavLink>
        <div className="mt-auto pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
          <Link href="/api/auth/signout" className="text-xs text-gray-500 hover:text-gray-300">
            Sign out
          </Link>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
    >
      {children}
    </Link>
  );
}
