import { useMemo } from 'react'
import { Cliente, Fattura } from '../lib/supabase'
import { formatCurrency } from '../lib/fattura'

export default function ImposteTab({ cliente, fatture }: { cliente: Cliente; fatture: Fattura[] }) {
  const calc = useMemo(() => {
    const attive = fatture.filter(f => !f.esclusa_da_calcolo)
    const fatturato = attive.reduce((s, f) => s + f.imponibile, 0)
    const redditoImponibile = fatturato * (cliente.coefficiente_redditivita / 100)
    const imposta = redditoImponibile * (cliente.aliquota_imposta / 100)
    const totale = imposta + cliente.contributi_inps_fissi
    const accontoI = imposta * 0.4
    const accontoII = imposta * 0.6
    const rimborsiN1 = fatture.filter(f => f.esclusa_da_calcolo).reduce((s, f) => s + f.imponibile, 0)
    return { fatturato, redditoImponibile, imposta, totale, accontoI, accontoII, rimborsiN1 }
  }, [cliente, fatture])

  const steps = [
    { label: 'Fatturato lordo emesso', value: calc.fatturato + calc.rimborsiN1, note: 'Totale fatture emesse', color: 'var(--text2)' },
    { label: 'Rimborsi spese (N1)', value: -calc.rimborsiN1, note: 'Esclusi ex art. 15', color: 'var(--danger)', isNeg: true },
    { label: 'Fatturato netto', value: calc.fatturato, note: 'Base di calcolo', color: 'var(--accent2)', bold: true },
    { label: `× Coefficiente (${cliente.coefficiente_redditivita}%)`, value: calc.redditoImponibile, note: 'Reddito imponibile', color: 'var(--accent)', bold: true },
    { label: `× Aliquota (${cliente.aliquota_imposta}%)`, value: calc.imposta, note: 'Imposta sostitutiva', color: 'var(--warning)', bold: true },
    { label: '+ Contributi INPS fissi', value: cliente.contributi_inps_fissi, note: 'Importo annuo stimato', color: 'var(--text2)' },
  ]

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)' }}>Calcolo imposte {new Date().getFullYear()}</h2>

      {/* Calcolo step by step */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {steps.map(({ label, value, note, color, bold }, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 16px',
            borderBottom: i < steps.length - 1 ? '1px solid var(--border)' : 'none',
            background: bold ? 'rgba(83,74,183,0.06)' : 'transparent'
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: bold ? 600 : 400, color: bold ? 'var(--text)' : 'var(--text2)' }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{note}</div>
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: bold ? 700 : 500, fontSize: bold ? 16 : 14, color }}>
              {value < 0 ? `− ${formatCurrency(Math.abs(value))}` : formatCurrency(value)}
            </div>
          </div>
        ))}
      </div>

      {/* Totale */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
        borderRadius: 'var(--radius)',
        padding: '20px 18px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>DA ACCANTONARE</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Imposta + Contributi INPS</div>
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700, color: 'white' }}>
          {formatCurrency(calc.totale)}
        </div>
      </div>

      {/* Acconti */}
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { label: '1° Acconto (40%)', value: calc.accontoI, scad: 'Giugno' },
          { label: '2° Acconto (60%)', value: calc.accontoII, scad: 'Novembre' },
        ].map(({ label, value, scad }) => (
          <div key={label} className="card" style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(value)}</div>
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
