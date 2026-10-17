import { getServerSession } from "next-auth";
import { authOptions } from "../_lib/auth";
import { hairSalonJsonLd } from "../_lib/json-ld";
import { isNewHomeEnabled } from "../_lib/flags";
import ClassicHome from "./_components/classic-home";
import NewHome from "./_components/new-home";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(hairSalonJsonLd) }}
      />
      {isNewHomeEnabled(session) ? <NewHome session={session} /> : <ClassicHome session={session} />}
    </>
  );
}
