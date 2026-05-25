export type FatturaParseResult = {
  numero: string
  data: string
  destinatario: string
  cedente_cf: string          // Codice fiscale di chi ha emesso la fattura
  compenso: number
  contributo_cassa: number
  tipo_cassa: string
  cassa_esclusa_da_calcolo: boolean
  imponibile: number
  codice_iva: string
  totale: number
  esclusa_da_calcolo: boolean
  errore?: string
}

// getElementsByTagName fallisce quando l'XML ha un namespace default (xmlns="...")
// Questa funzione prova prima senza namespace, poi con wildcard namespace "*".
function getEls(root: Document | Element, tag: string): Element[] {
  const direct = root.getElementsByTagName(tag)
  if (direct.length > 0) return Array.from(direct)
  return Array.from(root.getElementsByTagNameNS('*', tag))
}

function getEl(root: Document | Element, tag: string): Element | null {
  return getEls(root, tag)[0] ?? null
}

function getText(el: Element | null, tag: string): string {
  if (!el) return ''
  const found = getEl(el, tag)
  return found?.textContent?.trim() ?? ''
}

export function parseFatturaPA(xmlString: string): FatturaParseResult {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')

    // Numero e data
    const datiGen = getEl(doc, 'DatiGeneraliDocumento')
    const numero = getText(datiGen, 'Numero')
    const data = getText(datiGen, 'Data')

    // Codice fiscale del cedente (chi ha emesso la fattura)
    const cedente = getEl(doc, 'CedentePrestatore')
    const cedente_cf = getText(cedente, 'CodiceFiscale').toUpperCase()

    // Destinatario
    const cessionario = getEl(doc, 'CessionarioCommittente')
    const denominazione = getText(cessionario, 'Denominazione')
    const nome = getText(cessionario, 'Nome')
    const cognome = getText(cessionario, 'Cognome')
    const destinatario = denominazione || `${nome} ${cognome}`.trim() || 'N/D'

    // Cassa previdenziale — tag DatiCassaPrevidenziale dentro DatiGeneraliDocumento
    const cassaEl = getEl(doc, 'DatiCassaPrevidenziale')
    let tipo_cassa = ''
    let contributo_cassa = 0
    let cassa_esclusa_da_calcolo = false
    let imponibile_cassa = 0

    if (cassaEl) {
      tipo_cassa = getText(cassaEl, 'TipoCassa')
      contributo_cassa = parseFloat(getText(cassaEl, 'ImportoContributoCassa') || '0')
      imponibile_cassa = parseFloat(getText(cassaEl, 'ImponibileCassa') || '0')
      // TC22 = INPS gestione separata → concorre al fatturato
      // Tutti gli altri (TC01 INARCASSA, TC06 avvocati, ecc.) → esclusi dal calcolo
      cassa_esclusa_da_calcolo = tipo_cassa !== '' && tipo_cassa !== 'TC22'
    }

    // DatiRiepilogo: somma solo le righe NON-N1 come imponibile professionale.
    // Le righe N1 (rimborsi ex art.15) vengono ignorate dal totale ma
    // NON rendono l'intera fattura esclusa dal calcolo imposte.
    let codice_iva = ''
    let totale_riepilogo = 0
    let ha_compenso = false   // true se esiste almeno una riga non-N1 con importo > 0
    const riepiloghi = getEls(doc, 'DatiRiepilogo')

    for (let i = 0; i < riepiloghi.length; i++) {
      const r = riepiloghi[i]
      const natura = getText(r, 'Natura')
      const imp = parseFloat(getText(r, 'ImponibileImporto') || '0')
      const imposta = parseFloat(getText(r, 'Imposta') || '0')

      if (natura === 'N1') {
        // Rimborsi spese: ignorati dal totale imponibile
        continue
      }

      // Riga con compenso reale
      if (!codice_iva) codice_iva = natura || 'N4'
      totale_riepilogo += imp + imposta
      if (imp > 0) ha_compenso = true
    }

    // Fallback da righe di dettaglio se nessun riepilogo utile trovato
    let imponibile_totale = totale_riepilogo
    if (imponibile_totale === 0) {
      const righe = getEls(doc, 'DettaglioLinee')
      for (let i = 0; i < righe.length; i++) {
        const natura = getText(righe[i], 'Natura')
        if (natura !== 'N1') {
          const pt = parseFloat(getText(righe[i], 'PrezzoTotale') || '0')
          imponibile_totale += pt
          if (pt > 0) ha_compenso = true
        }
      }
    }

    // esclusa_da_calcolo = true SOLO se la fattura non ha nessun compenso reale
    // (es. fattura interamente di rimborsi ex art.15)
    const esclusa_da_calcolo = !ha_compenso

    // Compenso professionale (priorità):
    // 1. ImponibileCassa dichiarato in fattura → valore esatto
    // 2. Se cassa esclusa → sottrazione
    // 3. Nessuna cassa o TC22 → tutto l'imponibile
    let compenso: number
    if (imponibile_cassa > 0) {
      compenso = imponibile_cassa
    } else if (cassa_esclusa_da_calcolo) {
      compenso = Math.max(0, imponibile_totale - contributo_cassa)
    } else {
      compenso = imponibile_totale
    }

    // Totale documento (include bollo, IVA ecc.)
    const totaleDocEl = getEl(doc, 'ImportoTotaleDocumento')
    const totale = totaleDocEl
      ? parseFloat(totaleDocEl.textContent?.trim() || '0')
      : imponibile_totale

    if (!codice_iva) codice_iva = 'N4'

    return {
      numero: numero || 'N/D',
      data: data || new Date().toISOString().split('T')[0],
      destinatario,
      cedente_cf,
      compenso: Math.round(compenso * 100) / 100,
      contributo_cassa: Math.round(contributo_cassa * 100) / 100,
      tipo_cassa,
      cassa_esclusa_da_calcolo,
      imponibile: Math.round(imponibile_totale * 100) / 100,
      codice_iva,
      totale: Math.round(totale * 100) / 100,
      esclusa_da_calcolo,
    }
  } catch (e) {
    return {
      numero: 'Errore',
      data: '',
      destinatario: '',
      cedente_cf: '',
      compenso: 0,
      contributo_cassa: 0,
      tipo_cassa: '',
      cassa_esclusa_da_calcolo: false,
      imponibile: 0,
      codice_iva: '',
      totale: 0,
      esclusa_da_calcolo: false,
      errore: 'File XML non valido o non riconosciuto come FatturaPA',
    }
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const CODICI_CASSA: Record<string, string> = {
  TC01: 'INARCASSA (Ingegneri/Architetti)',
  TC02: 'INPGI (Giornalisti)',
  TC03: 'ENPAM (Medici)',
  TC04: 'ENPAF (Farmacisti)',
  TC05: 'ENPAV (Veterinari)',
  TC06: 'CNPADC (Avvocati)',
  TC07: 'CNPR (Ragionieri)',
  TC08: 'CNPAF (Agronomi/Forestali)',
  TC09: 'CNPATP (Geometri)',
  TC10: 'CPA (Attuari)',
  TC11: 'EPPI (Periti industriali)',
  TC12: 'EPAP (Professionisti vari)',
  TC13: 'ENPAP (Psicologi)',
  TC14: 'ENPAPI (Infermieri)',
  TC15: 'ENPAB (Biologi)',
  TC16: 'CNGEI (Geologi)',
  TC17: 'CNBF (Consulenti lavoro)',
  TC18: 'ONAOSI',
  TC19: 'ENPACL (Agenti commercio)',
  TC20: 'EPASA (Agenti spettacolo)',
  TC21: 'INPS (Commercianti/Artigiani)',
  TC22: 'INPS Gestione Separata',
}
