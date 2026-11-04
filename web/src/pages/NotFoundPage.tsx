import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <title>Página não encontrada | E-Cicla</title>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Página não encontrada</h1>
      <p className="mt-3 text-lg text-slate-700 dark:text-slate-300">O endereço que você abriu não existe.</p>
      <p className="mt-6 flex flex-wrap gap-4">
        <Link to="/" className="font-semibold text-emerald-800 underline underline-offset-4 dark:text-emerald-400">
          Ir para a página inicial
        </Link>
        <Link to="/mapa" className="font-semibold text-emerald-800 underline underline-offset-4 dark:text-emerald-400">
          Ver pontos no mapa
        </Link>
      </p>
    </div>
  )
}
