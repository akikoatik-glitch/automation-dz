import Link from 'next/link';
import { SearchX } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <SearchX className="h-7 w-7" />
      </span>
      <h1 className="text-xl font-extrabold text-slate-800">Page introuvable</h1>
      <p className="text-sm text-slate-500">La page que vous cherchez n'existe pas ou a été déplacée.</p>
      <Link href="/" className="btn btn-primary">Retour à l'accueil</Link>
    </div>
  );
}
