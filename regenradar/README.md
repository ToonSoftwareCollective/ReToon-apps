# Regenradar (ReToon-app)

Neerslagverwachting voor de komende 2 uur, per 5 minuten, van Buienradar.
Het werkt zoals de regengrafiek op de oude geroote Toon. De kaart toont een
samenvatting ("Regen vanaf 15:40 (zwaar)", "Komende 2 uur droog") en een
vloeiende grafiek met de regenzwaarte in kleur. Als je op de kaart tikt,
opent het volledige scherm met een schaal (licht / matig / zwaar / zeer
zwaar), tijden per kwartier, het totaal in mm en de zwaarste intensiteit.

Vereist ReToon met app-API 2 of hoger (elke recente ReToon).

## Installeren

Open in de ReToon-webinterface **Apps**, zoek **Regenradar** in de lijst en
kies **Install**.

## Instellen

1. Open in de ReToon-webinterface **Apps > Regenradar**.
2. Locatie: vul bij **Locatie** een plaats, adres of postcode in, bijvoorbeeld
   `Putten`, `Dorpsstraat 1 Putten` of `3881 AA`. De app zoekt de coördinaten op
   via de PDOK Locatieserver van het Kadaster. Vindt die niets (zoals bij een
   Belgische plaats), dan probeert de app Open-Meteo. Laat je het veld leeg,
   dan gebruikt de app de breedte- en lengtegraad als die zijn ingevuld, en
   anders zone Thuis uit Home Assistant. Op het volledige scherm zie je
   onderaan welke locatie is gevonden, met de coördinaten.
3. **Locatie op de gewone kaart tonen** staat standaard aan: dan staat de
   plaats rechtsboven op de kaart. Haal het vinkje weg als je dat niet wilt.
   Bij **Naam op de kaart** kun je een eigen naam opgeven; leeg betekent de
   plaatsnaam van de gevonden locatie.
4. **Buitentemperatuur tonen** staat standaard aan: de app neemt de
   temperatuur van het Buienradar-weerstation dat het dichtst bij de locatie
   ligt (op het volledige scherm staat onderaan welk station en hoe ver weg).
   Kies je bij **Eigen temperatuursensor** een sensor uit Home Assistant, dan
   gaat die voor. Geeft die sensor geen waarde, dan toont de kaart "– °C".
5. Voeg een App-kaart toe aan een pagina:

```json
{"type":"custom:retoon-app","app":"regenradar","height":190}
```

## Hoe het werkt

- Elke 5 minuten haalt de app de verwachting op bij
  `gps.buienradar.nl/getrr.php`, hetzelfde adres dat de Buienradar-integratie
  van Home Assistant gebruikt. Als dat niet lukt, probeert de app
  `gpsgadget.buienradar.nl/data/raintext`.
- Omrekening van de Buienradar-waarde naar regenintensiteit:
  mm/u = 10^((waarde-109)/32).
- Schaal: licht < 1 mm/u, matig 1-5, zwaar 5-30, zeer zwaar > 30. De
  grafiek is logaritmisch, zodat ook motregen zichtbaar is.
- De grafiek is afgevlakt tussen de metingen van 5 minuten; dat is alleen
  weergave. De tekst bovenaan en de totalen gebruiken de echte metingen.
- Het regenvlak wordt getekend met een paar zigzaglijnen (één per kleurtint)
  in plaats van met losse staafjes: meestal 10 tot 40 elementen, zodat het
  ook op een Toon 1 vlot blijft.
- De temperatuur komt uit `data.buienradar.nl/2.0/feed/json` (actuele
  metingen per station, elke 10 minuten), dezelfde bron als de
  Buienradar-integratie van Home Assistant.
- Lukt het ophalen niet, dan blijft de laatste verwachting staan zolang die
  nog geldig is. Daarna toont de kaart de foutmelding en probeert de app het
  elke minuut opnieuw.

De gegevens komen van Buienradar.nl en zijn gratis voor persoonlijk,
niet-commercieel gebruik.

## Uitproberen vóór publicatie (via SSH)

Zolang de app nog niet in de catalogus staat, kun je hem met de hand op de
Toon zetten. Vanuit een kopie van
https://github.com/ToonSoftwareCollective/ReToon-apps:

```sh
tools/push-app.sh <ip-van-de-toon> pad/naar/regenradar
```

Of met de hand:

```sh
scp -O -r regenradar root@<ip-van-de-toon>:/tmp/
ssh root@<ip-van-de-toon>
mount -o remount,rw /mnt/data
rm -rf /mnt/data/toon-os/apps/regenradar
mv /tmp/regenradar /mnt/data/toon-os/apps/regenradar
mount -o remount,ro /mnt/data
/etc/init.d/S50toon-ui restart
```

Het root-wachtwoord stel je in de webinterface in onder Instellingen > Systeem.
