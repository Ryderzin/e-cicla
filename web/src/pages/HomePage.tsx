import { type ReactNode, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'

import type { Material } from '../api/points.ts'
import { fetchPoints } from '../api/points.ts'
import eWastePhoto from '../assets/lixo-eletronico.jpg'
import { Notice } from '../components/forms.tsx'
import HeroIllustration from '../components/home/HeroIllustration.tsx'
import HeroSearch from '../components/home/HeroSearch.tsx'
import {
  ApplianceIcon,
  BatteryIcon,
  BoxIcon,
  CheckIcon,
  ChecklistIcon,
  ChevronDownIcon,
  LaptopIcon,
  MapPinIcon,
  PhoneIcon,
  PlugIcon,
} from '../components/icons.tsx'
import Reveal from '../components/Reveal.tsx'
import { MATERIAL_LABELS, MATERIALS } from '../lib/materials.ts'
import { REGION_BOUNDS } from '../lib/region.ts'
import { TEXT_LINK } from '../lib/ui.ts'

const EXAMPLES = [
  'Celulares e tablets',
  'Pilhas e baterias',
  'Carregadores e cabos',
  'Computadores, notebooks, teclados e mouses',
  'Eletrodomésticos pequenos, como liquidificador, secador de cabelo e ferro de passar',
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

// TODO: revisar texto. Os mesmos tipos que aparecem em "Materiais aceitos" nos detalhes de cada ponto.
const MATERIAL_CARDS: Record<Material, { icon: ReactNode; text: string }> = {
  BATTERIES: {
    icon: <BatteryIcon className="size-7" />,
    text: 'Pilhas comuns e recarregáveis e baterias de celular, de notebook e de outros aparelhos portáteis.',
  },
  MOBILE_PHONES: {
    icon: <PhoneIcon className="size-7" />,
    text: 'Celulares e smartphones de qualquer marca ou modelo, funcionando ou não.',
  },
  COMPUTERS: {
    icon: <LaptopIcon className="size-7" />,
    text: 'Computadores, notebooks, monitores, teclados, mouses e outras peças de informática.',
  },
  SMALL_APPLIANCES: {
    icon: <ApplianceIcon className="size-7" />,
    text: 'Liquidificador, secador de cabelo, ferro de passar, torradeira e outros aparelhos pequenos da casa.',
  },
  ELECTRICAL_ITEMS: {
    icon: <PlugIcon className="size-7" />,
    text: 'Outros aparelhos elétricos e eletrônicos, como rádios, controles remotos, cabos e carregadores.',
  },
}

// TODO: revisar texto.
const TIPS: { title: string; text: string }[] = [
  {
    title: 'Guarde o que é importante',
    text: 'Copie as fotos, os contatos e os arquivos que você quer manter.',
  },
  {
    title: 'Apague seus dados',
    text: 'Saia das suas contas e restaure o celular ou o computador para as configurações de fábrica.',
  },
  {
    title: 'Tire o chip e o cartão de memória',
    text: 'Eles podem guardar informações pessoais. Fique com eles ou descarte-os separadamente.',
  },
  {
    title: 'Separe as pilhas',
    text: 'Se o aparelho usa pilhas, retire-as e leve a um ponto que aceite pilhas e baterias.',
  },
  {
    title: 'Confira o ponto antes de sair',
    text: 'Veja no mapa os materiais aceitos e o horário. Se puder, confirme com o local.',
  },
]

// TODO: revisar texto.
const QUESTIONS: { question: string; answer: string }[] = [
  {
    question: 'O ponto de coleta pode recusar meu aparelho?',
    answer:
      'Pode. Cada ponto recebe só alguns tipos de material e alguns têm restrições. Antes de sair, confira os materiais aceitos e as observações nos detalhes do ponto.',
  },
  {
    question: 'De onde vêm os pontos do mapa?',
    answer:
      'De fontes públicas: o OpenStreetMap, um mapa feito de forma colaborativa, e informações divulgadas por prefeituras e outros órgãos públicos. A equipe do E-Cicla revisa e corrige os pontos.',
  },
  {
    question: 'As informações dos pontos estão sempre atualizadas?',
    answer: 'Horários e regras podem mudar. Se puder, confirme com o local antes de ir.',
  },
]

// Most common first; "other devices" closes the list.
const MATERIAL_ORDER: Material[] = ['MOBILE_PHONES', 'BATTERIES', 'COMPUTERS', 'SMALL_APPLIANCES', 'ELECTRICAL_ITEMS']

const STAT_NUMBER = 'block text-2xl font-bold text-emerald-800 sm:text-4xl'
const STAT_LABEL = 'mt-1 block text-sm text-slate-700 sm:text-base'
const STAT_CARD = 'rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-5'

const CARD_MOTION = 'motion-safe:transition motion-safe:duration-200 motion-safe:hover:-translate-y-1 hover:shadow-md'

function MapButton({ inverted = false }: { inverted?: boolean }) {
  const colors = inverted
    ? 'bg-white text-emerald-900 hover:bg-emerald-50'
    : 'bg-emerald-700 text-white hover:bg-emerald-800'
  return (
    <Link
      to="/mapa"
      className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 text-base font-semibold shadow-sm ${colors}`}
    >
      <MapPinIcon className="size-5" />
      Ver pontos no mapa
    </Link>
  )
}

/** Live number of points on the map, read from the API (it also wakes the API up before the map opens). */
function PointsCount() {
  const [count, setCount] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetchPoints(REGION_BOUNDS, controller.signal)
      .then((points) => setCount(points.length))
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailed(true)
        }
      })
    return () => controller.abort()
  }, [])

  if (failed) {
    return (
      <p className="font-semibold text-slate-900 sm:text-lg">Pontos de coleta de fontes públicas num só mapa</p>
    )
  }
  return (
    <p>
      <span className={STAT_NUMBER} aria-hidden={count === null}>
        {count === null ? (
          <span className="inline-block h-7 w-10 rounded-md bg-emerald-100 motion-safe:animate-pulse sm:h-9 sm:w-12" />
        ) : (
          count
        )}
      </span>
      <span className={STAT_LABEL}>
        {count === null ? (
          <span role="status">Contando os pontos…</span>
        ) : (
          `${count === 1 ? 'ponto de coleta' : 'pontos de coleta'} no estado de São Paulo`
        )}
      </span>
    </p>
  )
}

function SectionTitle({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="text-2xl font-bold text-slate-900 md:text-3xl">
      {children}
    </h2>
  )
}

export default function HomePage() {
  // Message from the page that sent people here, e.g. after deleting the account.
  const message = (useLocation().state as { message?: string } | null)?.message
  return (
    <>
      <title>E-Cicla: onde descartar lixo eletrônico</title>

      {message && (
        <div className="mx-auto w-full max-w-6xl px-4 pt-6">
          <Notice kind="success">{message}</Notice>
        </div>
      )}

      <section aria-labelledby="inicio-titulo" className="relative overflow-hidden bg-emerald-50">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-14 pb-24 md:grid-cols-[1.1fr_1fr] md:pt-20 md:pb-32">
          <div>
            <h1 id="inicio-titulo" className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
              Descarte seu lixo eletrônico no lugar certo
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-slate-700">
              O E-Cicla mostra no mapa onde entregar celulares, pilhas, carregadores e outros aparelhos que você não usa
              mais. Para consultar os pontos de coleta, não é preciso criar conta.
            </p>
            <HeroSearch />
            <p className="mt-4 text-slate-700">
              Prefere explorar?{' '}
              <Link to="/mapa" className={TEXT_LINK}>
                Ver todos os pontos no mapa
              </Link>
            </p>
          </div>
          <HeroIllustration className="hidden md:block" />
        </div>
        {/* Wave between the top of the page and the rest */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-12 w-full md:h-16"
        >
          <path d="M0 40 C 240 90, 480 0, 720 30 S 1200 80, 1440 30 L 1440 80 L 0 80 Z" fill="#ffffff" />
        </svg>
      </section>

      <section aria-label="O E-Cicla em números" className="relative -mt-6 md:-mt-10">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-2 px-4 sm:gap-4">
          <Reveal className={STAT_CARD}>
            <PointsCount />
          </Reveal>
          <Reveal className={STAT_CARD} delay={100}>
            <p>
              <span className={STAT_NUMBER}>{MATERIALS.length}</span>
              <span className={STAT_LABEL}>tipos de material para conferir em cada ponto</span>
            </p>
          </Reveal>
        </div>
      </section>

      <section aria-labelledby="o-que-e-titulo">
        <Reveal className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2">
          <div>
            <SectionTitle id="o-que-e-titulo">O que é lixo eletrônico?</SectionTitle>
            <p className="mt-3 text-lg text-slate-700">
              É todo aparelho elétrico ou eletrônico que quebrou, ficou velho ou que você não usa mais, e também as peças
              e os acessórios dele. Alguns exemplos do dia a dia:
            </p>
            <ul className="mt-5 list-disc space-y-2 pl-6 text-lg text-slate-800 marker:text-emerald-700">
              {EXAMPLES.map((example) => (
                <li key={example}>{example}</li>
              ))}
            </ul>
          </div>
          <img
            src={eWastePhoto}
            alt="Celulares antigos, teclado, câmera digital, carregadores e placa de computador descartados"
            width={1300}
            height={736}
            loading="lazy"
            className="h-auto w-full rounded-xl shadow-sm"
          />
        </Reveal>
      </section>

      <section aria-labelledby="por-que-titulo" className="bg-slate-50">
        {/* TODO: revisar texto */}
        <div className="mx-auto max-w-6xl px-4 py-14">
          <Reveal>
            <SectionTitle id="por-que-titulo">Por que não jogar no lixo comum?</SectionTitle>
          </Reveal>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <Reveal className={`rounded-xl border border-amber-200 bg-white p-5 ${CARD_MOTION}`}>
              <h3 className="text-lg font-semibold text-slate-900">Pode contaminar o solo e a água</h3>
              <p className="mt-3 text-slate-700">
                Muitos aparelhos têm substâncias tóxicas, como chumbo, mercúrio e cádmio. Jogados no lixo comum, eles vão
                parar em lixões e aterros, onde essas substâncias podem se soltar e contaminar o solo e a água.
              </p>
            </Reveal>
            <Reveal className={`rounded-xl border border-emerald-200 bg-white p-5 ${CARD_MOTION}`} delay={100}>
              <h3 className="text-lg font-semibold text-slate-900">No ponto de coleta, vira reciclagem</h3>
              <p className="mt-3 text-slate-700">
                Entregues num ponto de coleta, os aparelhos seguem para reciclagem: metais e plásticos podem ser
                reaproveitados e as partes perigosas recebem o tratamento adequado.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section aria-labelledby="como-funciona-titulo">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <Reveal>
            <SectionTitle id="como-funciona-titulo">Como funciona</SectionTitle>
          </Reveal>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map(({ icon, title, text }, index) => (
              <li key={title}>
                <Reveal className={`h-full rounded-xl border border-slate-200 p-5 ${CARD_MOTION}`} delay={index * 120}>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-emerald-700 font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="text-emerald-800">{icon}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
                  <p className="mt-2 text-slate-700">{text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="o-que-levar-titulo" className="bg-emerald-50">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <Reveal>
            <SectionTitle id="o-que-levar-titulo">O que você pode levar</SectionTitle>
            <p className="mt-3 max-w-3xl text-lg text-slate-700">
              Cada ponto de coleta aceita alguns destes tipos de material. No mapa, os detalhes do ponto mostram quais.
            </p>
          </Reveal>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {MATERIAL_ORDER.map((material, index) => (
              <li key={material}>
                <Reveal
                  className={`flex h-full gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-emerald-100 sm:block sm:p-5 ${CARD_MOTION}`}
                  delay={index * 80}
                >
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                    {MATERIAL_CARDS[material].icon}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-900 sm:mt-4">{MATERIAL_LABELS[material]}</h3>
                    <p className="mt-1 text-slate-700 sm:mt-2">{MATERIAL_CARDS[material].text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="antes-titulo">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1fr_1.4fr]">
          <Reveal className="md:sticky md:top-8 md:self-start">
            <SectionTitle id="antes-titulo">Antes de levar seu aparelho</SectionTitle>
            <p className="mt-3 text-lg text-slate-700">
              Alguns cuidados rápidos protegem seus dados e evitam uma viagem perdida.
            </p>
          </Reveal>
          <ul className="space-y-3">
            {TIPS.map(({ title, text }, index) => (
              <li key={title}>
                <Reveal className="flex gap-4 rounded-xl border border-slate-200 p-4" delay={index * 80}>
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                    <CheckIcon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-semibold text-slate-900">{title}</span>
                    <span className="mt-0.5 block text-slate-700">{text}</span>
                  </span>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="perguntas-titulo" className="bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-14">
          <Reveal>
            <SectionTitle id="perguntas-titulo">Perguntas frequentes</SectionTitle>
          </Reveal>
          <div className="mt-6 space-y-3">
            {QUESTIONS.map(({ question, answer }) => (
              <details key={question} className="group rounded-xl border border-slate-200 bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-4 font-semibold text-slate-900 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  {question}
                  <ChevronDownIcon className="size-5 shrink-0 text-slate-600 motion-safe:transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-4 pb-4 text-slate-700">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="chamada-titulo" className="bg-emerald-800">
        <Reveal className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="chamada-titulo" className="text-2xl font-bold text-white md:text-3xl">
              Tem um aparelho parado em casa?
            </h2>
            <p className="mt-2 text-lg text-emerald-50">Encontre agora o ponto de coleta mais perto de você.</p>
          </div>
          <MapButton inverted />
        </Reveal>
      </section>

      <div className="border-t border-slate-200 bg-slate-50">
        <p className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-600">
          Os pontos de coleta vêm de fontes públicas: o OpenStreetMap, um mapa feito de forma colaborativa, e
          informações divulgadas por prefeituras e outros órgãos públicos.{' '}
          <Link to="/privacidade" className="font-medium text-slate-700 underline underline-offset-4">
            Política de privacidade
          </Link>
        </p>
      </div>
    </>
  )
}
