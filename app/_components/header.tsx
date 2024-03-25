"use client";
import Image from "next/image";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { CalendarIcon, HomeIcon,  LogOutIcon, MenuIcon, UserIcon } from "lucide-react";
import { signIn, signOut, useSession } from 'next-auth/react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Avatar, AvatarImage } from "./ui/avatar";
import SideMenu from "./side-menu";
import Link from "next/link";





const Header = () => {
 

  return (
    <header>
    <Card>
      <CardContent className="p-5 justify-between items-center flex flex-row">
       
       <Link href="/">
        <Image src="/Logo.png" alt="FSW BARBER" height={18} width={120} />
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <MenuIcon size={16} />
            </Button>
          </SheetTrigger>
          <SheetContent className="p-0">
            <SideMenu/>
            
          </SheetContent>
        </Sheet>
      </CardContent>
    </Card>
    </header>
  );
};

export default Header;
