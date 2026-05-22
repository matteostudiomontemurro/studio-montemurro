import { useMemo } from 'react'
import { TrendingUp, FileText, Euro, PiggyBank } from 'lucide-react'
import { Cliente, Fattura } from '../lib/supabase'
import { formatCurrency } from '../lib/fattura'

export default function RiepilogoTab({ cliente, fatture }: { cliente: Cliente; fatture: Fattura[] }) {
  const stats = useMemo(() => {
    // Escludi fatture N1 (rimborsi)
    const attive = fatture.filter(f => !f.esclusa_da_calcolo)
    // Il fatturato fiscale è la somma dei compensi (escluse casse di ordini professionali)
    const fatturato = attive.reduce((s, f) => s + (f.compenso ?? f.imponibile), 0)
    // Totale casse escluse (solo per mostrare)
    const totaleCasseEscluse = attive.reduce((s, f) => s + (f.cassa_esclusa_da_calcolo ? f.contributo_cassa : 0), 0)
    const redditoImponibile = fatturato * (cliente.coefficiente_redditivita / 100)
    const imposta = redditoImponibile * (cliente.aliquota_imposta / 100)
    const totaleImposte = imposta + cliente.contributi_inps_fissi
    const incassate = attive.filter(f => f.stato === 'incassata').length
    const hasCassaEsclusa = attive.some(f => f.cassa_esclusa_da_calcolo)
    return { fatturato, totaleCasseEscluse, redditoImponibile, imposta, totaleImposte, incassate, totale: attive.length, hasCassaEsclusa }
  }, [cliente, fatture])

  const kpis = [
    { label: 'Compensi professionali', value: formatCurrency(stats.fatturato), icon: Euro, color: 'var(--accent)', note: 'Base di calcolo' },
    { label: 'Reddito imponibile', value: formatCurrency(stats.redditoImponibile), icon: TrendingUp, color: 'var(--primary)', note: `Coeff. ${cliente.coefficiente_redditivita}%` },
    { label: 'Imposta sostitutiva', value: formatCurrency(stats.imposta), icon: PiggyBank, color: 'var(--warning)', note: `Aliquota ${cliente.aliquota_imposta}%` },
    { label: 'Da accantonare', value: formatCurrency(stats.totaleImposte), icon: FileText, color: 'var(--primary)', note: 'Imposta + INPS' },
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

      {/* Casse previdenziali escluse */}
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
