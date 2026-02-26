import type { Recipe } from "./types";

export const recipes: Recipe[] = [
  {
    title: "Pasta aglio e olio",
    category: "middag",
    ingredients: [
      "200 g spaghetti",
      "2 fedd hvitløk",
      "3 ss olivenolje",
      "1/2 ts chiliflak (valgfritt)",
      "Salt",
      "Pepper",
      "Litt persille (valgfritt)"
    ],
    steps: [
      "Kok pasta i godt saltet vann til al dente.",
      "Skjær hvitløk i tynne skiver.",
      "Varm olivenolje i en panne på lav/medium varme og fres hvitløk (ikke brenn den).",
      "Tilsett chiliflak hvis du vil ha litt varme.",
      "Ha pastaen over i pannen med litt av pastavannet og vend godt.",
      "Smak til med salt/pepper og topp med persille."
    ]
  },
  {
    title: "Omelett med ost og skinke",
    category: "frokost",
    ingredients: [
      "3 egg",
      "2 ss melk (valgfritt)",
      "Salt",
      "Pepper",
      "1 håndfull revet ost",
      "Skinke i biter (valgfritt)",
      "Smør til steking"
    ],
    steps: [
      "Visp egg (og melk) med salt og pepper.",
      "Smelt smør i en panne på medium varme.",
      "Hell i eggeblandingen og la den sette seg litt.",
      "Fordel ost og skinke over.",
      "Brett omeletten og stek til den er gjennomvarm og osten har smeltet."
    ]
  },
  {
    title: "Stekt ris med egg",
    category: "middag",
    ingredients: [
      "2 kopper kokt ris (helst kald)",
      "2 egg",
      "2 ss soyasaus",
      "1 gulrot i små terninger",
      "2 vårløk i skiver",
      "1 ss olje",
      "Salt",
      "Pepper"
    ],
    steps: [
      "Varm olje i en stor panne.",
      "Stek gulrot i 2-3 minutter.",
      "Skyv grønnsakene til siden og rør eggene raskt sammen i pannen.",
      "Tilsett ris og bland godt.",
      "Ha i soyasaus og vårløk.",
      "Smak til med salt og pepper."
    ]
  },
  {
    title: "Tomatsuppe med toast",
    category: "lunsj",
    ingredients: [
      "1 boks hakkede tomater",
      "2 dl grønnsakskraft",
      "1/2 løk, finhakket",
      "1 fedd hvitløk",
      "1 ss olivenolje",
      "Salt",
      "Pepper",
      "2 brødskiver",
      "Smør og ost til toast"
    ],
    steps: [
      "Stek løk og hvitløk mykt i olivenolje.",
      "Tilsett tomater og kraft, og la det småkoke i 10 minutter.",
      "Kjør suppen glatt med stavmikser hvis du vil ha den kremet.",
      "Smak til med salt og pepper.",
      "Stek toast med smør og ost i panne eller toastjern.",
      "Server suppen varm med toast ved siden av."
    ]
  },
  {
    title: "Kyllingwrap",
    category: "lunsj",
    ingredients: [
      "2 tortillalefser",
      "1 kyllingfilet",
      "1/2 paprika i strimler",
      "Litt salat",
      "2 ss yoghurt eller dressing",
      "1 ts olje",
      "Salt",
      "Pepper"
    ],
    steps: [
      "Krydre kylling med salt og pepper.",
      "Stek kylling i olje til den er gjennomstekt, og skjær i skiver.",
      "Varm tortillalefsene raskt i tørr panne.",
      "Fordel salat, paprika, kylling og dressing på lefsene.",
      "Rull sammen og server."
    ]
  },
  {
    title: "Bakt potet med tunfiskrøre",
    category: "middag",
    ingredients: [
      "2 store poteter",
      "1 boks tunfisk i vann",
      "2 ss lettrømme eller yoghurt",
      "1 ss mais",
      "1 ss finhakket rødløk",
      "Salt",
      "Pepper"
    ],
    steps: [
      "Prikk potetene med gaffel og bak dem i ovn på 200 grader i ca. 50 minutter.",
      "Bland tunfisk, rømme, mais og rødløk i en bolle.",
      "Smak til med salt og pepper.",
      "Skjær et snitt i de bakte potetene og fyll med tunfiskrøren."
    ]
  },
  {
    title: "Yoghurt med frukt og granola",
    category: "snack",
    ingredients: [
      "2 dl naturell yoghurt",
      "1 banan i skiver",
      "1 håndfull bær",
      "3 ss granola",
      "1 ts honning (valgfritt)"
    ],
    steps: [
      "Ha yoghurt i en bolle.",
      "Topp med banan, bær og granola.",
      "Drypp over honning hvis du vil ha det søtere."
    ]
  }
];
