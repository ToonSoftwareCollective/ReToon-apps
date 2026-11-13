# AnalogClock

Analoge klokkaart als alternatief voor de digitale ReToon-klok. De wijzerplaat
blijft rond en gecentreerd, ook bij een brede of hoge kaart. De tijd volgt de
lokale klok en tijdzone van de Toon. Home Assistant en internet zijn niet nodig.
Vereist app-API 2.

## Instellen

Voeg in de webinterface een **App**-kaart toe en kies **AnalogClock**.
De aanbevolen kaarthoogte is 300 pixels; de klok schaalt automatisch mee.

Onder **Apps → AnalogClock** zijn vier kleurvelden beschikbaar: algemene
klokkleur (rand en standaardkleur), wijzers, uurmarkeringen en minuutmarkeringen.

- Standaardkleuren: `wit`, `grijs`, `donkerblauw`, `rood`, `donkergroen`.
- Eigen kleuren: `#` gevolgd door precies zes hexadecimale tekens (`0-9`, `a-f`).
  Bijvoorbeeld `#ff9900` voor oranje of `#ffffff` voor wit.
- Themakleuren: `text`, `muted`, `accent`, `ok`, `warn`, `bad`, `card`, `background`.
- Algemene kleur leeg of ongeldig: themakleur `text`. Overige velden leeg of
  ongeldig: algemene klokkleur. Hoofdletters en omringende spaties zijn toegestaan.

Met **Zwarte achtergrond** kies je zwart (aan, standaard) of de standaard
ReToon-kaartkleur (uit). Dit verandert het appvlak en de wijzerplaat. De buitenste
kaartpadding wordt door ReToon bepaald en kan bij een zwarte achtergrond grijs
blijven. De huidige app-API ondersteunt geen kleurdropdown; kleuren zijn tekstvelden.

## Werking en validatie

De uur- en minuutwijzer worden iedere seconde bijgewerkt met `el.set` op bestaande
tekenelementen. Dikkere wijzers bestaan uit dicht overlappende cirkels met
afgeronde uiteinden. De geometrische golving tussen cirkels blijft kleiner dan
0,15 schermpixel bij ondersteunde kaartafmetingen; ReToon verzorgt de rastering.
Er zijn geen netwerkverzoeken, services, credentials of
apparaatgebonden instellingen. Tekenfuncties werken ook zonder ingevulde instellingen.

Het ontwerp is visueel bevestigd op Toon 2 met ReToon 1.38. De achtergrondkeuze
is lokaal getest met een gesimuleerde ReToon-API. Toon 1 is niet op een apparaat getest.

Licentie: GPL-2.0-or-later, zie LICENSE.
