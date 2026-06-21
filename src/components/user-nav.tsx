'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User as UserIcon, Settings, LogOut, Bug } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export function UserNav() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
        });
        return () => unsubscribe();
    }, []);

    const handleSignOut = async () => {
        try {
            await auth.signOut();
            toast({ title: 'Signed Out', description: 'Session terminated successfully.' });
            router.replace('/login');
        } catch (error: any) {
            toast({ title: 'Error Signing Out', description: error.message, variant: 'destructive' });
        }
    }

  if (!currentUser) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full border border-primary/10">
          <Avatar className="h-9 w-9">
            <AvatarImage src={currentUser?.photoURL || ""} alt={currentUser?.email || "User"} />
            <AvatarFallback className="bg-primary/5 text-primary text-xs">
                {currentUser?.email?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold leading-none text-primary">Intelligence Operator</p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {currentUser?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Profile Settings</span>
          </DropdownMenuItem>
          <Link href="/debug">
            <DropdownMenuItem className="cursor-pointer">
              <Bug className="mr-2 h-4 w-4" />
              <span>Diagnostic Logs</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Terminate Session</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
