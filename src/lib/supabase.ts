import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Categoria previdenziale del cliente
// 'ordine'       → iscritto a ordine professionale (INARCASSA, CNPADC, ecc.)
// 'inps_gs'      → INPS gestione separata
// 'inps_ac'      → INPS artigiani/commercianti
export type CategoriaPrevidenziale = 'ordine' | 'inps_gs' | 'inps_ac'

export type Cliente = {
  id: string
  nome: string
  cognome: string
  email: string
  codice_fiscale: string
  codice_ateco?: string
  coefficiente_redditivita: number
  aliquota_imposta: number
  // Categoria previdenziale (determina logica calcolo imposte)
  categoria_previdenziale: CategoriaPrevidenziale
  // Campi usati solo per inps_gs: aliquota % da applicare al reddito imponibile
  aliquota_inps_gs?: number
  // Campi usati solo per inps_ac
  contributi_inps_fissi?: number       // contributi fissi annui
  aliquota_inps_eccedenza?: number     // % sull'eccedenza del minimale
  reddito_minimale_inps?: number       // minimale INPS annuo (impostato da admin)
  creato_il: string
}

export type Fattura = {
  id: string
  cliente_id: string
  numero: string
  data: string
  destinatario: string
  compenso: number
  contributo_cassa: number
  tipo_cassa: string
  cassa_esclusa_da_calcolo: boolean
  imponibile: number
  codice_iva: string
  totale: number
  stato: 'incassata' | 'in_attesa'
  esclusa_da_calcolo: boolean
  creato_il: string
}

export type Documento = {
  id: string
  cliente_id: string
  nome: string
  tipo: string
  url: string
  dimensione?: string
  caricato_il: string
}

export type AnnoConfronto = {
  id: string
  cliente_id: string
  anno: number
  fatturato: number
  reddito_imponibile: number
  imposta: number
  contributi: number
}
