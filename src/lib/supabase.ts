import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Cliente = {
  id: string
  nome: string
  cognome: string
  email: string
  codice_fiscale?: string
  codice_ateco?: string
  coefficiente_redditivita: number
  aliquota_imposta: number
  contributi_inps_fissi: number
  creato_il: string
}

export type Fattura = {
  id: string
  cliente_id: string
  numero: string
  data: string
  destinatario: string
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
