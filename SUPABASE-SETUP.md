# Supabase Setup Instructies

## ✅ Wat is al gedaan:
1. **MCP Configuratie** - `.cursor/mcp.json` is correct geconfigureerd
2. **Database SQL Script** - `setup-supabase.sql` is aangemaakt

## 📋 Stappen die je moet uitvoeren:

### 1. Herstart Cursor
- Sluit Cursor volledig af
- Start Cursor opnieuw op
- Ga naar **Settings → MCP** en controleer of je een groene status ziet bij "supabase"

### 2. Maak .env.local bestand aan
Maak een nieuw bestand `.env.local` in je project root (waar package.json staat) met:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://mlhrporbuhbgxrbrlpzz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<VULL_HIER_JE_ANON_KEY_IN>
```

**Om je anon key te vinden:**
1. Ga naar: https://supabase.com/dashboard/project/mlhrporbuhbgxrbrlpzz/settings/api
2. Kopieer de **anon public** key (begint met "eyJ...")
3. Plak deze in het .env.local bestand

### 3. Voer het Database Script uit
1. Ga naar: https://supabase.com/dashboard/project/mlhrporbuhbgxrbrlpzz/sql/new
2. Kopieer de gehele inhoud van `setup-supabase.sql`
3. Plak het in de SQL editor
4. Klik op **Run** om alle tabellen aan te maken

### 4. Test de installatie
Start je development server:
```bash
npm run dev
```

Open in je browser:
```
http://localhost:3000/api/setup
```

Je zou moeten zien: `{"success":true,"message":"Database succesvol geïnitialiseerd"}`

## 🎯 Verificatie

### MCP Server Status:
- In Cursor: **Settings → MCP** → Groene status bij "supabase"

### Database Verbinding:
- Open http://localhost:3000 - de app zou moeten werken met echte data
- Check de console voor "Client geïnitialiseerd en verbinding gevalideerd"

## 🚀 Wat kun je nu doen met MCP:

In Cursor kun je nu vragen stellen zoals:
- "Laat me alle tabellen in mijn Supabase database zien"
- "Voeg een nieuwe product toe aan de products tabel"
- "Toon alle retailers met status 'pending'"
- "Maak een nieuwe tabel aan voor customer reviews"

De AI assistent heeft nu directe toegang tot je Supabase project!

## ⚠️ Belangrijk:
- De MCP server draait in **read-only** mode voor veiligheid
- Voor write operaties moet je expliciet toestemming geven
- Vergeet niet je .env.local toe te voegen aan .gitignore

## 🐛 Troubleshooting:

**MCP server toont geen groene status?**
- Herstart Cursor volledig
- Check of npx correct is geïnstalleerd: `npx --version`

**Database verbinding mislukt?**
- Controleer of je anon key correct is ingevuld
- Check of je project URL klopt
- Kijk in de browser console voor foutmeldingen

**"relation does not exist" errors?**
- Voer het SQL script uit in Supabase SQL editor
- Refresh de pagina en probeer opnieuw 