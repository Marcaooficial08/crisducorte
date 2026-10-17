"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { SheetClose, SheetHeader, SheetTitle } from "./ui/sheet";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { CalendarIcon, HomeIcon, LogInIcon, LogOutIcon, LucideIcon, ShieldCheckIcon, ShieldIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/app/_lib/utils";

type MenuItem = { href: string; label: string; icon: LucideIcon };

const isCurrent = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

const SideMenu = () => {
  const { data } = useSession();
  const pathname = usePathname() ?? "";

  const handleLogoutClick = () => signOut();

  const handleLoginClick = () => signIn("google");

  const items: MenuItem[] = [
    { href: "/", label: "Início", icon: HomeIcon },
    ...(data?.user
      ? [
          { href: "/bookings", label: "Meus agendamentos", icon: CalendarIcon },
          { href: "/perfil", label: "Perfil", icon: UserIcon },
        ]
      : []),
    ...(data?.user?.isAdmin ? [{ href: "/adm", label: "Admin", icon: ShieldCheckIcon }] : []),
    { href: "/privacidade", label: "Privacidade", icon: ShieldIcon },
  ];

  return (
    <>
      <SheetHeader className="text-left border-b border-solid border-secondary p-5">
        <SheetTitle>Menu</SheetTitle>
      </SheetHeader>

      {data?.user ? (
        <div className="flex px-page py-6 items-center gap-3">
          <Avatar>
            <AvatarImage src={data.user?.image ?? ""} alt={data.user.name ?? ""} />
          </Avatar>

          <h2 className="font-bold">{data.user.name}</h2>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-page py-6">
          <UserIcon size={32} aria-hidden="true" />
          <h2 className="font-bold">Olá, faça seu login!</h2>
        </div>
      )}

      <nav aria-label="Menu principal" className="flex flex-col gap-3 px-page">
        {items.map(({ href, label, icon: Icon }) => {
          const current = isCurrent(pathname, href);
          return (
            <Button
              key={href}
              variant="outline"
              className={cn("justify-start", current && "border-accent text-accent-soft")}
              asChild
            >
              <SheetClose asChild>
                <Link href={href} aria-current={current ? "page" : undefined}>
                  <Icon size={18} className="mr-2" aria-hidden="true" />
                  {label}
                </Link>
              </SheetClose>
            </Button>
          );
        })}

        {data?.user ? (
          <Button type="button" variant="secondary" className="justify-start" onClick={handleLogoutClick}>
            <LogOutIcon size={18} className="mr-2" aria-hidden="true" />
            Sair
          </Button>
        ) : (
          <>
            <Button type="button" variant="secondary" className="justify-start" onClick={handleLoginClick}>
              <LogInIcon size={18} className="mr-2" aria-hidden="true" />
              Fazer login
            </Button>
            <p className="text-caption text-muted-foreground">
              Ao entrar, você concorda com a{" "}
              <Link href="/privacidade" className="underline">
                Política de Privacidade
              </Link>
              .
            </p>
          </>
        )}
      </nav>
    </>
  );
};

export default SideMenu;
