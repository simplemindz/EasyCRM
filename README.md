# EasyCRM

Prosty start aplikacji CRM do zarządzania partnerami.

## Uruchomienie lokalnie

```bash
npm install
npm run dev
```

## Supabase

1. W Supabase SQL Editor uruchom skrypt z `supabase/schema.sql`.
2. W Vercel dodaj zmienne:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Lokalnie mozesz utworzyc `.env.local` z tymi samymi zmiennymi.

Bez tych zmiennych aplikacja dziala na danych testowych i zapisuje zmiany w `localStorage` przeglądarki.
