import type { Recipe } from "./types";

export const recipes: Recipe[] = [
    {
    title: "Pasta aglio e olio",
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
  }
]