# SnapshotCamera

Een of twee Home Assistant-camera's op je Toon, met eigen weergavenamen en automatisch verversen. Tik op een camera om uitsluitend dat beeld in het detailscherm te bekijken. De ruimte rond de beelden is zwart.

Versie 1.1.1 vereist **ReToon 1.39 of hoger (app-API 8)**. De overzichtskaart toont altijd snapshots. Bewegend MJPEG-beeld is optioneel en uitsluitend beschikbaar in het detailscherm van de aangeklikte camera. Versie 1.1.1 is geïnstalleerd op Toon 2/ReToon 1.39; lokale tests en de opstartcontrole in de echte schermruntime slagen. De laatste MJPEG-weergave is nog niet afzonderlijk visueel bevestigd. De eerdere snapshotversie werkte op Toon 2/ReToon 1.38. Toon 1 is niet getest.

## Instellen

Installeer de app en voeg een kaart van type **App** toe aan een pagina. Kies **SnapshotCamera**. Een brede, hoge kaart geeft twee beelden de meeste ruimte.

Onder **Apps → SnapshotCamera**:

| Instelling | Betekenis |
| --- | --- |
| Camera 1 / Camera 2 | Selecteer een camera-entiteit uit de bestaande Home Assistant-koppeling. |
| Naam camera 1 / Naam camera 2 | Optionele eigen naam. Leeg gebruikt de vriendelijke naam uit Home Assistant. |
| Twee camera's tonen | Aan toont twee beelden naast elkaar; uit toont alleen camera 1. |
| Snapshots verversen | Seconden tussen snapshots terwijl het beeld zichtbaar is; standaard 5, begrensd op 2–300. Geldt altijd voor de overzichtskaart en ook voor het detailscherm als MJPEG uit staat. |
| Bewegend beeld alleen in detailscherm | Schakel in voor MJPEG in het detailscherm. De overzichtskaart blijft snapshots tonen. De camera moet MJPEG via Home Assistant ondersteunen. |
| Beelden per seconde | Bovengrens bij MJPEG, standaard 5, begrensd op 1–10. De werkelijke snelheid hangt af van camera, netwerk en Toon. |

Alle persoonlijke instellingen beginnen leeg. De tweede camera wordt alleen gebruikt als twee beelden ingeschakeld zijn. Sluit het detailscherm met de standaardknop van ReToon.

### Geen apart Home Assistant-adres meer

Vanaf API 8 kan ReToon rechtstreeks een camera-entiteit weergeven via de bestaande systeemkoppeling. Home Assistant-adres en authenticatie worden door ReToon geregeld. De app vraagt daarom geen apart HA-adres of token meer en leest geen tijdelijke beeld-URL's uit.

Versie 1.0.0 moest een relatief entity_picture-pad combineren met een apart ingesteld HA-adres. Die workaround is verwijderd. De camera's, namen en het snapshotinterval behouden dezelfde instellingssleutels bij een update; een eventueel achtergebleven haUrl-veld wordt volledig genegeerd. Nieuwe instellingen kiezen snapshots, zodat een update niet vanzelf streams start.

## Ontwikkelaars

De app bestaat uit manifest.json en één QuickJS-script, main.js. Er zijn geen browser- of Node-API's in de runtimecode.

Het manifest vereist API 8 en declareert `cameras: ["camera.*"]`, omdat de gebruiker willekeurige camera-entiteiten kan selecteren. ReToon toont deze cameratoestemming in de webinterface. De app tekent en volgt uitsluitend de één of twee geselecteerde, geldige camera-entiteiten. Er worden geen HA-services gedeclareerd of aangeroepen.

Snapshots gebruiken `el.image({ camera: id, every, ... })`. MJPEG gebruikt `el.image({ camera: id, stream: true, fps, ... })`. Er wordt geen url, header of toegangstoken door de app samengesteld of doorgegeven. ReToon beheert de gedeelde Home Assistant-verbinding, authenticatie en het laden/cachen/verversen van beelden. Volgens de API draait een stream uitsluitend terwijl het beeld zichtbaar is.

`retoon.watch` volgt namen en beschikbaarheid, inclusief attribuutwijzigingen. Een nog niet geladen entiteitsstatus verhindert het native beeldverzoek niet: de imagefunctie kan de systeemverbinding gebruiken terwijl metadata nog binnenkomt. Een expliciet onbeschikbare camera krijgt een melding.

De kaartklik registreert eerst de gekozen camera en laat vervolgens ReToons standaard kaartactie het detailscherm openen. Dat scherm tekent alleen de gekozen camera. JavaScript start geen fetch- of serviceverzoeken vanuit tekenfuncties. De ingebouwde imagefunctie verzorgt de netwerkverzoeken; er is geen extra tekentimer.

## Grenzen en probleemoplossing

ReToon 1.39 ondersteunt ook progressive JPEG, naast baseline JPEG en PNG. MJPEG moet via Home Assistant beschikbaar zijn; uitsluitend WebRTC-camera's worden volgens de API niet ondersteund. Deze app implementeert geen rechtstreekse RTSP- of ONVIF-client.

Afbeeldingen behouden hun verhouding. Snapshots worden maximaal 640 pixels breed aangevraagd, streams maximaal 640 × 360. Er wordt uitsluitend voor de geselecteerde camera in het detailscherm MJPEG aangevraagd. Verlaag bij haperingen de fps-instelling of kies snapshots. De overzichtskaart start nooit streams. De fps-instelling is een bovengrens, geen gegarandeerde verversingssnelheid. De zwarte achtergrond verwijdert geen randen die in het bronbeeld zelf zitten.

Bij een leeg beeld: controleer de systeemkoppeling met Home Assistant, de gekozen camera, de cameratoestemming en het beeldformaat. Schakel bij een niet-werkende stream terug naar snapshots. Er is geen automatische terugval: de image-API biedt de app geen foutcallback om dit betrouwbaar te bepalen. De app kan evenmin bevestigen dat een beeld op het scherm is gedecodeerd; een apparaattest blijft nodig.

De app maakt zelf geen beeldopnamen of logbestanden. ReToon en Home Assistant voeren hun eigen netwerk-, cache- en foutafhandeling uit. Deel geen apparaatlogs, screenshots met camerabeelden, beeld-URL's of persoonlijke instellingen bij publicatie.

## Licentie

GPL-2.0-or-later; zie LICENSE.
