export interface TourStep {
  step: number
  path?: string
  selector: string
  fallbackSelector?: string
  title: string
  text: string
}

export const TOUR_STEPS: TourStep[] = [
  {
    step: 1,
    path: '/',
    selector: 'logo',
    title: 'Bem-vindo ao E-Cicla',
    text: 'Este passo a passo mostra cada parte do site. Você pode sair quando quiser e repetir pelo botão “Tutorial”, no alto da página.',
  },
  {
    step: 2,
    path: '/',
    selector: 'o-que-e',
    title: 'O que é lixo eletrônico',
    text: 'É todo aparelho elétrico ou eletrônico que quebrou, ficou velho ou que você não usa mais, e também as peças e os acessórios dele: celulares, pilhas, carregadores, computadores e pequenos eletrodomésticos.',
  },
  {
    step: 3,
    path: '/',
    selector: 'menu',
    title: 'Menu principal',
    text: 'Use o menu para ir à página inicial, ao mapa de pontos e às suas sugestões.',
  },
  {
    step: 4,
    path: '/',
    selector: 'busca-inicio',
    title: 'Encontre um ponto',
    text: 'Digite um endereço ou use “Perto de mim” para ver os pontos de coleta mais próximos.',
  },
  {
    step: 5,
    path: '/mapa',
    selector: 'perto-de-mim',
    title: 'Pontos perto de você',
    text: 'Toque em “Perto de mim” para usar a sua localização, ou digite um endereço. A lista mostra os pontos mais próximos e a distância até cada um.',
  },
  {
    step: 6,
    path: '/mapa',
    selector: 'mapa',
    title: 'Mapa de pontos',
    text: 'Cada marcador é um ponto de coleta. Toque em um para ver o que ele aceita e quando funciona.',
  },
  {
    step: 7,
    path: '/mapa',
    selector: 'detalhes',
    fallbackSelector: 'mapa',
    title: 'Detalhes do ponto',
    text: 'Veja os materiais aceitos, o endereço e o horário. “Como chegar” abre a rota no seu celular, e “Sugerir correção” avisa a equipe se algo estiver errado.',
  },
  {
    step: 8,
    selector: 'conta',
    title: 'Sua conta',
    text: 'Entre ou crie uma conta para sugerir novos pontos e correções.',
  },
]
