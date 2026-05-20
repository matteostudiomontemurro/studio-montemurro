import { useState, useEffect } from 'react'
import { supabase, Cliente, Fattura, Documento, AnnoConfronto } from '../lib/supabase'
import TabNav, { TabId } from '../components/TabNav'
import RiepilogoTab from '../components/RiepilogoTab'
import FattureTab from '../components/FattureTab'
import ImposteTab from '../components/ImposteTab'
import ConfrontoTab from '../components/ConfrontoTab'
import DocumentiTab from '../components/DocumentiTab'
import { LogOut } from 'lucide-react'

export default function DashboardPage({ userId, onLogout }: { userId: string; onLogout: () => void }) {
  const [tab, setTab] = useState<TabId>('riepilogo')
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [fatture, setFatture] = useState<Fattura[]>([])
  const [documenti, setDocumenti] = useState<Documento[]>([])
  const [anni, setAnni] = useState<AnnoConfronto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [userId])

  async function loadAll() {
    setLoading(true)
    // Get user email to find cliente
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
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white' }}>SM</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Studio Montemurro</div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{cliente.nome} {cliente.cognome}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', padding: 4 }}>
          <LogOut size={16} />
        </button>
      </div>

      {/* Tab nav */}
      <TabNav active={tab} onChange={setTab} />

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'riepilogo'  && <RiepilogoTab cliente={cliente} fatture={fatture} />}
        {tab === 'fatture'    && <FattureTab clienteId={cliente.id} fatture={fatture} onRefresh={refreshFatture} />}
        {tab === 'imposte'    && <ImposteTab cliente={cliente} fatture={fatture} />}
        {tab === 'confronto'  && <ConfrontoTab cliente={cliente} fatture={fatture} anni={anni} onRefresh={refreshAnni} />}
        {tab === 'documenti'  && <DocumentiTab clienteId={cliente.id} documenti={documenti} isAdmin={false} onRefresh={refreshDocumenti} />}
      </div>
    </div>
  )
}
