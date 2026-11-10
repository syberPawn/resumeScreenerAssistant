import { Header } from "@/components/Header";
import { Workspace } from "@/components/Workspace";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        <h1 className="sr-only">Analyse a candidate</h1>
        <Workspace />
      </main>
    </>
  );
}
