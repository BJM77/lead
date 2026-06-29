'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ScanSearch,
  Image as ImageIcon,
  Users,
  SearchCode
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/leads', label: 'Leads', icon: Users },
    { href: '/discover-urls', label: 'URL Discovery', icon: SearchCode },
    { href: '/image-capture', label: 'Ad Capture', icon: ImageIcon },
    { href: '/capture', label: 'Web Page Capture', icon: ScanSearch },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-background px-2 sm:hidden pb-safe">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors hover:text-primary",
              isActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none truncate max-w-full px-1 text-center">
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
