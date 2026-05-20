import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { supabase, Cliente, Fattura, AnnoConfronto } from '../lib/supabase'
import { formatCurrency } from '../lib/fattura'
import { Plus, X } from 'lucide-react'

export default function ConfrontoTab({
  cliente, fatture, anni, onRefresh
}: { cliente: Cliente; fatture: Fattura[]; anni: AnnoConfronto[]; onRefresh: () => void }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ anno: '', fatturato: '', imposta: '', contributi: '' })

  const annoCorrente = useMemo(() => {
    const attive = fatture.filter(f => !f.esclusa_da_calcolo)
    const fatturato = attive.reduce((s, f) => s + f.imponibile, 0)
    const reddito = fatturato * (cliente.coefficiente_redditivita / 100)
    const imposta = reddito * (cliente.aliquota_imposta / 100)
    return { anno: new Date().getFullYear(), fatturato, reddito, imposta, contributi: cliente.contributi_inps_fissi }
  }, [cliente, fatture])

  const chartData = useMemo(() => {
    const storici = anni.map(a => ({
      anno: a.anno.toString(),
      fatturato: a.fatturato,
      imposta: a.imposta,
      corrente: false
    }))
    storici.push({ anno: annoCorrente.anno.toString(), fatturato: annoCorrente.fatturato, imposta: annoCorrente.imposta, corrente: true })
    return storici.sort((a, b) => parseInt(a.anno) - parseInt(b.anno))
  }, [anni, annoCorrente])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const fatturato = parseFloat(form.fatturato)
    await supabase.from('anni_confronto').insert({
      cliente_id: cliente.id,
      anno: parseInt(form.anno),
      fatturato,
      reddito_imponibile: fatturato * (cliente.coefficiente_redditivita / 100),
      imposta: parseFloat(form.imposta),
      contributi: parseFloat(form.contributi),
    })
    setShowAdd(false)
    setForm({ anno: '', fatturato: '', imposta: '', contributi: '' })
    onRefresh()
  }

  async function deleteAnno(id: string) {
    await supabase.from('anni_confronto').delete().eq('id', id)
    onRefresh()
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.dataKey} style={{ color: p.color }}>{p.name}: {formatCurrency(p.value)}</div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text2)' }}>Confronto anni</h2>
        <button className="btn btn-ghost" onClick={() => setShowAdd(true)} style={{ padding: '7px 12px' }}>
          <Plus size={14} /> Anno
        </button>
      </div>

      {chartData.length > 0 && (
        <div className="card" style={{ padding: '16px 4px 8px' }}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barGap={4}>
              <XAxis dataKey="anno" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="fatturato" name="Fatturato" radius={[4, 4, 0, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.corrente ? 'var(--primary)' : 'var(--surface2)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text3)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--primary)', display: 'inline-block' }} /> Anno corrente
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text3)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--surface2)', display: 'inline-block' }} /> Anni precedenti
            </div>
          </div>
        </div>
      )}

      {/* Tabella anni */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', background: 'var(--bg3)', fontSize: 11, color: 'var(--text3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto' }}>
          <span>Anno</span><span style={{ textAlign: 'right' }}>Fatturato</span><span style={{ textAlign: 'right' }}>Imposta</span><span />
        </div>
        {/* Anno corrente */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', padding: '12px 16px', alignItems: 'center', background: 'rgba(83,74,183,0.08)', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{annoCorrente.anno} ●</span>
          <span style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13 }}>{formatCurrency(annoCorrente.fatturato)}</span>
          <span style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13 }}>{formatCurrency(annoCorrente.imposta)}</span>
          <span />
        </div>
        {anni.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
            Aggiungi dati degli anni precedenti
          </div>
        )}
        {anni.sort((a, b) => b.anno - a.anno).map(a => (
          <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', padding: '12px 16px', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text2)' }}>{a.anno}</span>
            <span style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13 }}>{formatCurrency(a.fatturato)}</span>
            <span style={{ textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 13 }}>{formatCurrency(a.imposta)}</span>
            <button onClick={() => deleteAnno(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 4 }}>
              <X size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* Modal aggiungi anno */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Aggiungi anno precedente</h2>
            <form onSubmit={handleAdd}>
              <div className="form-row"><label>Anno</label><input type="number" min="2000" max="2099" value={form.anno} onChange={e => setForm(p => ({ ...p, anno: e.target.value }))} required /></div>
              <div className="form-row"><label>Fatturato €</label><input type="number" step="0.01" value={form.fatturato} onChange={e => setForm(p => ({ ...p, fatturato: e.target.value }))} required /></div>
              <div className="form-grid">
                <div className="form-row"><label>Imposta €</label><input type="number" step="0.01" value={form.imposta} onChange={e => setForm(p => ({ ...p, imposta: e.target.value }))} required /></div>
                <div className="form-row"><label>Contributi €</label><input type="number" step="0.01" value={form.contributi} onChange={e => setForm(p => ({ ...p, contributi: e.target.value }))} required /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowAdd(false)}>Annulla</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
