import { Logo } from '@/components/logo';
import { UserNav } from '@/components/user-nav';
import { Button } from './ui/button';
import Link from 'next/link';
import { ScanSearch, Image as ImageIcon } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center space-x-4">
        <Logo />
        <div className="flex flex-1 items-center justify-end space-x-2">
          <Link href="/image-capture" passHref>
            <Button variant="outline">
              <ImageIcon className="mr-2 h-4 w-4" />
              Image
            </Button>
          </Link>
          <Link href="/capture" passHref>
            <Button variant="outline">
              <ScanSearch className="mr-2 h-4 w-4" />
              Capture
            </Button>
          </Link>
          <UserNav />
        </div>
      </div>
    </header>
  );
}
