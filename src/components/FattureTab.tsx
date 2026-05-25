import { useState, useRef } from 'react'
import { Upload, Plus, X, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { supabase, Fattura } from '../lib/supabase'
import { parseFatturaPA, formatCurrency, formatDate, CODICI_CASSA } from '../lib/fattura'

export default function FattureTab({
  clienteId, codiceFiscale, fatture, onRefresh
}: {
  clienteId: string
  codiceFiscale: string   // CF del cliente loggato, per verifica cedente
  fatture: Fattura[]
  onRefresh: () => void
}) {
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<{ name: string; ok: boolean; msg: string }[]>([])
  const [showResults, setShowResults] = useState(false)
  const [showManuale, setShowManuale] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    numero: '', data: '', destinatario: '',
    compenso: '', contributo_cassa: '', tipo_cassa: '',
    codice_iva: 'N4', totale: '', stato: 'in_attesa' as 'incassata' | 'in_attesa'
  })

  async function handleXmlImport(files: FileList) {
    setImporting(true)
    const res: typeof results = []
    for (const file of Array.from(files)) {
      const text = await file.text()
      const parsed = parseFatturaPA(text)

      if (parsed.errore) {
        res.push({ name: file.name, ok: false, msg: parsed.errore })
        continue
      }

      // Controllo: il codice fiscale del cedente deve corrispondere al cliente loggato
      if (parsed.cedente_cf && codiceFiscale) {
        const cfXml = parsed.cedente_cf.toUpperCase().trim()
        const cfCliente = codiceFiscale.toUpperCase().trim()
        if (cfXml !== cfCliente) {
          res.push({
            name: file.name,
            ok: false,
            msg: `Fattura non importabile: codice fiscale cedente NON COERENTE con utente in sessione. Puoi importare solo le tue fatture.`,
          })
          continue
        }
      }

      const { error } = await supabase.from('fatture').insert({
        cliente_id: clienteId,
        numero: parsed.numero,
        data: parsed.data,
        destinatario: parsed.destinatario,
        compenso: parsed.compenso,
        contributo_cassa: parsed.contributo_cassa,
        tipo_cassa: parsed.tipo_cassa,
        cassa_esclusa_da_calcolo: parsed.cassa_esclusa_da_calcolo,
        imponibile: parsed.imponibile,
        codice_iva: parsed.codice_iva,
        totale: parsed.totale,
        stato: 'in_attesa',
        esclusa_da_calcolo: parsed.esclusa_da_calcolo,
      })
      if (error) {
        res.push({ name: file.name, ok: false, msg: error.message })
      } else {
        let msg = `Compenso: ${formatCurrency(parsed.compenso)}`
        if (parsed.contributo_cassa > 0) {
          msg += ` · Cassa ${parsed.tipo_cassa}: ${formatCurrency(parsed.contributo_cassa)}`
          if (parsed.cassa_esclusa_da_calcolo) msg += ' (esclusa)'
        }
        if (parsed.esclusa_da_calcolo) msg += ' · Fattura N1 esclusa'
        res.push({ name: file.name, ok: true, msg })
      }
    }
    setResults(res)
    setShowResults(true)
    setImporting(false)
    onRefresh()
  }

  async function handleManualeSubmit(e: React.FormEvent) {
    e.preventDefault()
    const compenso = parseFloat(form.compenso) || 0
    const contributo_cassa = parseFloat(form.contributo_cassa) || 0
    const cassa_esclusa = form.tipo_cassa !== '' && form.tipo_cassa !== 'TC22'
    const imponibile = compenso + (cassa_esclusa ? contributo_cassa : contributo_cassa)
    const totale = parseFloat(form.totale) || imponibile

    await supabase.from('fatture').insert({
      cliente_id: clienteId,
      numero: form.numero,
      data: form.data,
      destinatario: form.destinatario,
      compenso,
      contributo_cassa,
      tipo_cassa: form.tipo_cassa,
      cassa_esclusa_da_calcolo: cassa_esclusa,
      imponibile,
      codice_iva: form.codice_iva,
      totale,
      stato: form.stato,
      esclusa_da_calcolo: form.codice_iva === 'N1',
    })
    setShowManuale(false)
    setForm({ numero: '', data: '', destinatario: '', compenso: '', contributo_cassa: '', tipo_cassa: '', codice_iva: 'N4', totale: '', stato: 'in_attesa' })
    onRefresh()
  }

  async function toggleStato(f: Fattura) {
    await supabase.from('fatture').update({ stato: f.stato === 'incassata' ? 'in_attesa' : 'incassata' }).eq('id', f.id)
    onRefresh()
  }

  async function deleteFattura(id: string) {
    if (!confirm('Eliminare questa fattura?')) return
    await supabase.from('fatture').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
          onClick={() => fileRef.current?.click()} disabled={importing}>
          <Upload size={15} /> {importing ? 'Importando...' : 'Importa XML'}
        </button>
        <button className="btn btn-ghost" onClick={() => setShowManuale(true)}>
          <Plus size={15} /> Manuale
        </button>
        <input ref={fileRef} type="file" accept=".xml" multiple hidden
          onChange={e => e.target.files && handleXmlImport(e.target.files)} />
      </div>

      {showResults && (
        <div className="card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Risultati importazione</span>
            <button onClick={() => setShowResults(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)' }}>
              <X size={14} />
            </button>
          </div>
          {results.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 0', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              {r.ok ? <CheckCircle size={14} color="var(--success)" style={{ flexShrink: 0, marginTop: 2 }} />
                     : <AlertCircle size={14} color="var(--danger)" style={{ flexShrink: 0, marginTop: 2 }} />}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                <div style={{ fontSize: 12, color: r.ok ? 'var(--success)' : 'var(--danger)' }}>{r.msg}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {fatture.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
          <FileText size={40} strokeWidth={1} style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14 }}>Nessuna fattura ancora</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Importa file XML o aggiungi manualmente</p>
        </div>
      ) : (
        fatture.map(f => (
          <div key={f.id} className="card" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: 'var(--primary)' }}>N°{f.numero}</span>
                  <span className={`badge ${f.esclusa_da_calcolo ? 'badge-muted' : 'badge-info'}`}>{f.codice_iva}</span>
                  {f.esclusa_da_calcolo && <span className="badge badge-muted">Esclusa N1</span>}
                  {f.cassa_esclusa_da_calcolo && <span className="badge badge-warning">{f.tipo_cassa}</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{formatDate(f.data)} · {f.destinatario}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, color: f.esclusa_da_calcolo ? 'var(--text3)' : 'var(--text)' }}>
                  {formatCurrency(f.compenso)}
                </div>
                {f.contributo_cassa > 0 && (
                  <div style={{ fontSize: 11, color: f.cassa_esclusa_da_calcolo ? 'var(--warning)' : 'var(--text3)', marginTop: 1 }}>
                    + {formatCurrency(f.contributo_cassa)} cassa
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Tot: {formatCurrency(f.totale)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button className={`badge ${f.stato === 'incassata' ? 'badge-success' : 'badge-warning'}`}
                onClick={() => toggleStato(f)} style={{ cursor: 'pointer', border: 'none' }}>
                {f.stato === 'incassata' ? '✓ Incassata' : '⏳ In attesa'}
              </button>
              <button onClick={() => deleteFattura(f.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', alignItems: 'center' }}>
                <X size={14} />
              </button>
            </div>
          </div>
        ))
      )}

      {showManuale && (
        <div className="modal-overlay" onClick={() => setShowManuale(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Aggiungi fattura</h2>
            <form onSubmit={handleManualeSubmit}>
              <div className="form-grid">
                <div className="form-row"><label>N° Fattura</label><input value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} required /></div>
                <div className="form-row"><label>Data</label><input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} required /></div>
              </div>
              <div className="form-row"><label>Destinatario</label><input value={form.destinatario} onChange={e => setForm(p => ({ ...p, destinatario: e.target.value }))} required /></div>
              <div className="form-row"><label>Compenso professionale €</label><input type="number" step="0.01" value={form.compenso} onChange={e => setForm(p => ({ ...p, compenso: e.target.value }))} required /></div>

              <div style={{ background: 'var(--bg3)', borderRadius: 'var(--radius-sm)', padding: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cassa previdenziale (opzionale)</div>
                <div className="form-row" style={{ marginBottom: 10 }}>
                  <label>Tipo cassa</label>
                  <select value={form.tipo_cassa} onChange={e => setForm(p => ({ ...p, tipo_cassa: e.target.value }))}>
                    <option value="">Nessuna</option>
                    {Object.entries(CODICI_CASSA).map(([k, v]) => (
                      <option key={k} value={k}>{k} – {v}</option>
                    ))}
                  </select>
                </div>
                {form.tipo_cassa && (
                  <div className="form-row" style={{ marginBottom: 0 }}>
                    <label>Importo contributo cassa €</label>
                    <input type="number" step="0.01" value={form.contributo_cassa} onChange={e => setForm(p => ({ ...p, contributo_cassa: e.target.value }))} />
                    {form.tipo_cassa !== 'TC22' && form.contributo_cassa && (
                      <span style={{ fontSize: 11, color: 'var(--warning)', marginTop: 4 }}>⚠ Sarà esclusa dal calcolo imposte</span>
                    )}
                  </div>
                )}
              </div>

              <div className="form-grid">
                <div className="form-row">
                  <label>Codice IVA</label>
                  <select value={form.codice_iva} onChange={e => setForm(p => ({ ...p, codice_iva: e.target.value }))}>
                    <option value="N4">N4 – Esente</option>
                    <option value="N2">N2 – Non imponibile</option>
                    <option value="N1">N1 – Ex art.15 (rimborso)</option>
                    <option value="N6">N6 – Reverse charge</option>
                    <option value="22">22%</option>
                  </select>
                </div>
                <div className="form-row">
                  <label>Stato</label>
                  <select value={form.stato} onChange={e => setForm(p => ({ ...p, stato: e.target.value as 'incassata' | 'in_attesa' }))}>
                    <option value="in_attesa">In attesa</option>
                    <option value="incassata">Incassata</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <label>Totale fattura €</label>
                <input type="number" step="0.01" value={form.totale} onChange={e => setForm(p => ({ ...p, totale: e.target.value }))} placeholder="Lascia vuoto = auto" />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowManuale(false)}>Annulla</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
