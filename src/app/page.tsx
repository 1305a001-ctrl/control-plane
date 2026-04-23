import Link from "next/link";
import { auth } from "~/server/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 text-white">
      <div className="container flex flex-col items-center gap-8 px-4 py-16 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Control Plane
        </h1>
        <p className="text-gray-400">
          the2357.com — trading signal infrastructure
        </p>

        <div className="flex flex-col items-center gap-4">
          {session?.user ? (
            <>
              <p className="text-sm text-gray-400">
                Signed in as {session.user.email}
              </p>
              <div className="flex gap-4">
                <Link
                  href="/configs"
                  className="rounded-md bg-white/10 px-6 py-2 font-medium hover:bg-white/20"
                >
                  Research Configs
                </Link>
                <Link
                  href="/strategies"
                  className="rounded-md bg-white/10 px-6 py-2 font-medium hover:bg-white/20"
                >
                  Strategies
                </Link>
                <Link
                  href="/signals"
                  className="rounded-md bg-white/10 px-6 py-2 font-medium hover:bg-white/20"
                >
                  Signals
                </Link>
              </div>
              <Link
                href="/api/auth/signout"
                className="text-sm text-gray-500 hover:text-gray-300"
              >
                Sign out
              </Link>
            </>
          ) : (
            <Link
              href="/api/auth/signin"
              className="rounded-md bg-indigo-600 px-8 py-3 font-semibold hover:bg-indigo-500"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
