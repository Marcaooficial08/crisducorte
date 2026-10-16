import Link from "next/link";

const Footer = () => {
    return (
        <footer className="w-full bg-secondary py-6 px-page flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-caption font-bold">© {new Date().getFullYear()} Cris du Corte</p>
            <Link href="/privacidade" className="text-muted-foreground text-caption underline min-h-11 flex items-center">
                Privacidade
            </Link>
        </footer>
    );
}

export default Footer;
