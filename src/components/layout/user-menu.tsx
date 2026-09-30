"use client";

import { ChevronDown, KeyRound, LogOut } from "lucide-react";
import { useRef, useState } from "react";

import { OwnPasswordDialog } from "@/components/users/own-password-dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/format";

type UserMenuProps = {
  name: string;
  email: string;
  roleLabel: string;
  /** Para onde ir após sair. */
  signOutRedirect: string;
};

export function UserMenu({ name, email, roleLabel, signOutRedirect }: UserMenuProps) {
  // O form fica fora do portal do menu para não ser desmontado antes do envio
  const signOutForm = useRef<HTMLFormElement>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);

  return (
    <>
      <form
        ref={signOutForm}
        action={`/auth/signout?next=${encodeURIComponent(signOutRedirect)}`}
        method="post"
        hidden
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-10 gap-2 px-2" aria-label="Menu do usuário">
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-40 flex-col items-start leading-tight sm:flex">
              <span className="truncate text-sm font-medium">{name}</span>
              <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
            </span>
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">{name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>
            <KeyRound aria-hidden />
            Minha senha
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => signOutForm.current?.requestSubmit()}>
            <LogOut aria-hidden />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Fora do menu: continua aberto depois que o menu fecha */}
      <OwnPasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  );
}
