import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { PAGE, TEXT_LINK } from '../lib/ui.ts'

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2 id={id} className="text-xl font-bold text-slate-900">
        {title}
      </h2>
      <div className="mt-2 space-y-3 text-lg text-slate-800">{children}</div>
    </section>
  )
}

// Texto revisado pela equipe. Atualize a política (e a data) sempre que o E-Cicla passar a guardar
// dados novos (aparelhos, descartes, notificações).
export default function PrivacyPage() {
  return (
    <div className={PAGE}>
      <title>Política de privacidade | E-Cicla</title>
      <article className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-slate-900">Política de privacidade</h1>
        <p className="mt-2 text-slate-600">Atualizada em 18 de outubro de 2026.</p>
        <p className="mt-4 text-lg text-slate-800">
          O E-Cicla é um projeto acadêmico da Fatec Zona Leste. Esta página explica, de forma simples, quais dados
          pessoais a plataforma usa, para quê e quais são os seus direitos, de acordo com a Lei Geral de Proteção de
          Dados (Lei nº 13.709/2018).
        </p>

        <Section id="sem-conta" title="Se você só consulta o mapa">
          <p>
            Para ver os pontos de coleta não é preciso criar conta, e o E-Cicla não pede nem grava no banco de dados
            nenhum dado pessoal seu. O site não usa cookies de propaganda nem ferramentas de rastreamento.
          </p>
          <p>
            As imagens do mapa vêm dos servidores do OpenStreetMap. Para mostrá-las, o seu navegador se conecta a esses
            servidores, que recebem o endereço de internet (IP) do seu aparelho.
          </p>
        </Section>

        <Section id="localizacao" title="Busca de pontos perto de você">
          <p>
            Ao usar o botão “Perto de mim”, o navegador pede a sua permissão para informar a localização do aparelho. A
            localização é enviada ao E-Cicla só para calcular os pontos mais próximos e não é guardada.
          </p>
          <p>
            Ao buscar um endereço, o texto digitado é enviado ao E-Cicla e ao Nominatim, o serviço de endereços do
            OpenStreetMap, para encontrar o local. O resultado fica guardado por pouco tempo na memória do servidor do
            E-Cicla, para não repetir a mesma busca, e não é gravado no banco de dados.
          </p>
        </Section>

        <Section id="conta" title="Se você cria uma conta e envia sugestões">
          <p>O E-Cicla guarda:</p>
          <ul className="list-disc space-y-1 pl-6 marker:text-emerald-700">
            <li>seu nome e seu e-mail, para identificar a sua conta;</li>
            <li>
              sua senha, apenas de forma protegida: guardamos um código calculado a partir dela, que não permite
              descobrir a senha;
            </li>
            <li>a data em que a conta foi criada e a data em que você aceitou esta política;</li>
            <li>
              as sugestões de novos pontos ou de correções que você enviar, para que a equipe possa avaliá-las e você
              acompanhe a resposta. Quando uma sugestão é aprovada, apenas os dados públicos do ponto de coleta aparecem
              no mapa (sem mostrar o seu nome nem o seu e-mail);
            </li>
            <li>
              um código de acesso para cada navegador em que você entrou, que vale por 30 dias ou até você sair da
              conta. Esse código também fica guardado no seu navegador, para você não precisar entrar de novo a cada
              visita.
            </li>
          </ul>
          <p>Esses dados são usados só para o funcionamento da plataforma e não são vendidos nem cedidos a terceiros.</p>
        </Section>

        <Section id="onde" title="Onde os dados ficam">
          <p>
            O banco de dados fica no serviço MongoDB Atlas, em servidores no Brasil (São Paulo). O servidor da
            plataforma fica no serviço Render, nos Estados Unidos; por isso, os dados passam por lá quando você usa o
            site.
          </p>
        </Section>

        <Section id="direitos" title="Seus direitos">
          <p>
            Você pode consultar seus dados, corrigir seu nome, editar ou excluir suas sugestões em análise e excluir sua
            conta a qualquer momento. Em{' '}
            <Link to="/conta" className={TEXT_LINK}>
              Minha conta
            </Link>
            , você pode atualizar seu nome ou usar a opção “Excluir minha conta” para apagar sua conta e seus dados
            pessoais na hora.
          </p>
          <p>
            Para dúvidas ou solicitações sobre seus dados pessoais, entre em contato com a equipe do projeto na Fatec
            Zona Leste pelo repositório oficial do projeto (<span className="font-medium">github.com/Ryderzin/e-cicla</span>).
          </p>
        </Section>

        <Section id="mudancas" title="Mudanças nesta política">
          <p>
            Quando o E-Cicla passar a usar outros dados, esta página será atualizada antes, com a nova data no início.
          </p>
        </Section>
      </article>
    </div>
  )
}
