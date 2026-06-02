import { useState, useEffect } from 'react'
import { supabase, Cliente, Fattura, Documento, AnnoConfronto } from '../lib/supabase'
import TabNav, { TabId } from '../components/TabNav'
import RiepilogoTab from '../components/RiepilogoTab'
import FattureTab from '../components/FattureTab'
import ImposteTab from '../components/ImposteTab'
import ConfrontoTab from '../components/ConfrontoTab'
import DocumentiTab from '../components/DocumentiTab'
import { LogOut, ChevronDown } from 'lucide-react'

export default function DashboardPage({ userId, onLogout }: { userId: string; onLogout: () => void }) {
  const annoAttuale = new Date().getFullYear()
  const [tab, setTab] = useState<TabId>('riepilogo')
  const [annoFiscale, setAnnoFiscale] = useState(annoAttuale)
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [fatture, setFatture] = useState<Fattura[]>([])
  const [documenti, setDocumenti] = useState<Documento[]>([])
  const [anni, setAnni] = useState<AnnoConfronto[]>([])
  const [loading, setLoading] = useState(true)

  // Anni disponibili: dal 2023 all'anno corrente
  const anniDisponibili = Array.from({ length: annoAttuale - 2022 }, (_, i) => annoAttuale - i)

  useEffect(() => { loadAll() }, [userId])

  async function loadAll() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const email = user?.email
    if (!email) return
    const { data: c } = await supabase.from('clienti').select('*').eq('email', email).single()
    if (!c) { setLoading(false); return }
    setCliente(c)
    const [{ data: f }, { data: d }, { data: a }] = await Promise.all([
      supabase.from('fatture').select('*').eq('cliente_id', c.id).order('data', { ascending: false }),
      supabase.from('documenti').select('*').eq('cliente_id', c.id).order('caricato_il', { ascending: false }),
      supabase.from('anni_confronto').select('*').eq('cliente_id', c.id)
    ])
    setFatture(f || [])
    setDocumenti(d || [])
    setAnni(a || [])
    setLoading(false)
  }

  async function refreshFatture() {
    if (!cliente) return
    const { data } = await supabase.from('fatture').select('*').eq('cliente_id', cliente.id).order('data', { ascending: false })
    setFatture(data || [])
  }

  async function refreshDocumenti() {
    if (!cliente) return
    const { data } = await supabase.from('documenti').select('*').eq('cliente_id', cliente.id).order('caricato_il', { ascending: false })
    setDocumenti(data || [])
  }

  async function refreshAnni() {
    if (!cliente) return
    const { data } = await supabase.from('anni_confronto').select('*').eq('cliente_id', cliente.id)
    setAnni(data || [])
  }

  if (loading) {
    return (
      <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <span className="spinner" />
      </div>
    )
  }

  if (!cliente) {
    return (
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--text2)', marginBottom: 16 }}>Profilo cliente non trovato. Contatta lo studio.</p>
        <button className="btn btn-ghost" onClick={onLogout}><LogOut size={15} /> Esci</button>
      </div>
    )
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg2)' }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px', background: 'var(--primary)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
      }}>
        <img src="/logo-icona.png" alt="Logo" style={{ height: 36, width: 36, objectFit: 'contain', borderRadius: 6 }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>Montemurro Studio Tributario</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{cliente.nome} {cliente.cognome}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Selettore anno fiscale globale */}
          <div style={{ position: 'relative' }}>
            <select
              value={annoFiscale}
              onChange={e => setAnnoFiscale(parseInt(e.target.value))}
              style={{
                appearance: 'none', background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8,
                color: 'white', fontSize: 13, fontWeight: 600,
                padding: '5px 24px 5px 10px', cursor: 'pointer',
                fontFamily: 'var(--font)'
              }}>
              {anniDisponibili.map(a => <option key={a} value={a} style={{ color: 'var(--text)', background: 'white' }}>{a}</option>)}
            </select>
            <ChevronDown size={13} color="white" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
          <button onClick={onLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', padding: 4 }}>
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Tab nav */}
      <TabNav active={tab} onChange={setTab} />

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg2)' }}>
        {tab === 'riepilogo'  && <RiepilogoTab cliente={cliente} fatture={fatture} annoFiscale={annoFiscale} />}
        {tab === 'fatture'    && <FattureTab clienteId={cliente.id} codiceFiscale={cliente.codice_fiscale ?? ''} fatture={fatture} annoFiscale={annoFiscale} onRefresh={refreshFatture} />}
        {tab === 'imposte'    && <ImposteTab cliente={cliente} fatture={fatture} annoFiscale={annoFiscale} />}
        {tab === 'confronto'  && <ConfrontoTab cliente={cliente} fatture={fatture} anni={anni} onRefresh={refreshAnni} />}
        {tab === 'documenti'  && <DocumentiTab clienteId={cliente.id} documenti={documenti} isAdmin={false} onRefresh={refreshDocumenti} />}
      </div>
    </div>
  )
}
