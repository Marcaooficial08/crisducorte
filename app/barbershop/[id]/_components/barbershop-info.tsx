"use client";

import SideMenu from "@/app/_components/side-menu";
import { Button } from "@/app/_components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/app/_components/ui/sheet";
import { Barbershop } from "@prisma/client";
import { ChevronLeftIcon, MapPinIcon, MenuIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Router } from "next/router";

interface BarbershopInfoProps
{
   barbershop:Barbershop
    
}

const BarbershopInfo  = ({barbershop}: BarbershopInfoProps) => {
    const router = useRouter();

    const handleBackClick =() =>{
       router.replace("/");

    }
    return ( 
        <div>

                <div className="w-full relative bg-[#15161A]">
                     


                    <Button onClick={handleBackClick} size="icon" variant="outline" className="z-50 absolute top-4 left-4" aria-label="Voltar">
                      <ChevronLeftIcon aria-hidden="true"/>

                    </Button>

                    

                   < Sheet>
          <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="z-50 absolute top-4 right-4" aria-label="Abrir menu">
                      <MenuIcon aria-hidden="true"/>

                    </Button>
          </SheetTrigger>

          <SheetContent className="p-0">
            <SideMenu/>
            
          </SheetContent>
        </Sheet>
                 
                    <div className="relative mx-auto aspect-square w-full max-w-sm">
                      <Image src="/brand/logo-card.jpg" fill alt={barbershop.name} priority sizes="(min-width: 640px) 384px, 100vw" className="object-contain" />
                    </div>

                  

                </div>
                <div className="px-5  py-3 pb-6 border-b border-solid border-secondary">

              <h1 className="text-xl font-bold  ">{barbershop.name}</h1>
             
                 <div className="flex items-center gap-1 mt-2">
                    <MapPinIcon className="text-accent" size={18} aria-hidden="true"/>
                 <p className="text-sm">{barbershop.address}</p>
                 </div>
              </div>

               </div>

















     );
}
 
export default BarbershopInfo  ;