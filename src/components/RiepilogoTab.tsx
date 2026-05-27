import { useMemo } from 'react'
import { TrendingUp, FileText, Euro, PiggyBank } from 'lucide-react'
import { Cliente, Fattura } from '../lib/supabase'
import { formatCurrency } from '../lib/fattura'

export default function RiepilogoTab({ cliente, fatture }: { cliente: Cliente; fatture: Fattura[] }) {
  const stats = useMemo(() => {
    const cat = cliente.categoria_previdenziale ?? 'ordine'
    const isArtigiano = cat === 'inps_ac'
    const isGS = cat === 'inps_gs'

    // Base tassabile: compenso + cassa non esclusa (TC22)
    const fatturato = fatture.reduce((s, f) =>
      s + f.compenso + (f.cassa_esclusa_da_calcolo ? 0 : f.contributo_cassa), 0)

    const totaleCasseEscluse = fatture
      .filter(f => f.cassa_esclusa_da_calcolo)
      .reduce((s, f) => s + f.contributo_cassa, 0)

    const redditoImponibile = fatturato * (cliente.coefficiente_redditivita / 100)
    const imposta = redditoImponibile * (cliente.aliquota_imposta / 100)

    let contributiINPS = 0
    if (isGS) {
      contributiINPS = redditoImponibile * ((cliente.aliquota_inps_gs ?? 0) / 100)
    } else if (isArtigiano) {
      const fissi = cliente.contributi_inps_fissi ?? 0
      const minimale = cliente.reddito_minimale_inps ?? 0
      const percEcc = cliente.aliquota_inps_eccedenza ?? 0
      const variabili = redditoImponibile > minimale ? (redditoImponibile - minimale) * (percEcc / 100) : 0
      contributiINPS = fissi + variabili
    }

    const totaleImposte = imposta + contributiINPS
    const incassate = fatture.filter(f => f.stato === 'incassata').length
    const hasCassaEsclusa = fatture.some(f => f.cassa_esclusa_da_calcolo)

    return {
      cat, isArtigiano, isGS,
      fatturato, totaleCasseEscluse, redditoImponibile, imposta,
      contributiINPS, totaleImposte, incassate, totale: fatture.length, hasCassaEsclusa
    }
  }, [cliente, fatture])

  const labelBase = stats.isArtigiano ? 'Ricavi dell\'attività' : 'Compensi professionali'
  const noteDA = stats.isGS || stats.isArtigiano ? 'Imposta + INPS' : 'Imposta sostitutiva'

  const kpis = [
    { label: labelBase, value: formatCurrency(stats.fatturato), icon: Euro, color: 'var(--accent)', note: 'Base di calcolo' },
    { label: 'Reddito imponibile', value: formatCurrency(stats.redditoImponibile), icon: TrendingUp, color: 'var(--primary)', note: `Coeff. ${cliente.coefficiente_redditivita}%` },
    { label: 'Imposta sostitutiva', value: formatCurrency(stats.imposta), icon: PiggyBank, color: 'var(--warning)', note: `Aliquota ${cliente.aliquota_imposta}%` },
    { label: 'Da accantonare', value: formatCurrency(stats.totaleImposte), icon: FileText, color: 'var(--primary)', note: noteDA },
  ]

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ marginBottom: 4 }}>
        <h2 style={{ fontSize: 17, fontWeight: 600 }}>Ciao, {cliente.nome} 👋</h2>
        <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>
          Anno fiscale {new Date().getFullYear()} · Regime forfettario
        </p>
      </div>

      {kpis.map(({ label, value, icon: Icon, color, note }) => (
        <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon size={20} color={color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color, fontFamily: 'var(--mono)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{value}</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'right', flexShrink: 0 }}>{note}</div>
        </div>
      ))}

      {stats.hasCassaEsclusa && (
        <div className="card" style={{ background: '#fffbf0', borderColor: '#f0d080' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)', marginBottom: 4 }}>⚠ Contributi cassa previdenziale esclusi</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>
            {formatCurrency(stats.totaleCasseEscluse)} di contributi integrativi non concorrono al reddito imponibile
          </div>
        </div>
      )}

      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'var(--text2)', fontSize: 13 }}>Fatture emesse</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="badge badge-success">{stats.incassate} incassate</span>
          <span className="badge badge-warning">{stats.totale - stats.incassate} in attesa</span>
        </div>
      </div>

      {cliente.codice_ateco && (
        <div className="card" style={{ fontSize: 13, color: 'var(--text2)' }}>
          <span style={{ color: 'var(--text3)', fontSize: 11, fontFamily: 'var(--mono)' }}>ATECO</span>
          <span style={{ marginLeft: 8, color: 'var(--text)' }}>{cliente.codice_ateco}</span>
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginTop: 4 }}>
        Parametri fiscali impostati dal Dott. Montemurro
      </p>
    </div>
  )
}
