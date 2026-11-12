# SnapshotCamera

Een of twee Home Assistant-camerasnapshots op je Toon, met eigen weergavenamen en automatisch verversen. Tik op een camera om uitsluitend dat beeld in het detailscherm te bekijken. De ruimte rond de beelden is zwart.

Vereist app-API 7 (ReToon 1.36 of hoger). Ontwikkeld op een Toon 2 met ReToon 1.38. De snapshots van de eerdere testversie zijn door de gebruiker op het apparaat bevestigd. Toon 1 is niet getest.

## Instellen

Installeer de app en voeg een kaart van type **App** toe aan een pagina. Kies **SnapshotCamera**. Een brede, hoge kaart geeft twee beelden de meeste ruimte.

Onder **Apps → SnapshotCamera**:

| Instelling | Betekenis |
| --- | --- |
| HA-adres | Gebruik hetzelfde Home Assistant-basisadres als bij de systeemintegratie, bereikbaar vanaf de Toon. Neem een eventuele poort of basispad over. Voer geen camerabeeldpad, token of inloggegevens in. |
| Camera 1 / Camera 2 | Selecteer een camera-entiteit uit de bestaande Home Assistant-koppeling. |
| Naam camera 1 / Naam camera 2 | Optionele eigen naam. Leeg gebruikt de vriendelijke naam uit Home Assistant. |
| Twee camera's tonen | Aan toont twee beelden naast elkaar; uit toont alleen camera 1. |
| Verversen | Seconden tussen snapshots terwijl het beeld zichtbaar is; standaard 5, begrensd op 2–300. |

De instellingen beginnen zonder persoonlijke adressen, camera-entiteiten of namen. De tweede camera wordt alleen gebruikt als twee beelden ingeschakeld zijn. Sluit het detailscherm met de standaardknop van ReToon.

### Waarom nog een HA-adres als de camera al geselecteerd is?

De bestaande systeemintegratie levert de camera-entiteit, naam, status en het attribuut `entity_picture`. Dat attribuut bevat doorgaans een relatief beeldpad, zoals `/api/camera_proxy/camera.example`. Om de JPEG op te halen moet daar het Home Assistant-serveradres voor staan.

API 7 geeft het systeemadres niet door aan apps en `el.image` vereist een volledige HTTP(S)-URL. Daarom moet hetzelfde adres ook hier worden ingevuld. Dit is een beperking van de app-API, niet een tweede camera-integratie. Als het systeemadres verandert, pas deze appinstelling ook aan. Er is geen extra Home Assistant-token nodig.

## Ontwikkelaars

`manifest.json` beschrijft de instellingen en vereist API 7. `main.js` is één QuickJS-script, zonder browser- of Node-API's. `retoon.watch` volgt uitsluitend de geselecteerde camera's. API 7 meldt ook attribuutwijzigingen, zodat wijzigingen in `entity_picture` worden opgepakt. De imagefunctie zelf is beschikbaar vanaf API 6.

De app combineert het ingestelde HA-basisadres met het relatieve `entity_picture`. Een volledig beeldadres wordt alleen gebruikt als het onder datzelfde basisadres valt. De door Home Assistant geleverde tijdelijke cameratoegang blijft onderdeel van de beeld-URL in het geheugen. De app vraagt geen langlevende HA-token, roept geen HA-services aan en schrijft of logt geen beeld-URL's. Het is geen eigen RTSP-/ONVIF-client.

`el.image({ url, w, h, every })` haalt snapshots op en tekent ze. JavaScript start geen `retoon.fetch`-verzoeken vanuit tekenfuncties; de ingebouwde imagefunctie beheert het laden, cachen en verversen. Camera's hebben geen extra tekentimer nodig. De kaartklik registreert eerst de gekozen camera en laat vervolgens ReToons standaard kaartactie het detailscherm openen. Dat scherm tekent alleen de gekozen camera.

Een toekomstige systeemoplossing kan het HA-basisadres of een camera-afbeeldingsfunctie rechtstreeks beschikbaar maken. Tot die tijd mag het adresveld niet uitsluitend verborgen worden of door een vast persoonlijk adres in de code worden vervangen: dat zou systeemwijzigingen niet volgen.

## Beperkingen en probleemoplossing

Ondersteund: baseline JPEG en PNG. Geen progressive JPEG, livevideo, RTSP of ONVIF. Beelden worden met behoud van verhouding ingepast, met maximaal 640 pixels aangevraagde breedte. De zwarte achtergrond verandert geen randen die in de camera-afbeelding zelf zitten.

Een eerste beeld kan even laden. Controleer bij een leeg beeld het HA-adres, de camera-entiteit, bereikbaarheid vanaf de Toon en het beeldformaat. De image-API geeft de app geen laad- of foutcallback; een leeg beeld bewijst geen succesvolle decodering. De app kan foutafhandeling voor HTTP en decodering daarom niet als eigen status tonen.

De app maakt zelf geen beeldopnamen of logbestanden. Home Assistant en ReToon blijven hun eigen normale netwerk-, cache- en foutafhandeling uitvoeren. Deel geen apparaatlogs, screenshots met camerabeelden, beeld-URL's of persoonlijke appinstellingen bij publicatie.

## Licentie

GPL-2.0-or-later; zie `LICENSE`.
