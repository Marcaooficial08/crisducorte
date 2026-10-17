import Image from "next/image";
import { Card, CardContent } from "./ui/card";

interface ShopCardProps {
  name: string;
  address: string;
}

// Card horizontal da barbearia (MEL-001, 003): logo 72px + nome, endereço e dias de atendimento.
const ShopCard = ({ name, address }: ShopCardProps) => {
  return (
    <Card className="glass glow-card rounded-[var(--radius-xl)]">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[14px] bg-surface2">
          <Image src="/brand/logo-card.jpg" alt="" fill sizes="72px" priority className="object-cover" />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-bold text-title truncate">{name}</h2>
          <p className="text-body text-muted-foreground truncate">{address}</p>
          <span className="w-fit rounded-full border border-border bg-surface2 px-3 py-0.5 text-caption font-bold">Sex e Sáb</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShopCard;
