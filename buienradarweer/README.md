# BuienradarWeer

Actueel weer en vijfdaagse verwachting voor ReToon, via de bestaande Home Assistant-verbinding. Vereist app-API 10 (ReToon 1.50 of hoger); compatibel met de huidige ReToon-app-API. Nieuwere GIF- en boogfuncties zijn voor deze app niet nodig. Toon 1 is niet getest.

De kaart toont een groot gekleurd weericoon, temperatuur met kleinere eenheid en, bij voldoende hoogte, luchtdruk en wind. Aantikken opent het detailscherm met gevoelstemperatuur, luchtdruk, luchtvochtigheid, windrichting, zicht en vijf dagen verwachting met minimum- en maximumtemperaturen en regenkans. Ontbrekende waarden verschijnen als een streepje.

## Instellen

1. Installeer de app en open **Apps > BuienradarWeer** in de ReToon-webinterface.
2. Kies je Home Assistant-weather-entiteit en vul desgewenst een plaatsnaam in.
3. Voeg op een pagina een App-kaart toe en kies **BuienradarWeer**. De standaardhoogte is 220 pixels; compacte kaarten tonen minder gegevens.

```json
{"type":"custom:retoon-app","app":"buienradarweer","height":220}
```

## Dag en nacht

Voor actuele heldere en halfbewolkte omstandigheden volgt de app ook de Home Assistant-zonstatus. Standaard is dat `sun.sun`: `below_horizon` betekent nacht en `above_horizon` betekent dag. Daardoor verandert het icoon bij zonsondergang ook wanneer de weerentiteit `sunny` of `partlycloudy` blijft melden. Een heldere nacht krijgt een maan en de tekst **Heldere nacht**; bij halfbewolkt weer staat de maan achter een wolk. Een expliciete `clear-night` van de weerbron blijft gerespecteerd. Ook de alias `clear` wordt herkend.

Onder **Apps > BuienradarWeer** kun je een andere zon-entiteit selecteren. Leeg gebruikt automatisch `sun.sun`; je hoeft daarvoor niets aan bestaande kaarten te wijzigen. Gebruik een zon-entiteit die bij de locatie van je weerbron past. Ontbreekt een geldige zonstatus, dan behoudt de app de conditie van de weerbron en gokt hij niet op basis van een vaste kloktijd. Zie de [HA Sun-documentatie](https://www.home-assistant.io/integrations/sun/).

De correctie geldt voor de actuele toestand op kaart en detailscherm, inclusief zeer kleine kaarten. Dagelijkse voorspellingen beschrijven hele dagen en worden niet in nachticonen veranderd wanneer het op dit moment donker is. Eigen icoonkleuren blijven behouden. Een zonwijziging tekent alleen opnieuw en vraagt geen nieuwe voorspelling op.

## Instellingen per kaart

Open de kaarteditor op de gewenste pagina in de ReToon-webinterface. De opties onder **Alleen voor deze kaart** gelden voor die kaart en het detailscherm dat je ermee opent:

| Optie | Werking |
| --- | --- |
| Eigen plaatsnaam | Leeg gebruikt de standaard plaatsnaam onder Apps; bestaande kaarten behouden hun naam. |
| Weergave | Automatisch kiest de temperatuurgrootte op basis van de ruimte; Compact houdt de cijfers kleiner. |
| Kleur weericonen | Standaard volgt de weerconditie; kies desgewenst een vaste kleur. |
| Achtergrondkleur | Een eigen achtergrond voor de kaart en het bijbehorende detailscherm; Standaard volgt het ReToon-thema. |
| Luchtdruk / wind / gevoelstemperatuur | Kies welke aanvullende metingen op de kaart staan. Ze blijven beschikbaar in het detailscherm. |

Metingen worden alleen getoond als er voldoende ruimte is. Meerdere kaarten delen dezelfde weerentiteit en voorspelling, maar kunnen eigen namen, kleuren en indelingen hebben. De databron blijft onder **Apps > BuienradarWeer**; je hoeft niet voor iedere kaart een nieuwe HA-koppeling te maken.

Gebruik een weather-entiteit van de [Buienradar-integratie](https://www.home-assistant.io/integrations/buienradar/), of een andere integratie die dagelijkse voorspellingen ondersteunt. Er zijn geen afzonderlijke dagsensoren, minimumtemperatuursensoren, templates of eigen toegangstokens nodig.

## Gegevens en verversen

Actuele metingen komen uit de attributen van de gekozen weather-entiteit. De API meldt ook wijzigingen in attributen: temperatuur, luchtdruk en andere waarden verversen via `retoon.watch`, zonder een periodieke tekentimer.

De app gebruikt alleen de gedeclareerde service `weather.get_forecasts`, met type `daily` en een serviceantwoord, via `retoon.call` over de bestaande HA-verbinding. Voorspellingen worden één keer gedeeld opgehaald bij opstarten en na een gewijzigde entiteitskeuze, daarna elke 30 minuten. Een andere kaarttitel, kleur of indeling wist de cache niet en veroorzaakt geen nieuw verzoek. Na een fout wordt na een minuut opnieuw geprobeerd. Totdat dat lukt, toont de app een melding in plaats van verouderde voorspellingen. Actuele metingen blijven onafhankelijk daarvan beschikbaar.

De datum in de dagelijkse voorspelling bepaalt het daglabel; verlopen dagen worden niet getoond. De app toont maximaal vijf beschikbare dagen en verzint geen ontbrekende temperaturen of regenkansen. Eenheden komen uit Home Assistant en worden niet omgerekend. Gebruik op de Toon de tijdzone van de gekozen locatie.

## Privacy en servicebevoegdheid

Alleen de gekozen weerentiteit en de zon-entiteit worden gevolgd. De enige gedeclareerde HA-service is `weather.get_forecasts`; de app stuurt geen thermostaat, lamp of ander apparaat aan. Er zijn geen eigen tokens, rechtstreekse externe netwerkverzoeken, telemetrie of loguitvoer van weergegevens. ReToon bewaart de instellingen lokaal. In de publicatieversie begint de entiteitskeuze leeg.

## Bijwerken vanaf 1.0.x, 1.1.x of 1.2.x

Je bestaande weerentiteit en plaatsnaam blijven bruikbaar. De twintig oude dagsensorkeuzes worden niet meer gebruikt; opnieuw selecteren is niet nodig. Verwijder de bijbehorende HA-sensoren alleen als je ze nergens anders meer gebruikt. De nieuwe versie heeft app-API 10 nodig. Werk ReToon eerst bij naar 1.50 of hoger. Kaarten zonder eigen instellingen houden de standaardweergave; er is geen handmatige migratie van pagina-instellingen nodig.

## Ontwikkelen en installeren

Volg de [officiële instructies voor lokale apps](https://github.com/ToonSoftwareCollective/ReToon-apps/blob/main/docs/trying-an-app.md). Vanuit de ReToon-apps-repository:

```sh
tools/push-app.sh <toon-adres> <pad-naar-buienradarweer>
```

Dit installeert de app en herstart de scherminterface. Controleer daarna de kaart, het detailscherm, de voorspelling en de verversing bij attribuutwijzigingen. De app gebruikt uitsluitend de gedocumenteerde [ReToon-app-API](https://github.com/ToonSoftwareCollective/ReToon-apps/blob/main/docs/writing-apps.md).

Licentie: GPL-2.0-or-later. Dit project is een onafhankelijke ReToon-app en is niet verbonden aan Buienradar.


## Maanvorm

De grote maansikkel gebruikt twee anti-aliased cirkels in plaats van losse lijnstroken. De uitsparing volgt de werkelijke achtergrond van kaart of detailscherm, ook bij een eigen kleur. Bij halfbewolkt weer wordt de wolk daarna voor de maan getekend. De vorm blijft daarmee vloeiend en instelbaar zonder externe afbeeldingen te downloaden.

Visuele referentie: de eenvoudige gevulde maansikkels uit de [Iconpacks-collectie](https://www.iconpacks.net/moon-icons.html?color=monocolor&order_by=1). Dit is een eigen geometrische uitvoering; er worden geen SVG-code of afbeeldingsbestanden van die website meegedistribueerd.
