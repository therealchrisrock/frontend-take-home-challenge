import Image from 'next/image';
import Link from 'next/link';
import { UserMenu } from '~/components/user-menu';
import { cn } from '~/lib/utils';
import { getServerAuthSession } from "~/server/auth";

export async function Header({ className }: { className?: string }) {
  const session = await getServerAuthSession();
  
  return (
    <header className={cn("w-full bg-white border-b border-gray-200 shadow-sm", className)}>
      <div className="max-w-7xl mx-auto pr-4  [@media(min-width:1370px)]:pr-0">
        <div className="flex items-center justify-between h-[var(--header-height)]">
          {/* Logo and Brand */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image 
              src="/logo.png" 
              alt="Checkers Logo" 
              width={170} 
              height={48}
              className="rounded-lg"
            />
          </Link>
          
          {/* Navigation and User Menu */}
          <div className="flex items-center gap-6">
            {session?.user && (
              <nav className="hidden md:flex items-center gap-6">
                <Link 
                  href="/game" 
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Play
                </Link>
                <Link 
                  href="/friends" 
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  Friends
                </Link>
                <Link 
                  href="/messages" 
                  className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
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