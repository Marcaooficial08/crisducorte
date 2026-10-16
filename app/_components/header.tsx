"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { MenuIcon, ScissorsIcon } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import SideMenu from "./side-menu";
import Link from "next/link";
import AmbientGlow from "./ambient-glow";
import { cn } from "@/app/_lib/utils";





// Liga brilho e blur só depois do carregamento: os efeitos atrasavam a primeira pintura (LCP).
const useAfterLoad = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let frame = 0;
    const enable = () => {
      frame = requestAnimationFrame(() => setReady(true));
    };
    if (document.readyState === "complete") {
      enable();
    } else {
      window.addEventListener("load", enable, { once: true });
    }
    return () => {
      window.removeEventListener("load", enable);
      cancelAnimationFrame(frame);
    };
  }, []);

  return ready;
};

const Header = () => {
  const effectsReady = useAfterLoad();


  return (
    <header className="relative overflow-x-clip">
    {effectsReady && <AmbientGlow />}
    <Card className={cn("glass glass-fade", effectsReady && "glass-blur")}>
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
