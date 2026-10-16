"use client";


import { Button } from "@/app/_components/ui/button";
import { Card, CardContent } from "@/app/_components/ui/card";
import{Barbershop} from '@prisma/client';
import Image from "next/image";
import { useRouter } from "next/navigation";


interface BarbershopItemProps{
barbershop:Barbershop;
// Largura real exibida: card até 384px (uma barbearia) ou 167px (várias).
sizes?: string;
priority?: boolean;
}



const BarbershopItem  = ({barbershop, sizes = "(min-width: 424px) 384px, calc(100vw - 40px)", priority = false}:BarbershopItemProps) => {
    
const router = useRouter();
  
  const handleBookingClick = () =>
    {
        router.push(`/barbershop/${barbershop.id}`);
    }
    return ( 
        <Card className="min-w-full max-w-full rounded-2xl">
        <CardContent className="px-1 py-0 pt-1">
        <div className="w-full aspect-square relative rounded-2xl bg-[#15161A]">

<Image
alt={barbershop.name}
 src="/brand/logo-card.jpg"
fill
sizes={sizes}
priority={priority}
className="rounded-2xl object-contain" />
</div>
            
         <div className="px-2 pb-3">
         <h2 className="font-bold mt-2 overflow-hidden text-ellipsis text-nowrap">{barbershop.name}</h2>
         <p className="text-sm text-muted-foreground overflow-hidden text-ellipsis text-nowrap" >{barbershop.address}</p>

                            
        <Button className="w-full mt-3" variant="secondary" onClick={handleBookingClick}>Reservar</Button>
         
        </div>


        </CardContent>



    </Card>





     );
}
 
export default BarbershopItem;