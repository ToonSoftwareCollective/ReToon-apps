# SnapshotCamera

Een of twee camera's via de Home Assistant-systeemkoppeling. De kaart toont snapshots; tik op een camera voor alleen dat beeld in details, met optioneel MJPEG. De ruimte rond de beelden is zwart. Vereist ReToon 1.50 of hoger / app-API 10. Toon 1 is niet getest.

## Instellen

Kies onder **Apps → SnapshotCamera** de standaardcamera's en namen, één/twee beelden, het snapshotinterval en de standaard voor detailvideo. Het interval (2–300 seconden, standaard 5) en de maximale MJPEG-snelheid (1–10 fps, standaard 5) zijn gedeeld voor alle kaarten.

Voeg op een pagina een **App**-kaart toe en kies SnapshotCamera. De kaarteditor heeft slechts twee instellingen:

| Instelling | Gedrag |
| --- | --- |
| Camera's van deze kaart | Lege lijst gebruikt de standaardcamera's en namen onder Apps. Voeg één of twee camera's toe voor een onafhankelijke kaart. Elke rij heeft een optionele naam; leeg gebruikt de vriendelijke HA-naam van die eigen camera. |
| Beeld in detailscherm | Kies **Instelling onder Apps volgen**, **Snapshots** of **Bewegend beeld (MJPEG)**. Zo kan één kaart video expliciet uitschakelen terwijl de gedeelde instelling aan staat, of andersom. |

Het aantal eigen rijen bepaalt het aantal beelden: één rij geeft één camera, twee rijen geven twee camera's. Er is geen aparte hoofdschakelaar voor kaartinstellingen. Bij een lege lijst erft de kaart de volledige standaardselectie inclusief de bestaande namen. Snapshots op de overzichtskaart blijven actief ongeacht de detailmodus. Sluit details met de standaardknop van ReToon.

Geen apart HA-adres of token nodig: ReToon regelt de serververbinding en authenticatie. Alle persoonlijke publieke defaults zijn leeg. Kaartconfiguraties staan in dashboarddata; zet er geen geheimen in.

## Wijzigingen naar aanleiding van de review

1. **Native kaartinstellingen:** tile en screen lezen rechtstreeks het door ReToon geleverde card.settings. De eigen schakelaar useCardSettings en settingsFor zijn verwijderd.
2. **Geen botsende defaults:** settings bevat de gedeelde velden; cardSettings gebruikt uitsluitend cardCameras (default []) en cardDetailMode (default ""). De schema's hebben geen gedeelde sleutels. Leeg betekent overnemen van de standaard, niet leegmaken van de globale camerakeuze. Dit volgt het lijstpatroon van Sonos/cardPlayers.
3. **Gedeelde snelheid:** interval en fps staan uitsluitend onder Apps. Kaarten hebben eigen camera's/namen/detailmodus, niet elk een aparte beeldsnelheid.
4. **Meerdere kaarten:** klikselectie gebruikt de effectieve cameralijst en detailmodus. De watch-lijst blijft de ontdubbelde unie van de waargenomen camera's. Tekenen van een andere kaart verandert de geselecteerde detailcamera niet.

## Upgrade en eerdere testkaarten

Gebruikers van de officiële 1.1.2-release behouden hun bestaande appinstellingen. Zij hebben nog geen oude kaartvelden uit deze PR en hoeven niets te migreren.

Wie de eerdere 1.2.0-testversie uit deze PR gebruikte, moet de opgeslagen kaartinstellingen omzetten voordat de nieuwe versie wordt gebruikt. De oude velden kunnen anders appwaarden blijven overschrijven, ook als het formulier ze niet meer toont. Maak eerst een backup en wijzig uitsluitend SnapshotCamera-kaarten:

- Met oude useCardSettings uit: verwijder useCardSettings en de oude kaartvelden camera1, camera2, name1, name2, twoCameras, every, stream en fps. De kaart volgt weer de gedeelde waarden.
- Met oude useCardSettings aan: zet de daadwerkelijk gekozen camera's en namen om naar cardCameras, en zet stream om naar cardDetailMode (mjpeg of snapshot). Verwijder daarna de negen oude velden. Behoud alle andere kaartgegevens en posities.
- Afwijkende kaartintervallen/fps worden voortaan vervangen door de gedeelde Apps-waarden. Vergelijk ze vóór omzetting; overschrijf de globale waarden niet stilzwijgend. Een bewust lege oude camerakeuze vereist handmatige beoordeling, omdat een lege nieuwe lijst juist overerving betekent.

De app kan zelf geen dashboardbestanden schrijven en voert geen verborgen migratie uit. De eerdere hoofdschakelaar blijft niet als compatibiliteitslaag in de runtime aanwezig.

## Ontwikkelaars

Eén QuickJS-bestand, main.js, plus manifest.json, README.md en LICENSE. De callbacks krijgen het native samengevoegde card.settings en geven dit expliciet door. Een pure camerafunctie kiest de eigen lijst of de gedeelde camera1/name1 en eventueel camera2/name2 uit datzelfde object; er wordt geen tweede configuratiebron beheerd.

Het manifest declareert cameras: ["camera.*"] voor de configureerbare selectie. De app volgt en tekent alleen de gekozen camera's. Snapshots gebruiken el.image met camera en every; details gebruiken optioneel stream en fps. Geen extra HA-services, URL-constructie, eigen fetch- of tekentimers, tokens of beeld-URL-attributen.

Watch-registratie wordt na tekenen samengevoegd; één kaart schrijft de andere niet uit. Alleen effectieve namen en beschikbaarheid veroorzaken een redraw. Omdat de API geen kaart-verwijdercallback heeft, kunnen metadata-contexten tot appinstellingswijziging of appherstart gevolgd blijven. Dit start geen beelden voor verwijderde kaarten: ReToon beheert alleen zichtbare afbeeldingen en streams.

## Beeldformaten en problemen

ReToon documenteert baseline/progressive JPEG en PNG, en MJPEG voor bewegend beeld. GIF is niet onderdeel van deze afbeeldingsinterface. Sommige radarcamera's, waaronder de Home Assistant-Buienradar-integratie, leveren een geanimeerde GIF. Een HTTP-header image/jpeg garandeert niet dat de bytes werkelijk JPEG zijn. Zo'n GIF kan daarom leeg blijven, ook als de camera beschikbaar is en HTTP 200 antwoordt.

Voor een GIF-bron is vooraf omzetten naar JPEG/PNG nodig, of GIF-ondersteuning in ReToon zelf. Alleen de extensie of Content-Type aanpassen converteert geen beeld. De app implementeert geen eigen GIF-decoder of stille conversie. Een geanimeerde GIF is evenmin automatisch een MJPEG-stream.

WebRTC-only camera's worden via deze API niet ondersteund. Er is geen rechtstreekse RTSP-/ONVIF-client. Snapshots worden maximaal 640 pixels breed aangevraagd; streams maximaal 640 × 360. De fps is een bovengrens, geen garantie. Verlaag fps of kies snapshots bij haperingen.

Bij een leeg beeld: controleer HA-systeemkoppeling, camerakeuze en het echte beeldformaat. De image-API geeft geen betrouwbare laad-/foutcallback aan de app; er is daarom geen automatische stream-terugval of bevestiging van decodering op het scherm.

De app maakt zelf geen opnamen of logbestanden. ReToon en Home Assistant houden hun eigen netwerk-/cache-/foutafhandeling. Deel geen camerabeelden, getekende URL's, apparaatlogs of persoonlijke instellingen bij publicatie.

## Licentie

GPL-2.0-or-later; zie LICENSE.
