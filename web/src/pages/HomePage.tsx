import type { ReactNode } from 'react'
import { Link } from 'react-router'

import {
  ApplianceIcon,
  BatteryIcon,
  BoxIcon,
  ChargerIcon,
  ChecklistIcon,
  LaptopIcon,
  MapPinIcon,
  PhoneIcon,
  RecycleIcon,
  WarningIcon,
} from '../components/icons.tsx'

const EXAMPLES: { icon: ReactNode; label: string }[] = [
  { icon: <PhoneIcon />, label: 'Celulares e tablets' },
  { icon: <BatteryIcon />, label: 'Pilhas e baterias' },
  { icon: <ChargerIcon />, label: 'Carregadores e cabos' },
  { icon: <LaptopIcon />, label: 'Computadores, notebooks, teclados e mouses' },
  { icon: <ApplianceIcon />, label: 'Eletrodomésticos pequenos, como liquidificador, secador de cabelo e ferro de passar' },
]

const STEPS: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <MapPinIcon className="size-7" />,
    title: 'Encontre um ponto perto de você',
    text: 'Abra o mapa e veja os pontos de coleta da sua região.',
  },
  {
    icon: <ChecklistIcon className="size-7" />,
    title: 'Confira o que ele aceita',
    text: 'Toque no ponto para ver os materiais aceitos, os horários e as observações.',
  },
  {
    icon: <BoxIcon className="size-7" />,
    title: 'Leve seu aparelho',
    text: 'Use o botão "Como chegar" para abrir a rota. Antes de entregar celulares e computadores, apague seus dados pessoais.',
  },
]

function MapButton() {
  return (
    <Link
      to="/mapa"
      className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-3 text-base font-semibold text-white shadow-sm hover:bg-emerald-800"
    >
      <MapPinIcon className="size-5" />
      Ver pontos no mapa
    </Link>
  )
}

export default function HomePage() {
  return (
    <>
      <title>E-Cicla: onde descartar lixo eletrônico</title>

      <section aria-labelledby="inicio-titulo" className="bg-emerald-50">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <h1 id="inicio-titulo" className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Descarte seu lixo eletrônico no lugar certo
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-700">
            O E-Cicla mostra no mapa onde entregar celulares, pilhas, carregadores e outros aparelhos que você não usa
            mais. Para consultar os pontos de coleta, não é preciso criar conta.
          </p>
          <div className="mt-8">
            <MapButton />
          </div>
        </div>
      </section>

      <section aria-labelledby="o-que-e-titulo">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 id="o-que-e-titulo" className="text-2xl font-bold text-slate-900 md:text-3xl">
            O que é lixo eletrônico?
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-slate-700">
            É todo aparelho elétrico ou eletrônico que quebrou, ficou velho ou que você não usa mais, e também as peças e
            os acessórios dele. Alguns exemplos do dia a dia:
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXAMPLES.map(({ icon, label }) => (
              <li key={label} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                <span className="rounded-lg bg-emerald-100 p-2 text-emerald-800">{icon}</span>
                <span className="pt-1.5 text-slate-800">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="por-que-titulo" className="bg-slate-50">
        {/* TODO: revisar texto */}
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 id="por-que-titulo" className="text-2xl font-bold text-slate-900 md:text-3xl">
            Por que não jogar no lixo comum?
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-amber-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-amber-100 p-2 text-amber-800">
                  <WarningIcon />
                </span>
                <h3 className="text-lg font-semibold text-slate-900">Pode contaminar o solo e a água</h3>
              </div>
              <p className="mt-3 text-slate-700">
                Muitos aparelhos têm substâncias tóxicas, como chumbo, mercúrio e cádmio. Jogados no lixo comum, eles vão
                parar em lixões e aterros, onde essas substâncias podem se soltar e contaminar o solo e a água.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-emerald-100 p-2 text-emerald-800">
                  <RecycleIcon />
                </span>
                <h3 className="text-lg font-semibold text-slate-900">No ponto de coleta, vira reciclagem</h3>
              </div>
              <p className="mt-3 text-slate-700">
                Entregues num ponto de coleta, os aparelhos seguem para reciclagem: metais e plásticos podem ser
                reaproveitados e as partes perigosas recebem o tratamento adequado.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="como-funciona-titulo">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 id="como-funciona-titulo" className="text-2xl font-bold text-slate-900 md:text-3xl">
            Como funciona
          </h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ icon, title, text }, index) => (
              <li key={title} className="rounded-xl border border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-emerald-700 font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="text-emerald-800">{icon}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-slate-700">{text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <MapButton />
          </div>
        </div>
      </section>

      <div className="border-t border-slate-200 bg-slate-50">
        <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-600">
          Os pontos de coleta vêm de fontes públicas: o OpenStreetMap, um mapa feito de forma colaborativa, e
          informações divulgadas por prefeituras e outros órgãos públicos.
        </p>
      </div>
    </>
  )
}
