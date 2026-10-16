"use client";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { MenuIcon, ScissorsIcon } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import SideMenu from "./side-menu";
import Link from "next/link";





const Header = () => {


  return (
    <header>
    <Card>
      <CardContent className="p-5 justify-between items-center flex flex-row">

       <Link href="/" aria-label="Cris du Corte — início" className="flex items-center gap-2 min-h-11">
        <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[#8162FF]">
          <ScissorsIcon size={18} className="text-[#8162FF]" aria-hidden="true" />
        </span>
        <span className="font-brand text-lg leading-none">Cris du Corte</span>
        </Link>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Abrir menu">
              <MenuIcon size={16} aria-hidden="true" />
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
