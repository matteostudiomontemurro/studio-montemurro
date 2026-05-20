# Studio Montemurro – Guida all'installazione

## Cosa hai in questa cartella

L'app completa "Studio Montemurro" pronta per essere pubblicata su studiomontemurro.eu

---

## PASSO 1 – Prepara Supabase

1. Vai su **supabase.com** e accedi al tuo progetto
2. Clicca su **SQL Editor** nel menu a sinistra
3. Clicca **New query**
4. Apri il file `supabase-schema.sql` che trovi in questa cartella
5. Copia tutto il contenuto e incollalo nell'editor SQL
6. Clicca **Run** (pulsante verde)
7. Dovresti vedere "Success" – le tabelle sono create

### Crea il bucket per i documenti
1. Vai su **Storage** nel menu a sinistra
2. Clicca **New bucket**
3. Nome: `documenti`
4. Spunta **Public bucket**
5. Clicca **Create bucket**

### Policy admin (importante!)
Per far sì che l'admin veda tutti i clienti, vai su:
**SQL Editor → New query** e incolla:

```sql
CREATE POLICY "admin_bypass" ON clienti FOR ALL USING (true);
CREATE POLICY "admin_bypass_fatture" ON fatture FOR ALL USING (true);
CREATE POLICY "admin_bypass_documenti" ON documenti FOR ALL USING (true);
CREATE POLICY "admin_bypass_anni" ON anni_confronto FOR ALL USING (true);
```

> ⚠️ Questo apre l'accesso a chiunque sia autenticato. Per produzione,
> implementa un sistema di ruoli più sicuro.

---

## PASSO 2 – Configura le variabili d'ambiente

1. In questa cartella crea un file chiamato `.env.local`
2. Aprilo con un editor di testo (Blocco note va bene)
3. Incolla questo contenuto compilando i tuoi dati:

```
VITE_SUPABASE_URL=https://feqlhysksrhrbzsgzdky.supabase.co
VITE_SUPABASE_ANON_KEY=la-tua-anon-key-da-supabase
VITE_ADMIN_EMAILS=tua@email.it
```

- La **SUPABASE_URL** e **ANON_KEY** le trovi su Supabase → Settings → API
- **ADMIN_EMAILS** è la tua email con cui fai login come admin

---

## PASSO 3 – Pubblica su Vercel (gratuito)

### 3a. Carica il codice su GitHub
1. Vai su **github.com** (hai già l'account)
2. Crea un nuovo repository: **studio-montemurro-v2**
3. Carica tutti i file di questa cartella nel repository

### 3b. Pubblica su Vercel
1. Vai su **vercel.com** e accedi con GitHub
2. Clicca **Add New Project**
3. Seleziona il repository `studio-montemurro-v2`
4. Prima di fare Deploy, clicca **Environment Variables** e aggiungi:
   - `VITE_SUPABASE_URL` → il tuo URL Supabase
   - `VITE_SUPABASE_ANON_KEY` → la tua anon key
   - `VITE_ADMIN_EMAILS` → la tua email admin
5. Clicca **Deploy**

### 3c. Collega il tuo dominio
1. Su Vercel → il tuo progetto → **Settings → Domains**
2. Aggiungi `studiomontemurro.eu` (o `app.studiomontemurro.eu`)
3. Vercel ti darà due record DNS da copiare
4. Vai su **Hostinger** → Gestisci dominio → DNS
5. Aggiungi i record che Vercel ti ha indicato
6. Aspetta 10-30 minuti e l'app sarà sul tuo dominio!

---

## PASSO 4 – Crea il primo utente admin

1. Vai su Supabase → **Authentication → Users**
2. Clicca **Add user → Create new user**
3. Email: la tua email (quella che hai messo in VITE_ADMIN_EMAILS)
4. Password: scegli una password sicura
5. Clicca **Create user**

Ora puoi accedere all'app con quella email e vedrai il pannello admin!

---

## Come creare un cliente

1. Accedi all'app come admin
2. Clicca **Nuovo cliente**
3. Compila i dati (nome, cognome, email, parametri fiscali)
4. Crea il cliente
5. Vai su Supabase → Authentication → Users → Add user
6. Crea un utente con la stessa email del cliente
7. Comunica al cliente: link dell'app + email + password

---

## Aggiornare l'app in futuro

Ogni volta che vuoi modificare qualcosa:
1. Dimmi cosa vuoi cambiare su Claude
2. Riceverai i file aggiornati
3. Sostituisci i file su GitHub
4. Vercel pubblica automaticamente in 1-2 minuti

I clienti non devono fare nulla – vedono la versione aggiornata automaticamente.
