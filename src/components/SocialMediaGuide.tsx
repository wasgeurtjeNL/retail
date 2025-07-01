'use client';

import React, { useState } from 'react';
import { 
  ChevronRightIcon, 
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  VideoCameraIcon,
  ClockIcon,
  HashtagIcon,
  PresentationChartBarIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ArrowUpIcon,
  CurrencyEuroIcon,
  ClipboardDocumentCheckIcon,
  ShoppingCartIcon,
  ChartBarIcon,
  AdjustmentsHorizontalIcon,
  FireIcon,
  ArrowTrendingUpIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { jsPDF } from 'jspdf';

const SocialMediaGuide: React.FC = () => {
  const [expanded, setExpanded] = useState(false);
  const [activeView, setActiveView] = useState<'omzet-boost' | 'sjablonen' | 'planning' | 'strategie-templates'>('omzet-boost');
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  
  // ROI data - concrete resultaten
  const roiData = {
    algemeen: {
      gemiddeld: "+32% omzetstijging binnen 90 dagen",
      topretailers: "+€1.250 extra omzet per maand",
      klantfrequentie: "+28% herhalingsaankopen"
    },
    perkanaal: [
      { kanaal: "Instagram Stories", conversie: "4.7%", bereik: "Lokaal", investering: "10 min/dag", roi: "+€320/maand", color: "text-green-600" },
      { kanaal: "Facebook Advertenties", conversie: "3.2%", bereik: "Regionaal", investering: "€50/maand", roi: "+€480/maand", color: "text-green-700" },
      { kanaal: "Instagram Feed", conversie: "2.8%", bereik: "Lokaal", investering: "20 min/week", roi: "+€230/maand", color: "text-green-600" },
      { kanaal: "Google Mijn Bedrijf", conversie: "5.3%", bereik: "Zeer lokaal", investering: "30 min/maand", roi: "+€290/maand", color: "text-green-600" }
    ]
  };

  // Bewezen content sjablonen met echte resultaten
  const templates = [
    {
      id: 'omzet-winner-1',
      titel: "Geurexplosie Wasparfum",
      conversie: "6.8%",
      kanaal: "Instagram + Facebook",
      tag: "BESTSELLER",
      tagColor: "bg-orange-500",
      bgGradient: "bg-gradient-to-r from-orange-50 to-yellow-50",
      template: `🌸 *FAVORIETE GEUR VAN DIT MOMENT* 🌸

De [Naam Geur] wasparfum vliegt momenteel onze winkel uit! 💨

✨ Geurt TOT 12 WEKEN in uw wasgoed
✨ 100% natuurlijke ingrediënten
✨ Favoriet bij [naam bekende klant/influencer]

⚠️ NOG MAAR [X] FLESJES OP VOORRAAD! ⚠️

💬 "Mijn hele kledingkast ruikt nu heerlijk fris. Zelfs mijn man krijgt complimenten op werk!" - [Klantnaam]

➡️ Kom snel langs bij [Winkelnaam] of bestel via DM!
.
.
#Wasparfum #[UwStad] #GeurExplosie #BeperktBeschikbaar`
    },
    {
      id: 'omzet-winner-2',
      titel: "Seizoen Collectie Lancering",
      conversie: "5.3%",
      kanaal: "Instagram Story + Reels",
      tag: "TRAFFIC DRIVER",
      tagColor: "bg-green-500",
      bgGradient: "bg-gradient-to-r from-green-50 to-emerald-50",
      template: `✨ EINDELIJK HIER: [ZOMER/HERFST/LENTE/WINTER] COLLECTIE 2023! ✨

Onze nieuwe limited edition [seizoen] wasparfums zijn binnen! 🎉

3 NIEUWE GEUREN, elk speciaal ontwikkeld voor dit seizoen:
🌿 [Geur 1] - [korte beschrijving]
🌿 [Geur 2] - [korte beschrijving]
🌿 [Geur 3] - [korte beschrijving]

🔥 INTRODUCTIE AANBIEDING 🔥
Bij aankoop van 2 wasparfums uit de nieuwe collectie: 
GRATIS [klein geschenk] t.w.v. €[bedrag]!
Geldig t/m [datum].

📍 [Adres winkel]
🕒 Vandaag geopend tot [sluitingstijd]

*Swipe up om direct te bestellen of stuur een DM!*
.
.
#Wasparfum #NieuweCollectie #[UwStad] #BeperkteBeschikbaarheid`
    },
    {
      id: 'omzet-winner-3',
      titel: "Geur van de Week",
      conversie: "4.2%",
      kanaal: "Facebook + Instagram Feed",
      tag: "ENGAGEMENT BOOST",
      tagColor: "bg-blue-500",
      bgGradient: "bg-gradient-to-r from-blue-50 to-indigo-50",
      template: `🏆 GEUR VAN DE WEEK 🏆

[GEUR NAAM] - Nu tijdelijk met 15% korting!

Onze klanten zijn er dol op:
👍 "[Echte klantreview in 10-15 woorden]"
👍 "[Nog een echte korte review]"

💯 Bestseller in [aantal] winkels door heel Nederland
💯 [X] verkocht in de afgelopen week
💯 Perfect voor [specifiek gebruiksdoel]

⏰ ACTIE GELDIG TOT EN MET [DAG]! ⏰

➡️ Klik op link in bio om te bestellen of kom langs
📍 [Winkeladres]
.
.
#Wasparfum #GeurVanDeWeek #[Geur] #[UwStad]`
    },
    {
      id: 'omzet-winner-4',
      titel: "Voor & Na Resultaten",
      conversie: "7.1%",
      kanaal: "Instagram Reels + Facebook",
      tag: "HOOGSTE CONVERSIE",
      tagColor: "bg-purple-500",
      bgGradient: "bg-gradient-to-r from-purple-50 to-pink-50",
      template: `⚡ VAN STANDAARD WAS NAAR WOW-EFFECT ⚡

👉 Links: Gewoon wasmiddel
👉 Rechts: Met [Geur] wasparfum

Het verschil? 
12 WEKEN LANG EEN HEERLIJKE GEUR! 😍

Zie hoe [klantnaam] reageert wanneer ze voor het eerst haar was uit de kast haalt na 4 weken: [emoji van verbazing]

✅ Werkt op alle stoffen
✅ Niet schadelijk voor de wasmachine
✅ Slechts 1 dopje per wasbeurt nodig
✅ Te gebruiken met elk wasmiddel

🛒 NU IN DE AANBIEDING: 2+1 GRATIS! 🛒
Geldig in de winkel en online tot [datum].

[Link/CTA]
.
.
#Wasparfum #VoorNa #WasgoedTransformatie #[UwStad]`
    }
  ];

  // Strategieën die direct omzet beïnvloeden
  const strategies = [
    {
      id: 'strategy-1',
      titel: "Het €1000-per-week plan",
      beschrijving: "Verhoog je omzet met €1000/week door deze precisie-aanpak",
      color: "from-indigo-600 to-blue-700",
      items: [
        "Post 2x Stories per dag (één's ochtends, één's avonds)",
        "Focus op schaarste-berichten ('Nog maar X op voorraad')",
        "Gebruik Instagram DM voor directe bestellingen",
        "Wekelijkse Facebook-post met lokale targeting (10km)",
        "Inclusief concrete CTA: 'Reserveer via DM of kom vandaag langs'"
      ],
      resultaten: "4-7% directe conversie, 70-120 extra klanten per maand",
      tijdsinvestering: "45 min per dag, 5-6 dagen per week"
    },
    {
      id: 'strategy-2',
      titel: "Lokale Micro-Influencer Strategie",
      beschrijving: "Creëer lokale buzz zonder groot advertentiebudget",
      color: "from-pink-600 to-rose-700",
      items: [
        "Identificeer 3-5 lokale micro-influencers (500-5000 volgers)",
        "Geef gratis producten in ruil voor echte reviews",
        "Vraag 'Tag een vriend die dit zou waarderen'-posts",
        "Organiseer een gezamenlijke give-away actie",
        "Stimuleer instagram-mentions met kortingscode"
      ],
      resultaten: "250-500 nieuwe profielbezoekers per actie, 3-5% conversie",
      tijdsinvestering: "2-3 uur setup, daarna 20 min/dag monitoring"
    },
    {
      id: 'strategy-3',
      titel: "Exclusieve VIP-FOMO Techniek",
      beschrijving: "Creëer exclusieve dropdagen die FOMO genereren",
      color: "from-amber-600 to-orange-700",
      items: [
        "Kondig 'geheime' nieuwe geuren 14 dagen vooraf aan",
        "Exclusieve preview voor klanten die reageren",
        "Publiceer afteltimer in Stories met prijs-onthulling",
        "Beperkte beschikbaarheid beenadrukken (max 50 per winkel)",
        "WhatsApp-notificatie voor vaste klanten op lanceringsdag"
      ],
      resultaten: "80-120 reserveringen vooraf, 60-75% ophaalscore, €900-€1400 directe omzet per drop",
      tijdsinvestering: "4-5 uur voorbereiding, 1 uur op de dropdag"
    }
  ];

  // Eenvoudig te kopiëren weekplanning met concrete acties
  const weekplanning = [
    { dag: "Maandag", taak: "Nieuwe Story + Early adopter korting", duur: "15 min", roi: "€50-80", bgColor: "bg-blue-50" },
    { dag: "Dinsdag", taak: "Geur van de week bekendmaking", duur: "20 min", roi: "€90-120", bgColor: "bg-white" },
    { dag: "Woensdag", taak: "User-generated content delen", duur: "10 min", roi: "€30-60", bgColor: "bg-blue-50" },
    { dag: "Donderdag", taak: "Weekend-aanbieding Story + Feed", duur: "30 min", roi: "€180-250", bgColor: "bg-white" },
    { dag: "Vrijdag", taak: "Last-chance reminder + voorraadupdate", duur: "15 min", roi: "€150-200", bgColor: "bg-blue-50" },
    { dag: "Zaterdag", taak: "Live in-store glimps + lokale targeting", duur: "25 min", roi: "€120-180", bgColor: "bg-white" },
    { dag: "Zondag", taak: "Inspiratie-post + teaser nieuwe week", duur: "15 min", roi: "€40-60", bgColor: "bg-blue-50" }
  ];

  // Strategie templates voor directe toepassing
  const strategieTemplates = {
    "1000-per-week": [
      {
        id: 'ochtend-story',
        titel: "Ochtend Story Template",
        type: "Instagram Story",
        tijd: "08:00 - 09:30",
        template: `🌞 GOEDEMORGEN [STADSNAAM]! 🌞

✨ Vandaag in de winkel: [SPECIFIEK PRODUCT/AANBIEDING] ✨

Ruik zelf hoe geweldig deze geur is! 👃

⏰ Vandaag geopend tot [SLUITINGSTIJD] ⏰

⚠️ NOG MAAR [X] OP VOORRAAD! ⚠️

👆 SWIPE UP om direct te reserveren via DM!`
      },
      {
        id: 'avond-story',
        titel: "Avond Story Template",
        type: "Instagram Story",
        tijd: "18:00 - 19:30",
        template: `🌙 Last-minute shoppers opgelet! 🌙

❗ Nog [X] uur tot sluitingstijd ❗

💯 Laatste kans om vandaag nog te profiteren van:
- [PRODUCT A] (nog [X] op voorraad)
- [PRODUCT B] (nog [X] op voorraad)

🏃‍♀️ Kom snel langs of stuur een DM om te reserveren!

⏱️ We zijn open tot [SLUITINGSTIJD]`
      },
      {
        id: 'schaarste-bericht',
        titel: "Schaarste-bericht Template",
        type: "Instagram Post",
        tijd: "Tweewekelijks",
        template: `⚠️ POPULAIRE GEUREN BIJNA UITVERKOCHT! ⚠️

We zien dat deze geuren razendsnel gaan:

1️⃣ [GEUR A] - Nog maar [X] flesjes!
2️⃣ [GEUR B] - Nog maar [X] flesjes!
3️⃣ [GEUR C] - Nog maar [X] flesjes!

🔄 Nieuwe voorraad verwacht pas over [X] weken!

Wil je zeker zijn dat jouw favoriete wasparfum niet uitverkocht raakt? Reserveer nu via DM of kom vandaag nog langs!

📍 [WINKELADRES]
⏰ Vandaag open tot [SLUITINGSTIJD]

#Wasparfum #[UwStad] #LimitedStock #BeperkteBeschikbaarheid`
      },
      {
        id: 'dm-template',
        titel: "Instagram DM Antwoord Template",
        type: "Instagram DM",
        tijd: "Doorlopend",
        template: `Hallo [NAAM],

Bedankt voor je interesse in [PRODUCT]! 😊

✅ De prijs is €[BEDRAG]
✅ We hebben deze nog op voorraad
✅ Je kunt deze reserveren via deze chat

Wil je het product reserveren? Dan zet ik het voor je klaar en kun je het vandaag nog ophalen!

Laat maar weten! 👍

PS: We zijn vandaag geopend tot [SLUITINGSTIJD].`
      },
      {
        id: 'facebook-lokaal',
        titel: "Facebook Post met Lokale Targeting",
        type: "Facebook Post",
        tijd: "Wekelijks op donderdag",
        template: `🏆 WEKELIJKSE AANBIEDING VOOR [STADSNAAM] 🏆

Speciaal voor onze lokale klanten in [STADSNAAM] en omgeving (10km):

🔥 [WEEKAANBIEDING BESCHRIJVING] 🔥

✨ Normaal: €[REGULIERE PRIJS]
✨ Deze week: €[ACTIEPRIJS]
✨ Geldig t/m [EINDDATUM]

Lokale bezorging mogelijk of haal het op in onze winkel aan [WINKELADRES]!

Reserveer direct via:
📱 DM op Instagram of Facebook
☎️ Telefoon: [TELEFOONNUMMER]
🏪 Kom langs in de winkel

#[UwStad] #Wasparfum #LocalDeals #[UwWijk]`
      }
    ],
    "micro-influencer": [
      {
        id: 'outreach',
        titel: "Influencer Outreach Bericht",
        type: "Instagram DM",
        tijd: "Eenmalig voor setup",
        template: `Hoi [INFLUENCER NAAM],

Ik ben [JOUW NAAM] van [WINKEL NAAM], een officieel verkooppunt van Wasgeurtje wasparfum in [STAD].

Ik volg je al een tijdje en vind je content over [RELEVANT ONDERWERP] geweldig! Je stijl en authenticiteit spreken mij echt aan.

We zoeken lokale content creators om onze bijzondere wasparfums te proberen en hun eerlijke ervaring te delen als ze het product waarderen.

Zou je open staan voor een gratis wasparfum pakket met onze populairste geuren (waarde €45) in ruil voor een review als je het product goed vindt?

Er zijn geen verplichtingen - alleen als je het echt de moeite waard vindt!

Laat me weten of dit je aanspreekt 😊

Groeten,
[JOUW NAAM]
[WINKEL NAAM]`
      },
      {
        id: 'product-aanbieding',
        titel: "Product Aanbieding voor Influencers",
        type: "Follow-up DM",
        tijd: "Na positieve reactie",
        template: `Super leuk dat je interesse hebt, [INFLUENCER NAAM]!

Hier is wat we voor je hebben samengesteld:

📦 JOUW GRATIS WASPARFUM PAKKET:
- 1x [GEUR A] (bestseller!)
- 1x [GEUR B] (perfect voor [seizoen])
- 1x mini-gids met gebruikstips

Wat we waarderen als je het product goed vindt:
- Een eerlijke post of story over je ervaring
- Tag @[jouw_instagram] en #wasparfum
- Deel hoe je kleding ruikt/aanvoelt na gebruik

Geen script, geen verplichtingen - alleen jouw authentieke mening als je het fijn vindt!

Wat is een goed adres om het pakket naar toe te sturen? Of wil je het liever ophalen in onze winkel?

Nogmaals bedankt!`
      },
      {
        id: 'tag-vriend',
        titel: "Tag-een-vriend Post Template",
        type: "Instagram Post",
        tijd: "Om de 3-4 weken",
        template: `👫 TAG JE VRIEND & WIN! 👫

Ken jij iemand die altijd op zoek is naar heerlijk geurende was?

1️⃣ Tag deze persoon in de comments
2️⃣ Vertel waarom hij/zij wasparfum MOET proberen
3️⃣ Volg beiden ons account @[jouw_instagram]

🎁 WINNEN: 2 wasparfum flesjes naar keuze - één voor jou, één voor je getagde vriend!

We kiezen [DATUM] een winnaar!

#Wasparfum #[UwStad] #TagToWin #GeurendeWas

[FOTO: Twee Wasparfum flesjes naast elkaar in cadeauverpakking]`
      },
      {
        id: 'giveaway',
        titel: "Gezamenlijke Give-away Actie",
        type: "Instagram Post + Story",
        tijd: "Maandelijks",
        template: `🎉 GROTE GIVEAWAY MET @[influencer_account]! 🎉

We hebben de krachten gebundeld met lokale influencer @[influencer_account] voor een GEWELDIGE giveaway!

🎁 WIN DIT PAKKET t.w.v. €75:
- Complete Wasparfum set (3 geuren)
- [Extra product van influencer/relevante toevoeging]
- [Nog een relevante prijs]

HOE DOE JE MEE?
1️⃣ Volg @[jouw_instagram] & @[influencer_account]
2️⃣ Like deze post
3️⃣ Tag 2 vrienden die ook van heerlijk geurende was houden
4️⃣ Deel deze post in je story voor een EXTRA winkans!

Winnaar wordt bekend gemaakt op [DATUM].

#Wasparfum #[UwStad] #Giveaway #WinActie`
      },
      {
        id: 'kortingscode',
        titel: "Kortingscode voor Volgers",
        type: "Instagram Story (via influencer)",
        tijd: "Na influencer post",
        template: `[VOOR INFLUENCER OM TE DELEN]

🏷️ EXCLUSIEVE KORTING VOOR MIJN VOLGERS! 🏷️

Ik heb @[jouw_instagram] zover gekregen om jullie een SPECIALE KORTING te geven op hun wasparfums!

Gebruik code "VOLGER[INFLUENCER_NAAM]" voor 15% KORTING op alle wasparfum producten!

🛍️ In de winkel: laat deze story zien
🛒 Online: gebruik de code in DM bij bestelling

⏰ Geldig t/m [EINDDATUM]

Swipe up voor de Instagram van @[jouw_instagram]!`
      }
    ],
    "vip-fomo": [
      {
        id: 'aankondiging',
        titel: "Geheime Aankondiging Template",
        type: "Instagram Post + Story",
        tijd: "14 dagen voor lancering",
        template: `🤫 IETS BIJZONDERS KOMT ERAAN... 🤫

We mogen nog niet teveel verklappen, maar we krijgen binnenkort iets EXCLUSIEFS binnen waar maar weinig mensen toegang toe krijgen!

⚡ LIMITED EDITION
⚡ EERSTE LEVERING IN NEDERLAND
⚡ STRIKT BEPERKTE VOORRAAD (max. 50 stuks!)

👀 Wil jij als één van de eersten een exclusieve preview ontvangen? Reageer dan met "IK WIL!" in de comments!

We selecteren [DATUM] een kleine groep mensen voor een speciale VIP-voorverkoop...

⏱️ Officiële release: [DATUM] - maar tegen die tijd kan het al uitverkocht zijn!

#Wasparfum #ExclusiefAanbod #LimitedEdition #ComingSoon`
      },
      {
        id: 'exclusieve-preview',
        titel: "Exclusieve Preview Template",
        type: "Instagram DM naar reageerders",
        tijd: "10 dagen voor lancering",
        template: `🔐 JOUW EXCLUSIEVE VIP PREVIEW 🔐

Hoi [NAAM],

Je bent geselecteerd voor de exclusieve preview van onze LIMITED EDITION [PRODUCT NAAM]!

🌟 WAT MAAKT DIT ZO BIJZONDER:
- [UNIEK KENMERK 1]
- [UNIEK KENMERK 2]
- Slechts 50 stuks beschikbaar in heel Nederland!

💰 REGULIERE PRIJS: €[PRIJS]
💰 VIP PRE-ORDER PRIJS: €[VIP PRIJS]

Als pre-order VIP krijg je ook:
✅ Gegarandeerde reservering
✅ Speciale VIP verpakking
✅ Een gratis [KLEIN CADEAU]

Wil je gebruik maken van deze exclusieve kans? Reageer dan binnen 24 uur op dit bericht met "RESERVEREN"!

De officiële lancering is op [DATUM], maar we verwachten dat alles dan al gereserveerd is...`
      },
      {
        id: 'afteltimer',
        titel: "Afteltimer Story Template",
        type: "Instagram Story (reeks)",
        tijd: "7 dagen aflopend tot lancering",
        template: `[STORY 1 - 7 DAGEN VOOR LANCERING]
⏳ NOG 7 DAGEN ⏳
Tot onze LIMITED EDITION lancering!
[Voeg Instagram countdown sticker toe]

[STORY 2 - 5 DAGEN VOOR LANCERING]
⏳ NOG 5 DAGEN ⏳
Slechts 50 stuks beschikbaar!
[Toon gedeeltelijke productfoto]
[Countdown sticker]

[STORY 3 - 3 DAGEN VOOR LANCERING]
⏳ NOG 3 DAGEN ⏳
De prijs? €[BEDRAG]!
[Toon meer van het product]
[Countdown sticker]

[STORY 4 - 1 DAG VOOR LANCERING]
⚠️ MORGEN OM [TIJDSTIP] ⚠️
Online én in de winkel verkrijgbaar!
[Volledige productfoto]
[Countdown sticker]

[STORY 5 - LANCERINGSOCHTEND]
🚨 VANDAAG GELANCEERD 🚨
⏰ Beschikbaar vanaf [TIJDSTIP]!
Eerste 10 kopers krijgen [EXTRA]!
[Voeg link naar DM toe]`
      },
      {
        id: 'beperkte-beschikbaarheid',
        titel: "Beperkte Beschikbaarheid Template",
        type: "Instagram Post (lanceringsdag)",
        tijd: "Op lanceringsdag",
        template: `🚨 NU BESCHIKBAAR: LIMITED EDITION [PRODUCTNAAM]! 🚨

Het moment is EINDELIJK hier! Onze meest exclusieve wasparfum ooit is NU verkrijgbaar!

⭐ [PRODUCTNAAM] - LIMITED EDITION ⭐

Wat maakt deze editie zo speciaal:
✨ [SPECIALE EIGENSCHAP 1]
✨ [SPECIALE EIGENSCHAP 2]
✨ [SPECIALE EIGENSCHAP 3]

⚠️ BELANGRIJK: ⚠️
- Slechts 50 stuks beschikbaar!
- Max. 2 per klant
- Al 15 gereserveerd door VIPs!

Verkrijgbaar in de winkel en via DM (voor bezorging/reservering).

💰 PRIJS: €[BEDRAG]

Update 1 (11:00): Nog 35 beschikbaar
Update 2 (13:00): Nog 22 beschikbaar
Update 3 (15:00): Nog maar 8 beschikbaar!

#Wasparfum #LimitedEdition #ExclusiefAanbod #[UwStad]`
      },
      {
        id: 'whatsapp-notificatie',
        titel: "WhatsApp Notificatie Template",
        type: "WhatsApp Bericht (vaste klanten)",
        tijd: "Ochtend van lanceringsdag",
        template: `🔔 *EXCLUSIEVE LANCERING - VANDAAG* 🔔

Beste [NAAM],

Als vaste klant willen we je persoonlijk informeren:

Onze *LIMITED EDITION [PRODUCTNAAM]* is VANDAAG GELANCEERD! ✨

Details:
• Strikt gelimiteerd tot 50 stuks
• Prijs: €[BEDRAG]
• Eerste 10 kopers krijgen [EXTRA CADEAU]

Interesse? Wacht niet te lang - bij de vorige limited edition waren we binnen 4 uur uitverkocht!

Reserveer direct door op dit bericht te reageren of kom langs in de winkel.

Vriendelijke groet,
[JOUW NAAM]
[WINKEL NAAM]
[TELEFOONNUMMER]`
      }
    ]
  };

  // Kopieer template naar klembord
  const copyTemplate = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Template gekopieerd naar klembord! Plak direct in uw social media app.');
  };

  // Bepaal ROI kleur op basis van bedrag
  const getRoiColorClass = (roi: string) => {
    const amount = parseInt(roi.replace(/[^0-9]/g, ''));
    if (amount > 400) return "text-green-800 font-bold";
    if (amount > 200) return "text-green-700 font-bold";
    if (amount > 100) return "text-green-600 font-bold";
    return "text-green-700 font-bold";
  };

  // PDF Generatie en download functie
  const handleDownloadPDF = (type: 'strategie' | 'sjablonen' | 'planning' = 'strategie') => {
    // Initialiseer PDF document
    const doc = new jsPDF();
    
    // Titel en styling
    doc.setFontSize(22);
    doc.setTextColor(88, 28, 135); // Purple kleur
    doc.text("Wasgeurtje Social Media Omzet Booster", 20, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Gedownload op: " + new Date().toLocaleDateString(), 20, 30);
    
    doc.setFontSize(18);
    doc.setTextColor(88, 28, 135);
    
    // Inhoud op basis van downloadtype
    if (type === 'strategie') {
      doc.text("Complete Verkoopstrategie", 20, 40);
      
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("1. Het €1000-per-week plan", 20, 50);
      
      doc.setFontSize(12);
      doc.setTextColor(90, 90, 90);
      doc.text("• Post 2x Stories per dag (ochtend & avond)", 25, 60);
      doc.text("• Focus op schaarste-berichten", 25, 65);
      doc.text("• Gebruik Instagram DM voor directe bestellingen", 25, 70);
      doc.text("• Wekelijkse Facebook-post met lokale targeting (10km)", 25, 75);
      doc.text("• Inclusief concrete CTA: 'Reserveer via DM of kom vandaag langs'", 25, 80);
      
      doc.setFontSize(12);
      doc.setTextColor(0, 128, 0);
      doc.text("Resultaat: 4-7% directe conversie, 70-120 extra klanten per maand", 25, 90);

      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("2. Lokale Micro-Influencer Strategie", 20, 105);
      doc.setFontSize(12);
      doc.setTextColor(90, 90, 90);
      doc.text("• Identificeer 3-5 lokale micro-influencers (500-5000 volgers)", 25, 115);
      doc.text("• Geef gratis producten in ruil voor echte reviews", 25, 120);
      doc.text("• Vraag 'Tag een vriend die dit zou waarderen'-posts", 25, 125);
      doc.text("• Organiseer een gezamenlijke give-away actie", 25, 130);
      doc.text("• Stimuleer instagram-mentions met kortingscode", 25, 135);

      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text("3. Exclusieve VIP-FOMO Techniek", 20, 150);
      doc.setFontSize(12);
      doc.setTextColor(90, 90, 90);
      doc.text("• Kondig 'geheime' nieuwe geuren 14 dagen vooraf aan", 25, 160);
      doc.text("• Exclusieve preview voor klanten die reageren", 25, 165);
      doc.text("• Publiceer afteltimer in Stories met prijs-onthulling", 25, 170);
      doc.text("• Beperkte beschikbaarheid benadrukken (max 50 per winkel)", 25, 175);
      doc.text("• WhatsApp-notificatie voor vaste klanten op lanceringsdag", 25, 180);

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Voor het volledige pakket aan templates, bezoek uw retailer dashboard", 20, 200);
      doc.text("of neem contact op met Wasgeurtje support.", 20, 208);

    } else if (type === 'sjablonen') {
      doc.text("Bewezen Sjablonen met ROI", 20, 40);
      
      // Templates en hun content
      const templateInfo = templates.map(template => ({
        titel: template.titel,
        conversie: template.conversie,
        content: template.template.substring(0, 150) + "..."
      }));
      
      let yPos = 50;
      templateInfo.forEach(item => {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(`${item.titel} (${item.conversie} conversie)`, 20, yPos);
        
        doc.setFontSize(10);
        doc.setTextColor(90, 90, 90);
        doc.text(item.content, 25, yPos + 8, { maxWidth: 160 });
        
        yPos += 30;
      });

      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Voor alle volledige sjablonen, open dit tabblad in uw dashboard", 20, 200);
      doc.text("en gebruik de kopieer-functie om direct te implementeren.", 20, 208);

    } else if (type === 'planning') {
      doc.text("7-Dagen Geldmachine Planning", 20, 40);
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("DAG", 20, 55);
      doc.text("TAAK", 70, 55);
      doc.text("TIJDSDUUR", 140, 55);
      doc.text("ROI", 180, 55);
      
      let yPos = 65;
      weekplanning.forEach(item => {
        doc.text(item.dag, 20, yPos);
        doc.text(item.taak, 70, yPos);
        doc.text(item.duur, 140, yPos);
        doc.text(item.roi, 180, yPos);
        yPos += 10;
      });
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Totaal per week", 20, yPos + 5);
      doc.text("7 essentiële taken", 70, yPos + 5);
      doc.text("2-2.5 uur", 140, yPos + 5);
      doc.text("€660-950", 180, yPos + 5);

      doc.setFontSize(14);
      doc.setTextColor(0, 128, 0);
      doc.text("Implementeer deze planning voor gegarandeerde resultaten!", 20, 170);
    }
    
    // Voettekst
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text("© Wasgeurtje B.V. - Exclusief voor officiële retailers", 20, 280);
    
    // Download PDF
    doc.save(`wasgeurtje-social-media-${type}.pdf`);
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Klikbare header die altijd zichtbaar is */}
      <div 
        className="bg-gradient-to-r from-indigo-800 to-purple-900 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <CurrencyEuroIcon className="h-6 w-6 text-yellow-400 mr-2" />
            <h2 className="text-lg font-bold text-white">Social Media Omzet Booster</h2>
          </div>
          <div className="flex items-center">
            <div className="bg-yellow-400 text-indigo-900 px-3 py-1 rounded-full text-xs font-bold mr-3 flex items-center">
              <ArrowUpIcon className="h-3 w-3 mr-1" />
              <span>Tot +€1.250 extra omzet per maand</span>
            </div>
            {expanded ? (
              <ArrowsPointingInIcon className="h-5 w-5 text-white" />
            ) : (
              <ArrowsPointingOutIcon className="h-5 w-5 text-white" />
            )}
          </div>
        </div>
        {!expanded && (
          <p className="text-indigo-200 text-sm mt-1">
            Klik om bewezen sjablonen & strategieën te openen die direct uw kassa laten rinkelen
          </p>
        )}
        {expanded && (
          <p className="text-indigo-200 text-sm mt-1">
            Bewezen sjablonen & strategieën die direct uw kassa laten rinkelen
          </p>
        )}
      </div>

      {/* Uitklapbare inhoud die alleen getoond wordt als expanded=true */}
      {expanded && (
        <>
          {/* Navigatie tabs met omzet-focus */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setActiveView('omzet-boost')}
              className={`flex items-center py-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${
                activeView === 'omzet-boost'
                  ? 'border-b-2 border-purple-600 text-purple-700 bg-purple-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <ChartBarIcon className="h-4 w-4 mr-1" />
              <span>Omzet Boosters</span>
            </button>
            <button
              onClick={() => setActiveView('sjablonen')}
              className={`flex items-center py-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${
                activeView === 'sjablonen'
                  ? 'border-b-2 border-purple-600 text-purple-700 bg-purple-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <ClipboardDocumentCheckIcon className="h-4 w-4 mr-1" />
              <span>Bewezen Sjablonen</span>
            </button>
            <button
              onClick={() => setActiveView('planning')}
              className={`flex items-center py-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${
                activeView === 'planning'
                  ? 'border-b-2 border-purple-600 text-purple-700 bg-purple-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <ClockIcon className="h-4 w-4 mr-1" />
              <span>7-Dagen Geldmachine</span>
            </button>
            <button
              onClick={() => setActiveView('strategie-templates')}
              className={`flex items-center py-2 px-4 text-sm font-medium transition-colors whitespace-nowrap ${
                activeView === 'strategie-templates'
                  ? 'border-b-2 border-purple-600 text-purple-700 bg-purple-50' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <DocumentTextIcon className="h-4 w-4 mr-1" />
              <span>Klaar-voor-gebruik Templates</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="p-3">
            {activeView === 'omzet-boost' && (
              <div className="space-y-4">
                {/* ROI Dashboard */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center">
                      <CurrencyEuroIcon className="h-4 w-4 text-green-700 mr-1" />
                      <span>Bewezen ROI voor retailers</span>
                    </h3>
                    <span className="text-xs font-medium text-purple-900 bg-purple-100 px-2 py-0.5 rounded-full">
                      Gemiddeld na 90 dagen actief gebruik
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                    <div className="bg-white p-2 rounded-lg border border-green-200 shadow-sm">
                      <p className="text-xs text-gray-700 mb-1">Gemiddelde omzetstijging</p>
                      <p className="text-lg font-bold text-green-700 flex items-center">
                        <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                        {roiData.algemeen.gemiddeld}
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-green-200 shadow-sm">
                      <p className="text-xs text-gray-700 mb-1">Top retailers genereren</p>
                      <p className="text-lg font-bold text-green-700 flex items-center">
                        <FireIcon className="h-4 w-4 mr-1" />
                        {roiData.algemeen.topretailers}
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-green-200 shadow-sm">
                      <p className="text-xs text-gray-700 mb-1">Stijging herhalingsaankopen</p>
                      <p className="text-lg font-bold text-green-700 flex items-center">
                        <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                        {roiData.algemeen.klantfrequentie}
                      </p>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                      <thead>
                        <tr className="bg-indigo-100">
                          <th className="px-2 py-1.5 text-left font-medium text-indigo-900">Social Kanaal</th>
                          <th className="px-2 py-1.5 text-left font-medium text-indigo-900">Conversie</th>
                          <th className="px-2 py-1.5 text-left font-medium text-indigo-900">Bereik</th>
                          <th className="px-2 py-1.5 text-left font-medium text-indigo-900">Tijdsinvestering</th>
                          <th className="px-2 py-1.5 text-right font-medium text-indigo-900">Maandelijkse ROI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {roiData.perkanaal.map((item, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-blue-50'}>
                            <td className="px-2 py-1.5 font-medium text-gray-800">{item.kanaal}</td>
                            <td className="px-2 py-1.5 text-gray-800">{item.conversie}</td>
                            <td className="px-2 py-1.5 text-gray-800">{item.bereik}</td>
                            <td className="px-2 py-1.5 text-gray-800">{item.investering}</td>
                            <td className="px-2 py-1.5 text-green-700 font-bold text-right">{item.roi}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Strategies */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center">
                    <AdjustmentsHorizontalIcon className="h-4 w-4 text-purple-600 mr-1" />
                    Implementeer deze strategie voor directe omzetverhoging
                  </h3>
                  
                  {strategies.map((strategy) => (
                    <div key={strategy.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                      <div className={`flex justify-between items-start mb-2 pb-2 border-b`}>
                        <div className="flex items-center">
                          <div className={`flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r ${strategy.color} text-white mr-2 flex-shrink-0`}>
                            <FireIcon className="h-3 w-3" />
                          </div>
                          <h4 className="text-sm font-bold text-gray-900">{strategy.titel}</h4>
                        </div>
                        <span className="text-xs bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5 font-medium">
                          {strategy.tijdsinvestering}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 mb-2">{strategy.beschrijving}</p>
                      
                      <ul className="mb-2 space-y-1.5">
                        {strategy.items.map((item, index) => (
                          <li key={index} className="text-xs flex items-start">
                            <span className="bg-green-100 text-green-800 rounded-full h-4 w-4 flex items-center justify-center flex-shrink-0 mt-0.5 mr-1 text-xs">
                              {index + 1}
                            </span>
                            <span className="text-gray-700">{item}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <div className="bg-purple-50 p-2 rounded text-xs">
                        <div className="font-medium text-purple-900 mb-1">Verwachte resultaten:</div>
                        <div className="text-purple-800">{strategy.resultaten}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeView === 'sjablonen' && (
              <div className="space-y-3">
                <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-indigo-900 flex items-center">
                    <ClipboardDocumentCheckIcon className="h-4 w-4 text-indigo-600 mr-1" />
                    <span>Kopieer-plak templates met bewezen ROI</span>
                  </h3>
                  <span className="text-xs text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                    Klik om te openen en kopiëren
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.map((template) => (
                    <div 
                      key={template.id}
                      className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setActiveTemplate(template.id === activeTemplate ? null : template.id);
                      }}
                    >
                      <div className="flex justify-between items-center bg-gray-50 px-3 py-2 border-b border-gray-200">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900">{template.titel}</h4>
                          <p className="text-xs text-gray-600">Voor gebruik op {template.kanaal}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`${template.tagColor} text-white text-xs px-2 py-0.5 rounded-full font-medium`}>
                            {template.tag}
                          </span>
                          <span className="text-xs font-medium text-green-600 mt-1 flex items-center">
                            <FireIcon className="h-3 w-3 mr-0.5" />
                            {template.conversie} conversie
                          </span>
                        </div>
                      </div>
                      
                      {activeTemplate === template.id && (
                        <div className="p-3">
                          <div className={`${template.bgGradient} p-3 rounded border border-gray-200 text-xs text-gray-700 mb-2 whitespace-pre-line`}>
                            {template.template}
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              copyTemplate(template.template);
                            }}
                            className="w-full py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded transition-colors flex items-center justify-center"
                          >
                            <ClipboardDocumentCheckIcon className="h-4 w-4 mr-1" />
                            Kopieer dit sjabloon
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeView === 'planning' && (
              <div className="space-y-3">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-3 rounded-lg mb-2 text-white">
                  <h3 className="text-sm font-bold mb-1 flex items-center">
                    <FireIcon className="h-4 w-4 mr-1 text-yellow-400" />
                    7-Dagen Geldmachine
                  </h3>
                  <p className="text-xs">
                    Dit schema levert <span className="font-bold text-yellow-300">€660-950 extra omzet per week</span> op. Elke taak duurt minder dan 30 minuten.
                  </p>
                </div>
                
                <div className="overflow-x-auto rounded-lg border border-gray-300 shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead>
                      <tr className="bg-indigo-100">
                        <th className="px-3 py-2 text-left font-medium text-indigo-900">Dag</th>
                        <th className="px-3 py-2 text-left font-medium text-indigo-900">Taak</th>
                        <th className="px-3 py-2 text-left font-medium text-indigo-900">Tijdsduur</th>
                        <th className="px-3 py-2 text-right font-medium text-indigo-900">Directe ROI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {weekplanning.map((item, index) => (
                        <tr key={index} className={item.bgColor === "bg-blue-50" ? "bg-blue-50" : "bg-white"}>
                          <td className="px-3 py-2 font-medium text-gray-800">{item.dag}</td>
                          <td className="px-3 py-2 text-gray-800">{item.taak}</td>
                          <td className="px-3 py-2 text-gray-800">{item.duur}</td>
                          <td className={`px-3 py-2 ${getRoiColorClass(item.roi)} text-right`}>{item.roi}</td>
                        </tr>
                      ))}
                      <tr className="bg-green-100">
                        <td className="px-3 py-2 font-medium text-green-900">Totaal per week</td>
                        <td className="px-3 py-2 text-green-900">7 essentiële taken</td>
                        <td className="px-3 py-2 text-green-900">2-2.5 uur</td>
                        <td className="px-3 py-2 font-bold text-green-800 text-right">€660-950</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-3 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                    <AdjustmentsHorizontalIcon className="h-4 w-4 text-blue-500 mr-1" />
                    Implementatie Tips
                  </h4>
                  <ul className="space-y-1.5">
                    <li className="text-xs flex items-start">
                      <span className="bg-green-100 text-green-600 rounded-full h-4 w-4 flex-shrink-0 flex items-center justify-center mr-1.5">✓</span>
                      <span className="text-gray-700">Plan taken vooraf in uw agenda met exacte tijdsblokken</span>
                    </li>
                    <li className="text-xs flex items-start">
                      <span className="bg-green-100 text-green-600 rounded-full h-4 w-4 flex-shrink-0 flex items-center justify-center mr-1.5">✓</span>
                      <span className="text-gray-700">Gebruik de sjablonen uit het 'Bewezen Sjablonen' tabblad</span>
                    </li>
                    <li className="text-xs flex items-start">
                      <span className="bg-green-100 text-green-600 rounded-full h-4 w-4 flex-shrink-0 flex items-center justify-center mr-1.5">✓</span>
                      <span className="text-gray-700">Monitor conversie via berichten, telefoontjes en winkelbezoeken</span>
                    </li>
                    <li className="text-xs flex items-start">
                      <span className="bg-green-100 text-green-600 rounded-full h-4 w-4 flex-shrink-0 flex items-center justify-center mr-1.5">✓</span>
                      <span className="text-gray-700">Vraag klanten hoe ze u gevonden hebben en noteer dit</span>
                    </li>
                    <li className="text-xs flex items-start">
                      <span className="bg-green-100 text-green-600 rounded-full h-4 w-4 flex-shrink-0 flex items-center justify-center mr-1.5">✓</span>
                      <span className="text-gray-700">Optioneel: gebruik €20/week Facebook advertentiebudget voor 2-3x ROI</span>
                    </li>
                  </ul>
                </div>
                
                {/* Downloadsectie toevoegen */}
                <div className="mt-4 flex justify-end">
                  <button 
                    onClick={() => handleDownloadPDF('planning')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded transition-colors flex items-center"
                  >
                    <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
                    Download planning als PDF
                  </button>
                </div>
              </div>
            )}

            {activeView === 'strategie-templates' && (
              <div className="space-y-4">
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                  <h3 className="text-sm font-bold text-indigo-900 mb-1">Klaar-voor-gebruik Strategie Templates</h3>
                  <p className="text-xs text-indigo-800">
                    Kopieer deze berichten direct naar je social media apps - vul alleen de tekst tussen [VIERKANTE HAAKJES] aan met jouw specifieke informatie!
                  </p>
                </div>

                {/* €1000-per-week plan Templates */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-3 py-2">
                    <h3 className="text-sm font-bold text-white flex items-center">
                      <CurrencyEuroIcon className="h-4 w-4 mr-2 text-yellow-300" />
                      Het €1000-per-week plan
                    </h3>
                    <p className="text-xs text-blue-100">45 min per dag, 5-6 dagen per week - 4-7% directe conversie, 70-120 extra klanten per maand</p>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {strategieTemplates["1000-per-week"].map((template) => (
                      <div key={template.id} className="p-3 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">{template.titel}</h4>
                            <p className="text-xs text-gray-600">{template.type} • Beste tijd: {template.tijd}</p>
                          </div>
                          <button 
                            onClick={() => copyTemplate(template.template)}
                            className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-medium flex items-center"
                          >
                            <DocumentDuplicateIcon className="h-3 w-3 mr-1" />
                            Kopieer
                          </button>
                        </div>
                        <div className="bg-blue-50 rounded p-2 text-xs text-gray-800 whitespace-pre-line border border-blue-100">
                          {template.template}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lokale Micro-Influencer Strategie Templates */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-pink-600 to-rose-700 px-3 py-2">
                    <h3 className="text-sm font-bold text-white flex items-center">
                      <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2 text-pink-200" />
                      Lokale Micro-Influencer Strategie
                    </h3>
                    <p className="text-xs text-pink-100">2-3 uur setup, daarna 20 min/dag monitoring - 250-500 nieuwe profielbezoekers per actie</p>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {strategieTemplates["micro-influencer"].map((template) => (
                      <div key={template.id} className="p-3 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">{template.titel}</h4>
                            <p className="text-xs text-gray-600">{template.type} • Timing: {template.tijd}</p>
                          </div>
                          <button 
                            onClick={() => copyTemplate(template.template)}
                            className="bg-pink-100 text-pink-700 px-2 py-1 rounded text-xs font-medium flex items-center"
                          >
                            <DocumentDuplicateIcon className="h-3 w-3 mr-1" />
                            Kopieer
                          </button>
                        </div>
                        <div className="bg-pink-50 rounded p-2 text-xs text-gray-800 whitespace-pre-line border border-pink-100">
                          {template.template}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exclusieve VIP-FOMO Techniek Templates */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-600 to-orange-700 px-3 py-2">
                    <h3 className="text-sm font-bold text-white flex items-center">
                      <FireIcon className="h-4 w-4 mr-2 text-yellow-300" />
                      Exclusieve VIP-FOMO Techniek
                    </h3>
                    <p className="text-xs text-orange-100">4-5 uur voorbereiding, 1 uur op de dropdag - €900-€1400 directe omzet per drop</p>
                  </div>
                  
                  <div className="divide-y divide-gray-200">
                    {strategieTemplates["vip-fomo"].map((template) => (
                      <div key={template.id} className="p-3 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">{template.titel}</h4>
                            <p className="text-xs text-gray-600">{template.type} • Timing: {template.tijd}</p>
                          </div>
                          <button 
                            onClick={() => copyTemplate(template.template)}
                            className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-medium flex items-center"
                          >
                            <DocumentDuplicateIcon className="h-3 w-3 mr-1" />
                            Kopieer
                          </button>
                        </div>
                        <div className="bg-amber-50 rounded p-2 text-xs text-gray-800 whitespace-pre-line border border-amber-100">
                          {template.template}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Downloadsectie toevoegen */}
                <div className="mt-4 flex justify-end">
                  <button 
                    onClick={() => handleDownloadPDF('sjablonen')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-1.5 rounded transition-colors flex items-center"
                  >
                    <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
                    Download sjablonen als PDF
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer met verkoopfocus en downloadfunctie */}
          <div className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-between">
            <span className="text-xs text-white font-medium flex items-center">
              <ShoppingCartIcon className="h-3 w-3 mr-1" />
              <span>Direct toepasbaar voor verkoop-verhoging</span>
            </span>
            <button 
              onClick={() => handleDownloadPDF('strategie')}
              className="text-xs bg-white hover:bg-gray-100 text-emerald-700 px-3 py-1 rounded transition-colors font-medium shadow-sm flex items-center"
            >
              <ArrowDownTrayIcon className="h-3 w-3 mr-1" />
              Download volledige verkoopstrategie
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default SocialMediaGuide;