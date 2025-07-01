export interface Retailer {
  id: number;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  province?: string;
  date: Date;
  category?: string;
}

// Process the retailer data
export const allRetailers: Retailer[] = [
  { id: 1, name: "Handelsonderneming Wiekken", address: "Kouvenderstraat 141", postalCode: "6431HD", city: "Hoensbroek", date: new Date("2024-09-24"), category: "home" },
  { id: 2, name: "ukkie shop Home gift & kids", address: "hoofdstraat 24", postalCode: "1777 cb", city: "Hippolytushoef", date: new Date("2024-08-12"), category: "kids" },
  { id: 3, name: "Beauté", address: "Hoofdstraat 11", postalCode: "7811EA", city: "Emmen", date: new Date("2024-07-11"), category: "beauty" },
  { id: 4, name: "Stoel Witgoed", address: "Rondweg 70", postalCode: "8091 XK", city: "Wezep", date: new Date("2024-07-10"), category: "home" },
  { id: 5, name: "Skincafé", address: "Westerdorpsstraat 22a", postalCode: "3871 AX", city: "Hoevelaken", date: new Date("2024-03-25"), category: "beauty" },
  { id: 6, name: "Fred Abcoude", address: "Hoogstraat 32", postalCode: "1391BV", city: "Abcoude", date: new Date("2024-03-13"), category: "lifestyle" },
  { id: 7, name: "Casa Bergen", address: "Kerkstraat 11", postalCode: "1861KR", city: "Bergen", date: new Date("2024-02-01"), category: "home" },
  { id: 8, name: "'t Liers Boetiekske", address: "Berlarij 19", postalCode: "2500", city: "Lier", date: new Date("2024-02-01"), category: "fashion" },
  { id: 9, name: "Lush & Lovely", address: "Friesestraat 8", postalCode: "7741 GV", city: "Coevorden", date: new Date("2024-02-01"), category: "beauty" },
  { id: 10, name: "Jailine Flowers", address: "van Hoytemastraat 69", postalCode: "2596 EP", city: "Den Haag", date: new Date("2024-02-01"), category: "flowers" },
  { id: 11, name: "Sunday's Frederik Hendriklaan", address: "Frederik Hendriklaan 295", postalCode: "2582 CE", city: "Den Haag", date: new Date("2024-02-01"), category: "lifestyle" },
  { id: 12, name: "Size For You", address: "Grotestraat 13", postalCode: "7631 BT", city: "Ootmarsum", date: new Date("2024-02-01"), category: "fashion" },
  { id: 13, name: "Pets&Co Dick Zanting", address: "Zwartepad 18", postalCode: "7451 BJ", city: "Holten", date: new Date("2023-10-27"), category: "pets" },
  { id: 14, name: "Eindeloos Bloemen", address: "Spiegelstraat 36", postalCode: "1405 HX", city: "Bussum", date: new Date("2023-10-25"), category: "flowers" },
  { id: 15, name: "La Deinte", address: "Korte Tiendeweg 24a", postalCode: "2801 JT", city: "Gouda", date: new Date("2023-10-24"), category: "beauty" },
  { id: 16, name: "Zuid7even", address: "Oostermeent Zuid 7", postalCode: "1274 ST", city: "Huizen", date: new Date("2023-10-23"), category: "lifestyle" },
  { id: 17, name: "Zuid7even", address: "G. van Amstelstraat 151", postalCode: "1214 AX", city: "Hilversum", date: new Date("2023-10-23"), category: "lifestyle" },
  { id: 18, name: "Jan van Peer koken,tafelen,cadeaus", address: "Hoofdstraat 123", postalCode: "7811ek", city: "Emmen", date: new Date("2023-10-06"), category: "home" },
  { id: 19, name: "Beddenspecialist MALDEN", address: "Passage 1", postalCode: "6581 WK", city: "MALDEN", date: new Date("2023-10-06"), category: "sleep" },
  { id: 20, name: "Beddenspecialist Jac Nota", address: "Cornelis de Vriesweg 50", postalCode: "1746 CM", city: "Dirkshorn", date: new Date("2023-10-06"), category: "sleep" },
  { id: 21, name: "HPco ruitersport en dierenspeciaalzaak", address: "Kleingraverstraat 67", postalCode: "6466 EB", city: "Kerkrade", date: new Date("2023-09-12"), category: "pets" },
  { id: 22, name: "Kapsalon Clarisse", address: "Oostdam 53", postalCode: "4551CH", city: "Sas van Gent", date: new Date("2023-08-30"), category: "beauty" },
  { id: 23, name: "Nameless", address: "Vliethof 7", postalCode: "2291 RX", city: "Wateringen", date: new Date("2023-08-08"), category: "lifestyle" },
  { id: 24, name: "Donna Colori", address: "Korte Lijnbaan 18a", postalCode: "3012 ED", city: "Rotterdam", date: new Date("2023-06-23"), category: "fashion" },
  { id: 25, name: "Mirs Fashion", address: "Spoorstraat 3", postalCode: "7481 HV", city: "Haaksbergen", date: new Date("2023-06-21"), category: "fashion" },
  { id: 26, name: "Backstage By Dani", address: "Haarlemmerstraat 21", postalCode: "2312 DJ", city: "Leiden", date: new Date("2023-05-31"), category: "beauty" },
  { id: 27, name: "Foto Kado En Meer", address: "Bezaanjachtplein 299", postalCode: "1034 CR", city: "Amsterdam", date: new Date("2023-05-03"), category: "lifestyle" },
  { id: 28, name: "BiWest Lifestyle", address: "Hoofdstraat 55", postalCode: "5171DJ", city: "Kaatsheuvel", date: new Date("2023-05-03"), category: "lifestyle" },
  { id: 29, name: "Primera De Vrijheid", address: "Klokbekerweg 170", postalCode: "8081 JJ", city: "Elburg", date: new Date("2023-04-25"), category: "lifestyle" },
  { id: 30, name: "Gastenverblijf In De Wij", address: "Lytsewei 9", postalCode: "9132 LL", city: "Engwierum", date: new Date("2023-04-18"), category: "home" },
  { id: 31, name: "MOOI", address: "Langestraat 505", postalCode: "7891 AX", city: "Klazienaveen", date: new Date("2023-04-12"), category: "beauty" },
  { id: 32, name: "DE MEIDEN", address: "Centrumpassage 57", postalCode: "2903 HA", city: "Capelle aan de IJssel", date: new Date("2023-04-12"), category: "fashion" },
  { id: 33, name: "Alwi's boetiek mode", address: "Beukenhoek 2", postalCode: "7681 HH", city: "Vroomshoop", date: new Date("2023-03-26"), category: "fashion" },
  { id: 34, name: "Primera Kerssies", address: "Straatsburg 8", postalCode: "7559 NM", city: "Hengelo", date: new Date("2023-03-26"), category: "lifestyle" },
  { id: 35, name: "Het Kadoplein", address: "Kerkstraat 12", postalCode: "5931 NN", city: "Tegelen", date: new Date("2023-03-15"), category: "lifestyle" },
  { id: 36, name: "Praktijk AromaBalans", address: "Grindweg 194", postalCode: "8483 JK", city: "Scherpenzeel", date: new Date("2023-03-13"), category: "beauty" },
  { id: 37, name: "TBK Baby Spa", address: "Dorpsstraat 35", postalCode: "2912 CA", city: "Nieuwerkerk aan den IJssel", date: new Date("2023-03-07"), category: "kids" },
  { id: 38, name: "K & K Kappers", address: "Ruiterskwartier 121", postalCode: "8911BS", city: "Leeuwarden", date: new Date("2023-01-30"), category: "beauty" },
  { id: 39, name: "BV Xanten", address: "Diesterstraat 31", postalCode: "3980", city: "Tessenderlo", date: new Date("2023-01-30"), category: "home" },
  { id: 40, name: "Zonnestudio Summer Vibes", address: "Kronenburgpromende 34", postalCode: "6831EA", city: "Arnhem", date: new Date("2023-01-16"), category: "beauty" },
  { id: 41, name: "Veldkamp Keukens B.V.", address: "Zuiderzeestraatweg 136", postalCode: "8096 CD", city: "Oldebroek", date: new Date("2023-01-06"), category: "home" },
  { id: 42, name: "Mooi Bij Marloes", address: "Kanaalstraat 11B", postalCode: "5711 ED", city: "Someren", date: new Date("2022-12-15"), category: "beauty" },
  { id: 43, name: "Cramers van Asten", address: "Maasstraat 19-21", postalCode: "6001 EB", city: "Weert", date: new Date("2022-12-15"), category: "lifestyle" },
  { id: 44, name: "Wasserette-Weert", address: "Maaseikerweg 6A", postalCode: "6001 BS", city: "Weert", date: new Date("2022-12-15"), category: "home" },
  { id: 45, name: "Primera Aabe", address: "Aabestraat 7-9", postalCode: "5021AV", city: "Tilburg", date: new Date("2022-12-15"), category: "lifestyle" },
  { id: 46, name: "VIlla Bloom", address: "Parkstraat 5", postalCode: "5671 GD", city: "Nuenen", date: new Date("2022-11-22"), category: "flowers" },
  { id: 47, name: "Retomeubel Weurt", address: "Houtweg 12", postalCode: "6551 AJ", city: "Weurt", date: new Date("2022-11-10"), category: "home" },
  { id: 48, name: "Huidverbeteringskliniek Image", address: "Tureluur 6", postalCode: "3245 TH", city: "Sommelsdijk", date: new Date("2022-11-07"), category: "beauty" },
  { id: 49, name: "Inge At Home", address: "Boschweg 228", postalCode: "5481 EK", city: "Schijndel", date: new Date("2022-09-22"), category: "home" },
  { id: 50, name: "Little Home Deco", address: "Pentelstraat 29", postalCode: "5469HD", city: "Erp", date: new Date("2022-09-20"), category: "home" },
  { id: 51, name: "Beddenspecialist Van Veldhuizen", address: "Garderbroekerweg 146", postalCode: "3774 JH", city: "Kootwijkerbroek", date: new Date("2022-09-19"), category: "sleep" },
  { id: 52, name: "Sleeptrade", address: "De Wel 6", postalCode: "3871 MV", city: "Hoevelaken", date: new Date("2022-09-16"), category: "sleep" },
  { id: 53, name: "Beddenspecialist Verkade", address: "V.Limburg Stirumstraat 38", postalCode: "2201JP", city: "Noordwijk", date: new Date("2022-09-16"), category: "sleep" },
  { id: 54, name: "Beddenspecialist TMC", address: "Marconistraat 13", postalCode: "4461 HH", city: "Goes", date: new Date("2022-09-16"), category: "sleep" },
  { id: 55, name: "Beddenspecialist PrinsHeerlijkSlapen", address: "Hoofdstraat 14", postalCode: "9500 CL", city: "Stadskanaal", date: new Date("2022-09-16"), category: "sleep" },
  { id: 56, name: "Beddenspecialist Konijnenbelt", address: "Grotestraat 162", postalCode: "7443 BP", city: "Nijverdal", date: new Date("2022-09-16"), category: "sleep" },
  { id: 57, name: "Beddenspecialist Jac Nota", address: "Corn.de Vriesweg 50", postalCode: "1746 CM", city: "Dirkshorn", date: new Date("2022-09-16"), category: "sleep" },
  { id: 58, name: "Beddenspecialist Huisman Steenwijk", address: "Gasthuisstraat 39", postalCode: "8331 JM", city: "Steenwijk", date: new Date("2022-09-16"), category: "sleep" },
  { id: 59, name: "Beddenspecialist Houben", address: "Bogardeind 67", postalCode: "5664 EB", city: "Geldrop", date: new Date("2022-09-16"), category: "sleep" },
  { id: 60, name: "Beddenspecialist Frans Poorter", address: "Verlaat 6", postalCode: "3861 AA", city: "Nijkerk", date: new Date("2022-09-16"), category: "sleep" },
  { id: 61, name: "Beddenspecialist Dekker Slapen", address: "Steenbergerweg 2", postalCode: "7921 GE", city: "Zuidwolde", date: new Date("2022-09-16"), category: "sleep" },
  { id: 62, name: "Beddenspecialist De Vries Druten", address: "Markt 1", postalCode: "6651 BC", city: "Druten", date: new Date("2022-09-16"), category: "sleep" },
  { id: 63, name: "Beddenspecialist De Vos Burchart", address: "Hoogstraat 172", postalCode: "3111 HP", city: "Schiedam", date: new Date("2022-09-16"), category: "sleep" },
  { id: 64, name: "Imanse Aanhangwagens & Caravans", address: "Witteweg 5", postalCode: "1431 GZ", city: "Aalsmeer", date: new Date("2022-09-16"), category: "home" },
  { id: 65, name: "Joy House of Brands Zuidhorn", address: "De Dorpsvenne 2a", postalCode: "9801 DA", city: "Zuidhorn", date: new Date("2022-09-13"), category: "lifestyle" },
  { id: 66, name: "Joy House of Brands Zuidlaren", address: "Stationsweg 34", postalCode: "9471 GS", city: "Zuidlaren", date: new Date("2022-09-13"), category: "lifestyle" },
  { id: 67, name: "Joy House of Brands Haren", address: "Rijksstraatweg 163a", postalCode: "9752 BE", city: "Haren", date: new Date("2022-09-13"), category: "lifestyle" },
  { id: 68, name: "Joy House of Brands Roden", address: "Albertsbaan 58", postalCode: "9301 AZ", city: "Roden", date: new Date("2022-09-13"), category: "lifestyle" },
  { id: 69, name: "Etos", address: "Markt 58", postalCode: "2801 JM", city: "Gouda", date: new Date("2022-09-09"), category: "beauty" },
  { id: 70, name: "Vof van Laere", address: "Vrombautstraat 109", postalCode: "9900", city: "Eeklo", date: new Date("2022-09-09"), category: "home" },
  { id: 71, name: "MUMS Fashion & More", address: "Eurowerft 9", postalCode: "7591 DE", city: "Denekamp", date: new Date("2022-09-09"), category: "fashion" },
  { id: 72, name: "Beauty Fix", address: "Rietveen 18", postalCode: "2912 SK", city: "Nieuwerkerk aan den IJssel", date: new Date("2022-09-09"), category: "beauty" },
  { id: 73, name: "Zenzo Yoga", address: "Raadhuisplein 1b", postalCode: "2042 LR", city: "Zandvoort", date: new Date("2022-09-09"), category: "beauty" },
  { id: 74, name: "Ivon's Hairshop", address: "Pasveldweg 20", postalCode: "6078 HD", city: "Roggel", date: new Date("2022-09-09"), category: "beauty" },
  { id: 75, name: "Nagelstudio Suzanne", address: "Dagpauwoog 6", postalCode: "3863 HK", city: "Nijkerk", date: new Date("2022-09-09"), category: "beauty" },
  { id: 76, name: "Haarstudio 51", address: "Spoordonkseweg 51", postalCode: "5688 KB", city: "Oirschot", date: new Date("2022-07-29"), category: "beauty" },
  { id: 77, name: "Etos (tweede vermelding)", address: "Van Woustraat 81-83", postalCode: "1074 AD", city: "Amsterdam", date: new Date("2022-07-29"), category: "beauty" },
  { id: 78, name: "Zonnestudio ChariSun", address: "Hadewijchplaats 60", postalCode: "3207 KG", city: "Spijkenisse", date: new Date("2022-07-29"), category: "beauty" },
  { id: 79, name: "Voet & Huid", address: "Molenkampseweg 2", postalCode: "5681 PE", city: "Best", date: new Date("2022-07-29"), category: "beauty" },
  { id: 80, name: "Carole Hairfashion", address: "Kanaalweg 17", postalCode: "7591 NH", city: "Denekamp", date: new Date("2022-06-24"), category: "beauty" },
  { id: 81, name: "Jenn's Trimsalon", address: "Zeelt 112", postalCode: "2954 BK", city: "Alblasserdam", date: new Date("2022-06-24"), category: "pets" },
  { id: 82, name: "Dieke mixstore", address: "Venestraat 1", postalCode: "3861 BV", city: "Nijkerk", date: new Date("2022-06-10"), category: "lifestyle" },
  { id: 83, name: "By Suusz", address: "Runde noordzijde 88", postalCode: "7881JK", city: "Emmer-Compascuum", date: new Date("2022-05-27"), category: "fashion" },
  { id: 84, name: "trimsalon4happypaws", address: "Heufkestraat 33", postalCode: "6444GM", city: "Brunssum", date: new Date("2022-05-27"), category: "pets" },
  { id: 85, name: "zeepensoapies", address: "Riperwei 26", postalCode: "8623 XN", city: "Jutrijp", date: new Date("2022-05-27"), category: "home" },
  { id: 86, name: "Strijkservice Romy", address: "Beukenlaan 3", postalCode: "8441 ND", city: "Heerenveen", date: new Date("2022-04-25"), category: "home" },
  { id: 87, name: "Beddenspecialist van veldhuizen", address: "Garderbroekerweg 146", postalCode: "3774 JH", city: "Kootwijkerbroek", date: new Date("2022-04-14"), category: "sleep" },
  { id: 88, name: "Aromas Beautysalon", address: "Staringstraat 284", postalCode: "7552 LG", city: "Hengelo", date: new Date("2022-04-12"), category: "beauty" },
  { id: 89, name: "Trendy Nails City", address: "Leeghwaterstraat 31-06", postalCode: "2811DT", city: "Reeuwijk", date: new Date("2022-03-22"), category: "beauty" },
  { id: 90, name: "Etos Monnickendam", address: "t'Spil 43", postalCode: "1141 SG", city: "Monnickendam", date: new Date("2022-03-10"), category: "beauty" },
  { id: 91, name: "Etos Julianadorp", address: "Schoolweg 17", postalCode: "1787 AV", city: "Julianadorp", date: new Date("2022-03-10"), category: "beauty" },
  { id: 92, name: "Etos kersenboogerd", address: "Aagje Dekenplein 7", postalCode: "1628 NX", city: "Hoorn", date: new Date("2022-03-10"), category: "beauty" },
  { id: 93, name: "JEFTA fashion&more", address: "Kerkstraat 37", postalCode: "4191 AA", city: "Geldermalsen", date: new Date("2022-03-09"), category: "fashion" },
  { id: 94, name: "Talitha's Hondentrimsalon", address: "De Wuurde 124", postalCode: "6662 nb", city: "Elst", date: new Date("2022-03-02"), category: "pets" },
  { id: 95, name: "Salon de Mireille Lashes & Brows & Tanning", address: "Bouwdijk 5", postalCode: "3248 LA", city: "Melissant", date: new Date("2022-03-02"), category: "beauty" },
  { id: 96, name: "Coach and Shine", address: "TURFKADE 3", postalCode: "3231 AR", city: "Brielle", date: new Date("2022-03-02"), category: "beauty" },
  { id: 97, name: "Slaapkamer van Lisse", address: "Heereweg 193", postalCode: "2161 BD", city: "Lisse", date: new Date("2022-03-02"), category: "sleep" },
  { id: 98, name: "kenza we love fashion", address: "Dorpsstraat 14", postalCode: "5241 EC", city: "Rosmalen", date: new Date("2022-03-02"), category: "fashion" },
  { id: 99, name: "blossom-online", address: "Willem Eggertstraat 61", postalCode: "1441 CH", city: "Purmerend", date: new Date("2022-03-02"), category: "lifestyle" },
  { id: 100, name: "Loesjemode", address: "Keizerstraat 169", postalCode: "2584 BE", city: "Den Haag", date: new Date("2022-03-02"), category: "fashion" },
  { id: 101, name: "Mooi Bij Kim", address: "Binnenpolder 6", postalCode: "1689 CH", city: "Zwaag", date: new Date("2022-03-02"), category: "beauty" },
  { id: 102, name: "Kapsalon My Way", address: "Malzwin 1326", postalCode: "1788XA", city: "Julianadorp", date: new Date("2022-03-02"), category: "beauty" },
  { id: 103, name: "STUDIO10 NAILS&MORE", address: "Zicht 10", postalCode: "7591SB", city: "Denekamp", date: new Date("2022-02-24"), category: "beauty" },
  { id: 104, name: "De Perenhoeve", address: "Dokter Larijweg 87 A", postalCode: "7961 NP", city: "Ruinerwold", date: new Date("2022-02-24"), category: "home" },
  { id: 105, name: "zuster annekie", address: "Gemeenteweg 332a", postalCode: "7951 PE", city: "Staphorst", date: new Date("2022-02-24"), category: "beauty" },
  { id: 106, name: "Praktijk Medlertol", address: "Ruurloseweg 123", postalCode: "7251LD", city: "Medler", date: new Date("2022-01-26"), category: "beauty" },
  { id: 107, name: "Beddenspecialist Huisman", address: "Penning 2", postalCode: "8305 BH", city: "Emmeloord", date: new Date("2022-01-26"), category: "sleep" },
  { id: 108, name: "C-you", address: "Kapelweg 2A", postalCode: "6121JB", city: "Bjorn", date: new Date("2022-01-16"), category: "beauty" },
  { id: 109, name: "Jan Groen – De bloemenspecialist van Zwolle", address: "V.d. Capellenstraat 140", postalCode: "8014VS", city: "Zwolle", date: new Date("2022-01-16"), category: "flowers" },
  { id: 110, name: "linique", address: "Nieuweweg 22A", postalCode: "1251LJ", city: "Laren", date: new Date("2022-01-16"), category: "beauty" },
  { id: 111, name: "Blackpoint Fashion", address: "Middenwaard 36", postalCode: "1703SE", city: "Heerhugowaard", date: new Date("2021-12-02"), category: "fashion" },
  { id: 112, name: "Beautyhouse Jeanette", address: "voorstraat 9", postalCode: "88611 BC", city: "Harlingen", date: new Date("2021-11-30"), category: "beauty" },
  { id: 113, name: "Tiara Lifestyle", address: "Paulus Potterstraat 23", postalCode: "2951 SV", city: "ALBLASSERDAM", date: new Date("2021-11-30"), category: "lifestyle" },
  { id: 114, name: "Hondentrimsalon la plus belle", address: "Dorpsstraat 271", postalCode: "1566 BB", city: "ASSENDELFT", date: new Date("2021-11-30"), category: "pets" },
  { id: 115, name: "Brows&Tanning", address: "Bouwdijk 5", postalCode: "3248 LA", city: "MELISSANT", date: new Date("2021-11-30"), category: "beauty" },
  { id: 116, name: "NETT Kado", address: "Hogestraat 59", postalCode: "6651 BH", city: "Druten", date: new Date("2021-11-30"), category: "lifestyle" },
  { id: 117, name: "Dames van t dorp", address: "stadhuispassage 3", postalCode: "3201ES", city: "Spijkenisse", date: new Date("2021-11-30"), category: "fashion" },
  { id: 118, name: "Annelie", address: "Pastoriestraat 2", postalCode: "7721 cw", city: "Dalfsen", date: new Date("2021-11-30"), category: "lifestyle" },
  { id: 119, name: "Bluf't", address: "Gedempte Gracht 84", postalCode: "1506 CJ", city: "Zaandam", date: new Date("2021-07-12"), category: "lifestyle" },
  { id: 120, name: "Beauty Nails & Feet Angela Hoogendijk", address: "Amsterdamstraat 48", postalCode: "2032 PR", city: "HAARLEM", date: new Date("2021-07-12"), category: "beauty" },
];

export const getRecentRetailers = (days = 60): Retailer[] => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return allRetailers.filter(retailer => retailer.date > cutoffDate);
};

export const getCategoryCounts = (): Record<string, number> => {
  const counts: Record<string, number> = {};
  
  allRetailers.forEach(retailer => {
    const category = retailer.category || 'unknown';
    counts[category] = (counts[category] || 0) + 1;
  });
  
  return counts;
};

export const getRetailersByProvince = (province: string): Retailer[] => {
  // In a real implementation, we would have province data for each retailer
  // This is a simplified example
  return allRetailers.filter(retailer => {
    switch(province.toLowerCase()) {
      case 'noord-holland':
        // Simple check for Noord-Holland postal codes (1xxx & 2xxx)
        return retailer.postalCode.startsWith('1') || retailer.postalCode.startsWith('2');
      case 'zuid-holland':
        // Simple check for Zuid-Holland postal codes (mostly 2xxx & 3xxx)
        return retailer.postalCode.startsWith('2') || retailer.postalCode.startsWith('3');
      // Add more provinces as needed
      default:
        return false;
    }
  });
};

export const findNearbyRetailers = (postalCode: string, radiusKm = 15): Retailer[] => {
  // In a real implementation, this would use geolocation services
  // For now, we'll just return retailers with similar postal codes
  
  const postalPrefix = postalCode.substring(0, 2);
  return allRetailers.filter(retailer => retailer.postalCode.startsWith(postalPrefix));
}; 