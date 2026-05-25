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
// perché i tag vengono registrati con namespace e la ricerca per nome locale non li trova.
// Questa funzione prova prima senza namespace, poi con wildcard namespace "*".
function getEls(root: Document | Element, tag: string): Element[] {
  const direct = root.getElementsByTagName(tag)
  if (direct.length > 0) return Array.from(direct)
  // Wildcard namespace: funziona con xmlns default
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
    let imponibile_cassa = 0   // ImponibileCassa = compenso professionale netto dichiarato

    if (cassaEl) {
      tipo_cassa = getText(cassaEl, 'TipoCassa')
      contributo_cassa = parseFloat(getText(cassaEl, 'ImportoContributoCassa') || '0')
      imponibile_cassa = parseFloat(getText(cassaEl, 'ImponibileCassa') || '0')
      // TC22 = INPS gestione separata → concorre al fatturato
      // Tutti gli altri (TC01 INARCASSA, TC06 CNPADC avvocati, ecc.) → esclusi
      cassa_esclusa_da_calcolo = tipo_cassa !== '' && tipo_cassa !== 'TC22'
    }

    // DatiRiepilogo: separiamo compenso (N2.2 e simili) da rimborsi ex art.15 (N1)
    // DOPPIO CONTROLLO:
    // 1. DatiRiepilogo con Natura=N1 → rimborsi spese, esclusi dal fatturato
    // 2. DatiRiepilogo con Natura≠N1 → fatturato lordo (compenso + eventuale cassa)
    let codice_iva = ''
    let totale_riepilogo = 0
    const riepiloghi = getEls(doc, 'DatiRiepilogo')
    let esclusa_da_calcolo = false

    for (let i = 0; i < riepiloghi.length; i++) {
      const r = riepiloghi[i]
      const natura = getText(r, 'Natura')
      const imp = parseFloat(getText(r, 'ImponibileImporto') || '0')
      const imposta = parseFloat(getText(r, 'Imposta') || '0')

      // Codice IVA principale = quello che NON è N1
      if (!codice_iva && natura !== 'N1') codice_iva = natura || 'N4'

      // N1 = rimborsi spese ex art.15 → esclusi completamente dal fatturato
      if (natura === 'N1') {
        esclusa_da_calcolo = true
      } else {
        totale_riepilogo += imp + imposta
      }
    }

    // totale_riepilogo = imponibile lordo (compenso + contributo cassa se presente)
    let imponibile_totale = totale_riepilogo
    if (imponibile_totale === 0) {
      // Fallback da righe di dettaglio (ignora N1)
      const righe = getEls(doc, 'DettaglioLinee')
      for (let i = 0; i < righe.length; i++) {
        const natura = getText(righe[i], 'Natura')
        if (natura !== 'N1') {
          imponibile_totale += parseFloat(getText(righe[i], 'PrezzoTotale') || '0')
        } else {
          esclusa_da_calcolo = true
        }
      }
    }

    // Compenso professionale (priorità):
    // 1. ImponibileCassa dichiarato in fattura → valore esatto
    // 2. Se cassa esclusa ma no ImponibileCassa → sottrazione
    // 3. Nessuna cassa o TC22 → tutto l'imponibile
    let compenso: number
    if (imponibile_cassa > 0) {
      compenso = imponibile_cassa
    } else if (cassa_esclusa_da_calcolo) {
      compenso = Math.max(0, imponibile_totale - contributo_cassa)
    } else {
      compenso = imponibile_totale
    }

    // Verifica quadratura
    const quadratura = Math.abs((compenso + contributo_cassa) - imponibile_totale)
    if (quadratura > 0.01) {
      console.warn(`Quadratura: compenso ${compenso} + cassa ${contributo_cassa} ≠ imponibile ${imponibile_totale}`)
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

// Dizionario codici cassa previdenziale
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
