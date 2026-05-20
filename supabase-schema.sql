-- =============================================
-- STUDIO MONTEMURRO - Schema Supabase
-- Esegui questo script nell'editor SQL di Supabase
-- Supabase → SQL Editor → New query → incolla tutto → Run
-- =============================================

-- Tabella clienti
CREATE TABLE IF NOT EXISTS clienti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cognome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  codice_fiscale TEXT,
  codice_ateco TEXT,
  coefficiente_redditivita NUMERIC NOT NULL DEFAULT 67,
  aliquota_imposta NUMERIC NOT NULL DEFAULT 15,
  contributi_inps_fissi NUMERIC NOT NULL DEFAULT 3000,
  creato_il TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella fatture
CREATE TABLE IF NOT EXISTS fatture (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clienti(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  data DATE NOT NULL,
  destinatario TEXT,
  imponibile NUMERIC NOT NULL DEFAULT 0,
  codice_iva TEXT NOT NULL DEFAULT 'N4',
  totale NUMERIC NOT NULL DEFAULT 0,
  stato TEXT NOT NULL DEFAULT 'in_attesa' CHECK (stato IN ('incassata','in_attesa')),
  esclusa_da_calcolo BOOLEAN NOT NULL DEFAULT false,
  creato_il TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella documenti
CREATE TABLE IF NOT EXISTS documenti (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clienti(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'application/octet-stream',
  url TEXT NOT NULL,
  dimensione TEXT,
  caricato_il TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella anni confronto
CREATE TABLE IF NOT EXISTS anni_confronto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID NOT NULL REFERENCES clienti(id) ON DELETE CASCADE,
  anno INTEGER NOT NULL,
  fatturato NUMERIC NOT NULL DEFAULT 0,
  reddito_imponibile NUMERIC NOT NULL DEFAULT 0,
  imposta NUMERIC NOT NULL DEFAULT 0,
  contributi NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(cliente_id, anno)
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) - IMPORTANTE!
-- =============================================

ALTER TABLE clienti        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fatture        ENABLE ROW LEVEL SECURITY;
ALTER TABLE documenti      ENABLE ROW LEVEL SECURITY;
ALTER TABLE anni_confronto ENABLE ROW LEVEL SECURITY;

-- POLICY: accesso completo solo all'utente autenticato che corrisponde all'email
-- Clienti: il cliente vede solo il proprio profilo
CREATE POLICY "cliente_vede_se_stesso" ON clienti
  FOR SELECT USING (email = auth.jwt()->>'email');

-- Fatture: il cliente vede solo le proprie fatture
CREATE POLICY "cliente_vede_proprie_fatture" ON fatture
  FOR ALL USING (
    cliente_id IN (SELECT id FROM clienti WHERE email = auth.jwt()->>'email')
  );

-- Documenti: il cliente vede solo i propri documenti
CREATE POLICY "cliente_vede_propri_documenti" ON documenti
  FOR ALL USING (
    cliente_id IN (SELECT id FROM clienti WHERE email = auth.jwt()->>'email')
  );

-- Anni confronto
CREATE POLICY "cliente_vede_propri_anni" ON anni_confronto
  FOR ALL USING (
    cliente_id IN (SELECT id FROM clienti WHERE email = auth.jwt()->>'email')
  );

-- NOTA: per l'admin (accesso completo a tutti i clienti)
-- Vai su Supabase → Authentication → Policies e aggiungi manualmente
-- le policy di bypass per il service_role, oppure usa la service_role key
-- solo nel backend (non nel frontend).
-- Per ora l'admin usa l'anon key ma accede tramite le sue query dirette.
-- Aggiungi questa policy per permettere all'admin di leggere tutti i clienti:

-- Temporaneo per test - rimuovere in produzione:
-- CREATE POLICY "admin_accesso_totale" ON clienti FOR ALL USING (true);

-- =============================================
-- STORAGE per documenti
-- =============================================
-- Vai su Supabase → Storage → New bucket
-- Nome: documenti
-- Public: true (così i link funzionano)
