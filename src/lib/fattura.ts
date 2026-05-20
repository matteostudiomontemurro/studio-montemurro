export type FatturaParseResult = {
  numero: string
  data: string
  destinatario: string
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

    // Righe fattura - analizza codici IVA
    const righe = doc.getElementsByTagName('DettaglioLinee')
    let imponibile = 0
    let totale = 0
    let codice_iva = ''
    let esclusa = false

    // Usa DatiRiepilogo per calcoli
    const riepiloghi = doc.getElementsByTagName('DatiRiepilogo')
    
    for (let i = 0; i < riepiloghi.length; i++) {
      const r = riepiloghi[i]
      const natura = getText(r, 'Natura')
      const imp = parseFloat(getText(r, 'ImponibileImporto') || '0')
      const imp2 = parseFloat(getText(r, 'Imposta') || '0')

      if (!codice_iva) codice_iva = natura || 'N4'

      // N1 = escluse ex art. 15 (rimborsi spese) → NON contare
      if (natura === 'N1') {
        esclusa = true
        // non sommare al totale fiscale
      } else {
        imponibile += imp
        totale += imp + imp2
      }
    }

    // Fallback se nessun riepilogo
    if (imponibile === 0 && righe.length > 0) {
      for (let i = 0; i < righe.length; i++) {
        const r = righe[i]
        const natura = getText(r, 'Natura')
        const prezzo = parseFloat(getText(r, 'PrezzoTotale') || '0')
        if (natura !== 'N1') {
          imponibile += prezzo
          totale += prezzo
        } else {
          esclusa = true
        }
      }
    }

    if (!codice_iva) codice_iva = 'N4'

    return {
      numero: numero || 'N/D',
      data: data || new Date().toISOString().split('T')[0],
      destinatario,
      imponibile: Math.round(imponibile * 100) / 100,
      codice_iva,
      totale: Math.round(totale * 100) / 100,
      esclusa_da_calcolo: esclusa,
    }
  } catch (e) {
    return {
      numero: 'Errore',
      data: '',
      destinatario: '',
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
