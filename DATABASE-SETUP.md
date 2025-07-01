# 🗄️ DATABASE SETUP - Retail Platform

## 📋 Overzicht

Dit document bevat alle instructies voor het opzetten van de Supabase database voor het Retail Platform project.

## 🚀 Quick Start

### 1. Supabase Project Aanmaken
1. Ga naar [app.supabase.com](https://app.supabase.com)
2. Maak een nieuw project aan
3. Bewaar je project URL en anon key

### 2. Environment Variables Instellen
Maak een `.env.local` bestand in de project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Database Tabellen Aanmaken

#### Optie A: Via Supabase Dashboard
1. Open je Supabase project
2. Ga naar SQL Editor
3. Kopieer de inhoud van `supabase-tables.sql`
4. Plak en voer uit

#### Optie B: Via Supabase CLI
```bash
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

## 📊 Database Schema

### Tabellen Overzicht

| Tabel | Beschrijving | Relaties |
|-------|--------------|----------|
| `products` | Productcatalogus | - |
| `profiles` | Gebruikersprofielen | auth.users |
| `retailers` | Retailer accounts | profiles |
| `orders` | Bestellingen | retailers, profiles |
| `order_items` | Bestelregels | orders, products |
| `settings` | App configuratie | - |
| `wasstrips_applications` | Wasstrips aanvragen | retailers |

### Tabel Details

#### 🛍️ Products
```sql
- id (UUID, Primary Key)
- name (VARCHAR 255)
- description (TEXT)
- price (DECIMAL)
- image_url (TEXT)
- category (VARCHAR 100)
- stock (INTEGER)
- active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 👤 Profiles
```sql
- id (UUID, Primary Key, References auth.users)
- business_name (VARCHAR 255)
- contact_name (VARCHAR 255)
- email (VARCHAR 255, Unique)
- phone (VARCHAR 50)
- address (VARCHAR 255)
- postal_code (VARCHAR 20)
- city (VARCHAR 100)
- chamber_of_commerce (VARCHAR 50)
- vat_number (VARCHAR 50)
- website (VARCHAR 255)
- logo_url (TEXT)
- notes (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 🏪 Retailers
```sql
- id (UUID, Primary Key)
- company_name (VARCHAR 255)
- contact_email (VARCHAR 255, Unique)
- contact_phone (VARCHAR 50)
- address (VARCHAR 255)
- postal_code (VARCHAR 20)
- city (VARCHAR 100)
- status (VARCHAR 50) - pending/approved/deactivated
- activation_token (VARCHAR 255, Unique)
- activated_at (TIMESTAMP)
- profile_id (UUID, References profiles)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## 🔒 Row Level Security (RLS)

De volgende RLS policies zijn geconfigureerd:

### Products
- ✅ Iedereen kan producten bekijken
- 🔐 Alleen ingelogde gebruikers kunnen producten bewerken

### Profiles
- 🔐 Gebruikers kunnen alleen hun eigen profiel bekijken/bewerken

### Orders
- 🔐 Gebruikers kunnen alleen hun eigen bestellingen bekijken

### Settings
- ✅ Publieke settings zijn voor iedereen zichtbaar
- 🔒 Gevoelige settings (met 'secret', 'private', 'key') zijn verborgen

## 🛠️ Troubleshooting

### Probleem: "permission denied for schema public"
**Oplossing:** Voer dit uit in de SQL editor:
```sql
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;
```

### Probleem: "relation does not exist"
**Oplossing:** Zorg dat je eerst het `supabase-tables.sql` script volledig hebt uitgevoerd.

### Probleem: Mock data wordt nog steeds gebruikt
**Oplossing:** 
1. Check of `.env.local` correct is ingesteld
2. Herstart de development server: `npm run dev`
3. Clear localStorage: `localStorage.clear()` in browser console

## 📝 Volgende Stappen

Na succesvolle database setup:

1. **Test de verbinding:**
   ```bash
   node test-supabase-connection.js
   ```

2. **Migreer bestaande data:**
   - Exporteer localStorage data
   - Importeer via Supabase dashboard

3. **Update de code:**
   - Vervang mock data calls met Supabase queries
   - Implementeer auth flows
   - Test alle CRUD operaties

## 🔗 Handige Links

- [Supabase Docs](https://supabase.com/docs)
- [SQL Editor](https://app.supabase.com/project/_/sql)
- [Table Editor](https://app.supabase.com/project/_/editor)
- [Auth Settings](https://app.supabase.com/project/_/auth/users)

---

*Voor vragen of problemen, check eerst de [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) voor de laatste status.* 