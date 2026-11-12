# BuienradarWeer

Actueel weer en vijfdaagse verwachting voor ReToon, via de bestaande Home Assistant-verbinding. Vereist app-API 7 (ReToon 1.36 of hoger); ReToon 1.38 wordt aanbevolen. Vanaf ReToon 1.37 wacht een serviceaanroep bij het opstarten op de HA-verbinding. Toon 1 is niet getest.

De kaart toont een groot gekleurd weericoon, temperatuur met kleinere eenheid en, bij voldoende hoogte, luchtdruk en wind. Aantikken opent het detailscherm met gevoelstemperatuur, luchtdruk, luchtvochtigheid, windrichting, zicht en vijf dagen verwachting met minimum- en maximumtemperaturen en regenkans. Ontbrekende waarden verschijnen als een streepje.

## Instellen

1. Installeer de app en open **Apps > BuienradarWeer** in de ReToon-webinterface.
2. Kies je Home Assistant-weather-entiteit en vul desgewenst een plaatsnaam in.
3. Voeg op een pagina een App-kaart toe en kies **BuienradarWeer**. De standaardhoogte is 220 pixels; compacte kaarten tonen minder gegevens.

```json
{"type":"custom:retoon-app","app":"buienradarweer","height":220}
```

Gebruik een weather-entiteit van de [Buienradar-integratie](https://www.home-assistant.io/integrations/buienradar/), of een andere integratie die dagelijkse voorspellingen ondersteunt. Er zijn geen afzonderlijke dagsensoren, minimumtemperatuursensoren, templates of eigen toegangstokens nodig.

## Gegevens en verversen

Actuele metingen komen uit de attributen van de gekozen weather-entiteit. API 7 meldt ook wijzigingen in attributen: temperatuur, luchtdruk en andere waarden verversen via `retoon.watch`, zonder een periodieke tekentimer.

De app gebruikt alleen de gedeclareerde service `weather.get_forecasts`, met type `daily` en een serviceantwoord, via `retoon.call` over de bestaande HA-verbinding. Voorspellingen worden bij opstarten en na een gewijzigde entiteitskeuze opgehaald, daarna elke 30 minuten. Na een fout wordt na een minuut opnieuw geprobeerd. Totdat dat lukt, toont de app een melding in plaats van verouderde voorspellingen. Actuele metingen blijven onafhankelijk daarvan beschikbaar.

De datum in de dagelijkse voorspelling bepaalt het daglabel; verlopen dagen worden niet getoond. De app toont maximaal vijf beschikbare dagen en verzint geen ontbrekende temperaturen of regenkansen. Eenheden komen uit Home Assistant en worden niet omgerekend. Gebruik op de Toon de tijdzone van de gekozen locatie.

## Privacy en servicebevoegdheid

Alleen de gekozen weerentiteit wordt gevolgd. De enige gedeclareerde HA-service is `weather.get_forecasts`; de app stuurt geen thermostaat, lamp of ander apparaat aan. Er zijn geen eigen tokens, rechtstreekse externe netwerkverzoeken, telemetrie of loguitvoer van weergegevens. ReToon bewaart de instellingen lokaal. In de publicatieversie begint de entiteitskeuze leeg.

## Bijwerken vanaf 1.0.x

Je bestaande weerentiteit en plaatsnaam blijven bruikbaar. De twintig oude dagsensorkeuzes worden niet meer gebruikt; opnieuw selecteren is niet nodig. Verwijder de bijbehorende HA-sensoren alleen als je ze nergens anders meer gebruikt. De nieuwe versie heeft app-API 7 nodig en werkt niet op ReToon 1.32.

## Ontwikkelen en installeren

Volg de [officiële instructies voor lokale apps](https://github.com/ToonSoftwareCollective/ReToon-apps/blob/main/docs/trying-an-app.md). Vanuit de ReToon-apps-repository:

```sh
tools/push-app.sh <toon-adres> <pad-naar-buienradarweer>
```

Dit installeert de app en herstart de scherminterface. Controleer daarna de kaart, het detailscherm, de voorspelling en de verversing bij attribuutwijzigingen. De app gebruikt uitsluitend de gedocumenteerde [ReToon-app-API](https://github.com/ToonSoftwareCollective/ReToon-apps/blob/main/docs/writing-apps.md).

Licentie: GPL-2.0-or-later. Dit project is een onafhankelijke ReToon-app en is niet verbonden aan Buienradar.
