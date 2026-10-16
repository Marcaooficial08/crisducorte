import Link from "next/link";

const Footer = () => {
    return (
        <footer className="w-full bg-secondary py-6 px-5 flex items-center justify-between gap-3">
            <p className="text-gray-400 text-xs font-bold opacity-75">© {new Date().getFullYear()} Cris du Corte</p>
            <Link href="/privacidade" className="text-gray-400 text-xs underline min-h-11 flex items-center">
                Privacidade
            </Link>
        </footer>
    );
}

export default Footer;
