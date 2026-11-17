# BuienradarWeer

Actueel weer en vijfdaagse verwachting voor ReToon, via de bestaande Home Assistant-verbinding. Vereist app-API 10 (ReToon 1.50 of hoger); ontwikkeld voor ReToon 1.53. Toon 1 is niet getest.

De kaart toont een groot gekleurd weericoon, temperatuur met kleinere eenheid en, bij voldoende hoogte, luchtdruk en wind. Aantikken opent het detailscherm met gevoelstemperatuur, luchtdruk, luchtvochtigheid, windrichting, zicht en vijf dagen verwachting met minimum- en maximumtemperaturen en regenkans. Ontbrekende waarden verschijnen als een streepje.

## Instellen

1. Installeer de app en open **Apps > BuienradarWeer** in de ReToon-webinterface.
2. Kies je Home Assistant-weather-entiteit en vul desgewenst een plaatsnaam in.
3. Voeg op een pagina een App-kaart toe en kies **BuienradarWeer**. De standaardhoogte is 220 pixels; compacte kaarten tonen minder gegevens.

```json
{"type":"custom:retoon-app","app":"buienradarweer","height":220}
```

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

Alleen de gekozen weerentiteit wordt gevolgd. De enige gedeclareerde HA-service is `weather.get_forecasts`; de app stuurt geen thermostaat, lamp of ander apparaat aan. Er zijn geen eigen tokens, rechtstreekse externe netwerkverzoeken, telemetrie of loguitvoer van weergegevens. ReToon bewaart de instellingen lokaal. In de publicatieversie begint de entiteitskeuze leeg.

## Bijwerken vanaf 1.0.x of 1.1.x

Je bestaande weerentiteit en plaatsnaam blijven bruikbaar. De twintig oude dagsensorkeuzes worden niet meer gebruikt; opnieuw selecteren is niet nodig. Verwijder de bijbehorende HA-sensoren alleen als je ze nergens anders meer gebruikt. De nieuwe versie heeft app-API 10 nodig. Werk ReToon eerst bij naar 1.50 of hoger. Kaarten zonder eigen instellingen houden de standaardweergave; er is geen handmatige migratie van pagina-instellingen nodig.

## Ontwikkelen en installeren

Volg de [officiële instructies voor lokale apps](https://github.com/ToonSoftwareCollective/ReToon-apps/blob/main/docs/trying-an-app.md). Vanuit de ReToon-apps-repository:

```sh
tools/push-app.sh <toon-adres> <pad-naar-buienradarweer>
```

Dit installeert de app en herstart de scherminterface. Controleer daarna de kaart, het detailscherm, de voorspelling en de verversing bij attribuutwijzigingen. De app gebruikt uitsluitend de gedocumenteerde [ReToon-app-API](https://github.com/ToonSoftwareCollective/ReToon-apps/blob/main/docs/writing-apps.md).

Licentie: GPL-2.0-or-later. Dit project is een onafhankelijke ReToon-app en is niet verbonden aan Buienradar.
