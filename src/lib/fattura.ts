export type FatturaParseResult = {
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
  esclusa_da_calcolo: boolean
  errore?: string
}

function getText(el: Element | null, tag: string): string {
  if (!el) return ''
  const found = el.getElementsByTagName(tag)[0]
  return found?.textContent?.trim() ?? ''
}

export function parseFatturaPA(xmlString: string): FatturaParseResult {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')

    // Numero e data
    const datiGen = doc.getElementsByTagName('DatiGeneraliDocumento')[0]
    const numero = getText(datiGen, 'Numero')
    const data = getText(datiGen, 'Data')

    // Destinatario
    const cessionario = doc.getElementsByTagName('CessionarioCommittente')[0]
    const denominazione = getText(cessionario, 'Denominazione')
    const nome = getText(cessionario, 'Nome')
    const cognome = getText(cessionario, 'Cognome')
    const destinatario = denominazione || `${nome} ${cognome}`.trim() || 'N/D'

    // Cassa previdenziale
    const cassaEl = doc.getElementsByTagName('CassaPrevidenziale')[0]
    let tipo_cassa = ''
    let contributo_cassa = 0
    let cassa_esclusa_da_calcolo = false

    if (cassaEl) {
      tipo_cassa = getText(cassaEl, 'TipoCassa')
      contributo_cassa = parseFloat(getText(cassaEl, 'ImportoContributoCassa') || '0')
      // TC22 = INPS gestione separata → concorre al fatturato
      // Tutti gli altri (TC01 INARCASSA, TC06 CNPADC avvocati, ecc.) → esclusi
      cassa_esclusa_da_calcolo = tipo_cassa !== '' && tipo_cassa !== 'TC22'
    }

    // Codice IVA da DatiRiepilogo
    let codice_iva = ''
    let totale_riepilogo = 0
    const riepiloghi = doc.getElementsByTagName('DatiRiepilogo')
    let esclusa_da_calcolo = false

    for (let i = 0; i < riepiloghi.length; i++) {
      const r = riepiloghi[i]
      const natura = getText(r, 'Natura')
      const imp = parseFloat(getText(r, 'ImponibileImporto') || '0')
      const imposta = parseFloat(getText(r, 'Imposta') || '0')

      if (!codice_iva) codice_iva = natura || 'N4'

      // N1 = rimborsi spese ex art.15 → esclusi completamente
      if (natura === 'N1') {
        esclusa_da_calcolo = true
      } else {
        totale_riepilogo += imp + imposta
      }
    }

    // Imponibile totale dal riepilogo (compenso + eventuale cassa TC22)
    // Per ottenere solo il compenso sottraiamo la cassa se esclusa
    let imponibile_totale = totale_riepilogo
    if (imponibile_totale === 0) {
      // Fallback da righe
      const righe = doc.getElementsByTagName('DettaglioLinee')
      for (let i = 0; i < righe.length; i++) {
        const natura = getText(righe[i], 'Natura')
        if (natura !== 'N1') {
          imponibile_totale += parseFloat(getText(righe[i], 'PrezzoTotale') || '0')
        } else {
          esclusa_da_calcolo = true
        }
      }
    }

    // Il compenso professionale è l'imponibile meno la cassa (se cassa esclusa)
    // Se cassa TC22 o nessuna cassa, il compenso è tutto l'imponibile
    const compenso = cassa_esclusa_da_calcolo
      ? Math.max(0, imponibile_totale - contributo_cassa)
      : imponibile_totale

    // Verifica quadratura: compenso + cassa deve tornare all'imponibile totale
    const quadratura = Math.abs((compenso + contributo_cassa) - imponibile_totale)
    if (quadratura > 0.01) {
      console.warn(`Quadratura non tornante: compenso ${compenso} + cassa ${contributo_cassa} ≠ imponibile ${imponibile_totale}`)
    }

    // Totale documento (imponibile + IVA se presente)
    const totaleDocEl = doc.getElementsByTagName('ImportoTotaleDocumento')[0]
    const totale = totaleDocEl
      ? parseFloat(totaleDocEl.textContent?.trim() || '0')
      : imponibile_totale

    if (!codice_iva) codice_iva = 'N4'

    return {
      numero: numero || 'N/D',
      data: data || new Date().toISOString().split('T')[0],
      destinatario,
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
