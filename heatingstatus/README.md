# Verwarmingsstatus

Een Nederlandstalige ReToon-tegel voor de status van de ruimteverwarming, warm tapwater en warmtevraag. De tegel is geschikt voor het dimscherm en vereist ReToon 1.50 of hoger (app-API 10).

## Installatie

Installeer **Verwarmingsstatus** via **Apps** in de ReToon-webinterface. Voeg een kaart van het type **App** toe aan het dimscherm of een gewone dashboardpagina en kies **Verwarmingsstatus**.

## Kaartinstellingen

- **Zwarte achtergrond** geeft de hele tegel een zwarte achtergrond zonder kaartrand.
- **Alleen icoon** centreert het icoon en verbergt het statuslabel. De tegel kiest op basis van de beschikbare ruimte uit de ReToon-icoonmaten 26, 32 en 48 px.
- **Icoonkleur** kan voor elk van de vijf statussen apart worden ingesteld. Kies **Standaard** voor de themakleur.

## Status en gegevensbronnen

De tegel toont de eerste toepasselijke regel in deze tabel.

| Status | Lokale bron |
| --- | --- |
| Verwarmt | `toon.heating_active` meldt actieve ruimteverwarming. |
| Tapwater actief | `toon.hot_water_active` meldt actief warm tapwater. |
| Warmtevraag | `toon.heat_request` meldt dat Toon warmte vraagt. |
| Verwarming in rust | `toon.heating_active` meldt expliciet dat de ruimteverwarming inactief is. |
| Status onbekend | De beschikbare waarden leveren geen van de bovenstaande statussen op. |

De beschikbaarheid van ketelterugmelding hangt af van de aansluiting en de ketel. Bij ontbrekende terugmelding kan Toon nog steeds een warmtevraag melden. De app volgt uitsluitend lokale Toon-entiteiten en werkt zonder Home Assistant. Hij ververst bij statuswijzigingen.
