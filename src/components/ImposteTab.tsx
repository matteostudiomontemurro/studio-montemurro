import { useMemo } from 'react'
import { Cliente, Fattura } from '../lib/supabase'
import { formatCurrency } from '../lib/fattura'

export default function ImposteTab({ cliente, fatture }: { cliente: Cliente; fatture: Fattura[] }) {
  const calc = useMemo(() => {
    const cat = cliente.categoria_previdenziale ?? 'ordine'
    const isArtigiano = cat === 'inps_ac'
    const isGS = cat === 'inps_gs'

    // Fatturato lordo = somma totali fattura
    const fatturatoLordo = fatture.reduce((s, f) => s + f.totale, 0)

    // Rimborsi N1 = fatture senza compenso e senza imponibile
    const rimborsiN1 = fatture
      .filter(f => f.compenso === 0 && f.imponibile === 0 && f.totale > 0)
      .reduce((s, f) => s + f.totale, 0)

    // Casse ordini professionali escluse (solo cat. A)
    const casseEscluse = fatture
      .filter(f => f.cassa_esclusa_da_calcolo)
      .reduce((s, f) => s + f.contributo_cassa, 0)

    // Base di calcolo (compenso tassabile):
    // Cat. A (ordine): compenso netto (cassa ordine già esclusa dal parser)
    // Cat. B (inps_gs): compenso + cassa TC22 (già inclusa nel compenso dal parser)
    // Cat. C (inps_ac): compenso (nessuna cassa da gestire)
    const baseTassabile = fatture.reduce((s, f) =>
      s + f.compenso + (f.cassa_esclusa_da_calcolo ? 0 : f.contributo_cassa), 0)

    const redditoImponibile = baseTassabile * (cliente.coefficiente_redditivita / 100)
    const imposta = redditoImponibile * (cliente.aliquota_imposta / 100)

    // Contributi INPS — dipende dalla categoria
    let contributiINPS = 0
    let contributiVariabili = 0

    if (isGS) {
      // Gestione separata: % × reddito imponibile
      contributiINPS = redditoImponibile * ((cliente.aliquota_inps_gs ?? 0) / 100)
    } else if (isArtigiano) {
      // Artigiani/commercianti: fissi + eventuale eccedenza
      const fissi = cliente.contributi_inps_fissi ?? 0
      const minimale = cliente.reddito_minimale_inps ?? 0
      const percEcc = cliente.aliquota_inps_eccedenza ?? 0
      contributiVariabili = redditoImponibile > minimale
        ? (redditoImponibile - minimale) * (percEcc / 100)
        : 0
      contributiINPS = fissi + contributiVariabili
    }
    // Cat. ordine: nessun contributo INPS nell'app

    const totale = imposta + contributiINPS
    const accontoI = imposta * 0.4
    const accontoII = imposta * 0.6
    const hasCasseEscluse = casseEscluse > 0
    const hasN1 = rimborsiN1 > 0

    return {
      cat, isArtigiano, isGS,
      baseTassabile, casseEscluse, rimborsiN1, fatturatoLordo,
      redditoImponibile, imposta, contributiINPS, contributiVariabili,
      totale, accontoI, accontoII, hasCasseEscluse, hasN1
    }
  }, [cliente, fatture])

  const labelBase = calc.isArtigiano ? 'Ricavi dell\'attività netti' : 'Compensi professionali netti'

  const steps: { label: string; value: number; note: string; color: string; bold: boolean }[] = []

  steps.push({
    label: 'Totale fatturato emesso',
    value: calc.fatturatoLordo,
    note: 'Lordo comprensivo di tutto',
    color: 'var(--text2)', bold: false
  })

  if (calc.hasN1) {
    steps.push({
      label: '− Rimborsi spese (N1)',
      value: -calc.rimborsiN1,
      note: 'Esclusi ex art. 15',
      color: 'var(--danger)', bold: false
    })
  }

  if (calc.hasCasseEscluse) {
    steps.push({
      label: '− Contributi cassa previdenziale',
      value: -calc.casseEscluse,
      note: 'Contributi integrativi ordini',
      color: 'var(--warning)', bold: false
    })
  }

  steps.push({
    label: labelBase,
    value: calc.baseTassabile,
    note: 'Base di calcolo imposte',
    color: 'var(--accent)', bold: true
  })
  steps.push({
    label: `× Coefficiente (${cliente.coefficiente_redditivita}%)`,
    value: calc.redditoImponibile,
    note: 'Reddito imponibile',
    color: 'var(--primary)', bold: true
  })
  steps.push({
    label: `× Aliquota (${cliente.aliquota_imposta}%)`,
    value: calc.imposta,
    note: 'Imposta sostitutiva',
    color: 'var(--warning)', bold: true
  })

  if (calc.isGS) {
    steps.push({
      label: `+ Contributi INPS (${cliente.aliquota_inps_gs ?? 0}% reddito imponibile)`,
      value: calc.contributiINPS,
      note: 'Gestione separata',
      color: 'var(--text2)', bold: false
    })
  } else if (calc.isArtigiano) {
    steps.push({
      label: '+ Contributi INPS fissi',
      value: cliente.contributi_inps_fissi ?? 0,
      note: 'Importo annuo fisso',
      color: 'var(--text2)', bold: false
    })
    if (calc.contributiVariabili > 0) {
      steps.push({
        label: `+ Contributi eccedenza minimale (${cliente.aliquota_inps_eccedenza ?? 0}%)`,
        value: calc.contributiVariabili,
        note: `Reddito imponibile > minimale ${formatCurrency(cliente.reddito_minimale_inps ?? 0)}`,
        color: 'var(--text2)', bold: false
      })
    }
  }

  const subtitleDA = calc.isGS || calc.isArtigiano ? 'Imposta + Contributi INPS' : 'Imposta sostitutiva'

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)' }}>Calcolo imposte {new Date().getFullYear()}</h2>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {steps.map(({ label, value, note, color, bold }, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px',
            borderBottom: i < steps.length - 1 ? '1px solid var(--border)' : 'none',
            background: bold ? 'rgba(7,36,62,0.04)' : 'transparent'
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: bold ? 600 : 400, color: bold ? 'var(--text)' : 'var(--text2)' }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{note}</div>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: bold ? 700 : 500, fontSize: bold ? 16 : 14, color, flexShrink: 0 }}>
              {value < 0 ? `− ${formatCurrency(Math.abs(value))}` : formatCurrency(value)}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        background: 'var(--primary)', borderRadius: 'var(--radius)',
        padding: '20px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>DA ACCANTONARE</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{subtitleDA}</div>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700, color: 'white' }}>
          {formatCurrency(calc.totale)}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { label: '1° Acconto (40%)', value: calc.accontoI, scad: 'Giugno' },
          { label: '2° Acconto (60%)', value: calc.accontoII, scad: 'Novembre' },
        ].map(({ label, value, scad }) => (
          <div key={label} className="card" style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(value)}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Scade a {scad}</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
        Calcolo indicativo · Parametri impostati dal Dott. Montemurro
      </p>
    </div>
  )
}
