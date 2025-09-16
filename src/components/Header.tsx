import Image from "next/image";
import Link from "next/link";
import { UserMenu } from "~/components/user-menu";
import { cn } from "~/lib/utils";
import { getServerAuthSession } from "~/server/auth";

export async function Header({ className }: { className?: string }) {
  const session = await getServerAuthSession();

  return (
    <header
      className={cn(
        "w-full border-b border-gray-200 bg-white shadow-sm",
        className,
      )}
    >
      <div className="mx-auto max-w-7xl pr-4 [@media(min-width:1370px)]:pr-0">
        <div className="flex h-[var(--header-height)] items-center justify-between">
          {/* Logo and Brand */}
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <Image
              src="/logo.png"
              alt="Checkers Logo"
              width={170}
              height={48}
              className="rounded-lg"
              priority
            />
          </Link>

          {/* Navigation and User Menu */}
          <div className="flex items-center gap-6">
            {session?.user && (
              <nav className="hidden items-center gap-6 md:flex">
                <Link
                  href="/game"
                  className="font-medium text-gray-600 transition-colors hover:text-gray-900"
                >
                  Play
                </Link>
                <Link
                  href="/friends"
                  className="font-medium text-gray-600 transition-colors hover:text-gray-900"
                >
                  Friends
                </Link>
                <Link
                  href="/messages"
                  className="font-medium text-gray-600 transition-colors hover:text-gray-900"
                >
                  Messages
                </Link>
              </nav>
            )}

            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
