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
      <aside className="w-56 shrink-0 border-r border-gray-800 p-4 flex flex-col gap-0.5">
        <div className="mb-5">
          <Link href="/" className="text-sm font-bold text-white tracking-tight">
            the2357.com
          </Link>
          <p className="text-xs text-gray-500 mt-0.5">Control Plane</p>
        </div>

        <NavSection label="Pipeline">
          <NavLink href="/configs">Research Configs</NavLink>
          <NavLink href="/strategies">Strategies</NavLink>
          <NavLink href="/signals">Signals</NavLink>
        </NavSection>

        <NavSection label="Agents">
          <NavLink href="/trading">Trading Agent</NavLink>
          <NavLink href="/poly">Poly Agent</NavLink>
        </NavSection>

        <NavSection label="Activity">
          <NavLink href="/trades">Trades</NavLink>
          <NavLink href="/positions">Poly Positions</NavLink>
        </NavSection>

        <NavSection label="Phase 6 — Agency">
          <NavLink href="/leads">Leads</NavLink>
        </NavSection>

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

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      {children}
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block rounded px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
    >
      {children}
    </Link>
  );
}
