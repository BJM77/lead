'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Logo } from './logo';
import { UserNav } from './user-nav';
import { MobileNav } from './mobile-nav';
import {
  LayoutDashboard,
  ScanSearch,
  Image as ImageIcon,
  Bug,
  ListPlus,
  MessageSquareQuote,
  Map,
  Users,
  SearchCode
} from 'lucide-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/leads', label: 'Leads', icon: Users },
    { href: '/discover-urls', label: 'URL Discovery', icon: SearchCode },
    { href: '/bulk-capture', label: 'Bulk Capture', icon: ListPlus },
    { href: '/social-capture', label: 'Social Capture', icon: MessageSquareQuote },
    { href: '/image-capture', label: 'Ad Capture', icon: ImageIcon },
    { href: '/capture', label: 'Web Page Capture', icon: ScanSearch },
    { href: '/street-view-capture', label: 'Street View', icon: Map },
    { href: '/debug', label: 'Debug Logs', icon: Bug },
  ];

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarRail />
        <SidebarHeader>
          <Logo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <SidebarTrigger className="sm:hidden" />
            <div className="relative ml-auto flex-1 md:grow-0">
            </div>
            <UserNav />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 pb-20 sm:px-6 sm:py-0 md:gap-8 sm:pb-0">
            {children}
        </main>
      </SidebarInset>
      <MobileNav />
    </SidebarProvider>
  );
}
