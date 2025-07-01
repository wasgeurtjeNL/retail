# Wasgeurtje Retail Applicatie Setup

Deze README geeft uitleg over de ontwikkelomgeving voor de Wasgeurtje Retail applicatie, met de nadruk op het configureren van Supabase en het oplossen van veelvoorkomende problemen.

## 🚀 Snel starten

Voor de snelste manier om de applicatie te starten, gebruik een van de volgende methoden:

### Windows

- **PowerShell**: Dubbelklik op `start-app.ps1` of run het in PowerShell
- **Command Prompt**: Dubbelklik op `start-app.bat` of run het in CMD

## ⚙️ Configuratie

### .env.local

De applicatie gebruikt een `.env.local` bestand in de hoofdmap voor configuratie. Dit bestand bevat:

```
NEXT_PUBLIC_SUPABASE_URL=https://jouw-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=jouw-anon-key
```

**Let op**: Als je dit bestand niet aanmaakt, zullen de `start-app` scripts automatisch een mock versie aanmaken voor development.

### Ontwikkeling vs. Productie

- **Development**: De applicatie gebruikt automatisch mock data als er geen geldige Supabase credentials zijn
- **Productie**: Configureer altijd echte Supabase credentials voor productie

## 🐛 Problemen oplossen

### Veelvoorkomende problemen

1. **Console Errors over Supabase verbinding**
   - Dit is normaal in development mode en kan worden genegeerd
   - De applicatie valt automatisch terug op mock data
   - Dit gedrag is opzettelijk om te werken zonder database

2. **PowerShell '&&' error**
   - Gebruik de meegeleverde `start-app.ps1` om dit probleem te omzeilen
   - Of gebruik `;` in plaats van `&&` in PowerShell: `cd retail; npm run dev`

3. **Poorten in gebruik**
   - De app probeert standaard poort 3000 te gebruiken
   - Als deze bezet is, probeert het automatisch 3001, 3002, etc.

## 📊 Logging

De applicatie ondersteunt verschillende log niveaus die kunnen worden aangepast in `src/lib/supabase.ts`:

```typescript
const LOGGING = {
  VERBOSE: false, // Stel in op true voor meer gedetailleerde logs
  CONNECTION: true, // Logs gerelateerd aan verbindingstatus
  QUERIES: false // Logs voor individuele queries
};
```

## 🔒 Supabase Configuratie

Voor een volledig functionerende applicatie met een echte database:

1. Maak een account op [Supabase](https://supabase.com/)
2. Maak een nieuw project aan
3. Ga naar Project Settings > API
4. Kopieer de "URL" en "anon public" key
5. Plaats deze in je `.env.local` bestand

## 🧪 Testen

Om te testen of je Supabase configuratie correct werkt:

1. Start de applicatie
2. Ga naar de instellingen pagina
3. Als je logo en huisstijl kunt zien en bewerken, werkt alles

Als je "Setting logo_url: Supabase verbinding niet gevalideerd" ziet in de console, maar de app functioneert verder correct, dan wordt mock data gebruikt en is dat normaal tijdens development.

## 🌐 Meer Informatie

- [Next.js Documentatie](https://nextjs.org/docs)
- [Supabase Documentatie](https://supabase.com/docs)
- [PowerShell Documentatie](https://docs.microsoft.com/en-us/powershell/) 