import { useState, useEffect } from 'react'
import { supabase, Cliente, Fattura, Documento } from '../lib/supabase'
import { Users, Plus, ChevronRight, LogOut, Settings, ArrowLeft, Upload } from 'lucide-react'
import FattureTab from '../components/FattureTab'
import DocumentiTab from '../components/DocumentiTab'

export default function AdminPage({ onLogout }: { onLogout: () => void }) {
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [selected, setSelected] = useState<Cliente | null>(null)
  const [fatture, setFatture] = useState<Fattura[]>([])
  const [documenti, setDocumenti] = useState<Documento[]>([])
  const [activeTab, setActiveTab] = useState<'fatture' | 'documenti' | 'parametri'>('parametri')
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState<Partial<Cliente>>({
    nome: '', cognome: '', email: '', codice_fiscale: '',
    codice_ateco: '', coefficiente_redditivita: 67,
    aliquota_imposta: 15, contributi_inps_fissi: 3000
  })

  useEffect(() => { loadClienti() }, [])

  async function loadClienti() {
    setLoading(true)
    const { data } = await supabase.from('clienti').select('*').order('cognome')
    setClienti(data || [])
    setLoading(false)
  }

  async function selectCliente(c: Cliente) {
    setSelected(c)
    setForm(c)
    const [{ data: f }, { data: d }] = await Promise.all([
      supabase.from('fatture').select('*').eq('cliente_id', c.id).order('data', { ascending: false }),
      supabase.from('documenti').select('*').eq('cliente_id', c.id).order('caricato_il', { ascending: false })
    ])
    setFatture(f || [])
    setDocumenti(d || [])
  }

  async function refreshData() {
    if (!selected) return
    const [{ data: f }, { data: d }] = await Promise.all([
      supabase.from('fatture').select('*').eq('cliente_id', selected.id).order('data', { ascending: false }),
      supabase.from('documenti').select('*').eq('cliente_id', selected.id).order('caricato_il', { ascending: false })
    ])
    setFatture(f || [])
    setDocumenti(d || [])
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const { error } = await supabase.from('clienti').insert(form)
    if (!error) { setShowNew(false); loadClienti() }
    else alert('Errore: ' + error.message)
  }

  async function handleSaveParams(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('clienti').update({
      codice_ateco: form.codice_ateco,
      coefficiente_redditivita: form.coefficiente_redditivita,
      aliquota_imposta: form.aliquota_imposta,
      contributi_inps_fissi: form.contributi_inps_fissi,
    }).eq('id', selected!.id)
    // Refresh
    const { data } = await supabase.from('clienti').select('*').eq('id', selected!.id).single()
    if (data) { setSelected(data); setForm(data) }
    loadClienti()
    alert('Parametri salvati!')
  }

  // DETAIL VIEW
  if (selected) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', display: 'flex', padding: 4 }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{selected.nome} {selected.cognome}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{selected.email}</div>
          </div>
        </div>

        {/* Sub tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--bg2)' }}>
          {(['parametri', 'fatture', 'documenti'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              flex: 1, padding: '10px', background: 'transparent', border: 'none',
              borderBottom: `2px solid ${activeTab === t ? 'var(--primary)' : 'transparent'}`,
              color: activeTab === t ? 'var(--primary-light)' : 'var(--text3)',
              cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font)', fontWeight: 500,
              marginBottom: -1, textTransform: 'capitalize'
            }}>{t}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeTab === 'parametri' && (
            <form onSubmit={handleSaveParams} style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-row"><label>Codice ATECO</label><input value={form.codice_ateco || ''} onChange={e => setForm(p => ({ ...p, codice_ateco: e.target.value }))} placeholder="es. 69.20.11" /></div>
              <div className="form-row">
                <label>Coefficiente di redditività (%)</label>
                <input type="number" min="1" max="100" step="0.1" value={form.coefficiente_redditivita || 67} onChange={e => setForm(p => ({ ...p, coefficiente_redditivita: parseFloat(e.target.value) }))} />
                <span style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Dipende dal codice ATECO del cliente</span>
              </div>
              <div className="form-row">
                <label>Aliquota imposta sostitutiva (%)</label>
                <select value={form.aliquota_imposta || 15} onChange={e => setForm(p => ({ ...p, aliquota_imposta: parseFloat(e.target.value) }))}>
                  <option value={5}>5% – Nuovi forfettari (primi 5 anni)</option>
                  <option value={15}>15% – Aliquota ordinaria</option>
                </select>
              </div>
              <div className="form-row">
                <label>Contributi INPS fissi annui (€)</label>
                <input type="number" step="0.01" value={form.contributi_inps_fissi || 3000} onChange={e => setForm(p => ({ ...p, contributi_inps_fissi: parseFloat(e.target.value) }))} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                <Settings size={14} /> Salva parametri
              </button>
            </form>
          )}
          {activeTab === 'fatture' && <FattureTab clienteId={selected.id} fatture={fatture} onRefresh={refreshData} />}
          {activeTab === 'documenti' && <DocumentiTab clienteId={selected.id} documenti={documenti} isAdmin={true} onRefresh={refreshData} />}
        </div>
      </div>
    )
  }

  // LIST VIEW
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>SM</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Studio Montemurro</div>
              <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>Pannello Admin</div>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onLogout} style={{ padding: '7px 10px' }}>
            <LogOut size={15} />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
        <button className="btn btn-primary" onClick={() => setShowNew(true)} style={{ flex: 1, justifyContent: 'center' }}>
          <Plus size={15} /> Nuovo cliente
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}><span className="spinner" /></div>
        ) : clienti.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
            <Users size={40} strokeWidth={1} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14 }}>Nessun cliente ancora</p>
          </div>
        ) : clienti.map(c => (
          <button key={c.id} onClick={() => selectCliente(c)} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '12px 14px',
            cursor: 'pointer', textAlign: 'left', width: '100%'
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, background: 'var(--primary-glow)',
              border: '1px solid var(--border-active)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'var(--accent)', flexShrink: 0
            }}>
              {c.nome[0]}{c.cognome[0]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{c.nome} {c.cognome}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>
            </div>
            <div style={{ color: 'var(--text3)', flexShrink: 0 }}><ChevronRight size={16} /></div>
          </button>
        ))}
      </div>

      {/* Modal nuovo cliente */}
      {showNew && (
        <div className="modal-overlay" onClick={() => setShowNew(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Nuovo cliente</h2>
            <form onSubmit={handleCreate}>
              <div className="form-grid">
                <div className="form-row"><label>Nome</label><input value={form.nome || ''} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} required /></div>
                <div className="form-row"><label>Cognome</label><input value={form.cognome || ''} onChange={e => setForm(p => ({ ...p, cognome: e.target.value }))} required /></div>
              </div>
              <div className="form-row"><label>Email (per il login)</label><input type="email" value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required /></div>
              <div className="form-row"><label>Codice Fiscale</label><input value={form.codice_fiscale || ''} onChange={e => setForm(p => ({ ...p, codice_fiscale: e.target.value }))} /></div>
              <div className="form-row"><label>ATECO</label><input value={form.codice_ateco || ''} onChange={e => setForm(p => ({ ...p, codice_ateco: e.target.value }))} /></div>
              <div className="form-grid">
                <div className="form-row"><label>Coeff. redditivit. %</label><input type="number" value={form.coefficiente_redditivita || 67} onChange={e => setForm(p => ({ ...p, coefficiente_redditivita: parseFloat(e.target.value) }))} required /></div>
                <div className="form-row">
                  <label>Aliquota %</label>
                  <select value={form.aliquota_imposta || 15} onChange={e => setForm(p => ({ ...p, aliquota_imposta: parseFloat(e.target.value) }))}>
                    <option value={5}>5%</option>
                    <option value={15}>15%</option>
                  </select>
                </div>
              </div>
              <div className="form-row"><label>INPS fissi annui €</label><input type="number" value={form.contributi_inps_fissi || 3000} onChange={e => setForm(p => ({ ...p, contributi_inps_fissi: parseFloat(e.target.value) }))} required /></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowNew(false)}>Annulla</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Crea cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
