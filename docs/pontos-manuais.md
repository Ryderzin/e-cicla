# Pontos cadastrados manualmente (seed)

O OpenStreetMap tem poucos pontos de coleta de lixo eletrônico no Brasil. Para completar o mapa, a equipe pode cadastrar pontos divulgados por **fontes oficiais** (sites de prefeituras, órgãos ambientais etc.) no arquivo `api/src/main/resources/seed/points.json`.

**Não inventar pontos.** Só cadastrar o que estiver publicado por uma fonte oficial, e conferir endereço e coordenadas.

## Formato

O arquivo é uma lista JSON. Cada ponto:

```json
[
  {
    "externalId": "manual/nome-curto-do-ponto",
    "name": "Nome do ponto como aparece na fonte",
    "latitude": -23.0000,
    "longitude": -46.0000,
    "address": "Rua, número - Bairro, Cidade - UF",
    "acceptedMaterials": ["BATTERIES", "MOBILE_PHONES"],
    "openingHours": "Mo-Fr 08:00-17:00; Sa 08:00-12:00",
    "operator": "Prefeitura de ...",
    "notes": "Restrições, se houver"
  }
]
```

| Campo | Obrigatório | Observação |
|---|---|---|
| `externalId` | sim | Começa com `manual/` e não pode se repetir. É ele que evita duplicar o ponto quando a importação roda de novo. |
| `name` | sim | |
| `latitude`, `longitude` | sim | Em graus decimais (no Google Maps: clique com o botão direito no local e copie as coordenadas; o primeiro número é a latitude). |
| `acceptedMaterials` | sim | Um ou mais de: `BATTERIES` (pilhas e baterias), `COMPUTERS` (computadores), `MOBILE_PHONES` (celulares), `ELECTRICAL_ITEMS` (aparelhos elétricos e eletrônicos em geral), `SMALL_APPLIANCES` (eletrodomésticos pequenos). |
| `address` | não | |
| `openingHours` | não | De preferência no formato do OpenStreetMap (`Mo-Fr 08:00-17:00`), que o site traduz para o português. Texto livre também funciona e aparece como foi escrito. |
| `operator` | não | Quem mantém o ponto. |
| `notes` | não | Restrições, por exemplo "não recebe geladeiras". |

Entradas com problema (sem `externalId`, material desconhecido etc.) são ignoradas e aparecem no log da importação; as demais são importadas normalmente.

Depois de editar o arquivo, rode a importação de novo.
