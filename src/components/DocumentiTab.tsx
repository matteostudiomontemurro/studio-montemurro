import { useState, useRef } from 'react'
import { supabase, Documento } from '../lib/supabase'
import { FolderOpen, Upload, Download, Trash2, FileText, File } from 'lucide-react'

function getFileIcon(tipo: string) {
  if (tipo.includes('pdf')) return <FileText size={20} color="var(--danger)" />
  return <File size={20} color="var(--text2)" />
}

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentiTab({
  clienteId, documenti, isAdmin, onRefresh
}: { clienteId: string; documenti: Documento[]; isAdmin: boolean; onRefresh: () => void }) {
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(files: FileList) {
    setUploading(true)
    for (const file of Array.from(files)) {
      const path = `${clienteId}/${Date.now()}_${file.name}`
      const { data, error } = await supabase.storage.from('documenti').upload(path, file)
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('documenti').getPublicUrl(path)
        await supabase.from('documenti').insert({
          cliente_id: clienteId,
          nome: file.name,
          tipo: file.type,
          url: urlData.publicUrl,
          dimensione: file.size.toString(),
        })
      }
    }
    setUploading(false)
    onRefresh()
  }

  async function handleDelete(doc: Documento) {
    if (!confirm(`Eliminare "${doc.nome}"?`)) return
    // Extract path from URL
    const path = doc.url.split('/documenti/')[1]
    await supabase.storage.from('documenti').remove([path])
    await supabase.from('documenti').delete().eq('id', doc.id)
    onRefresh()
  }

  // Group by type prefix
  const gruppi: Record<string, Documento[]> = {}
  documenti.forEach(d => {
    const g = d.tipo.includes('pdf') ? 'PDF' : d.tipo.includes('image') ? 'Immagini' : 'Altro'
    if (!gruppi[g]) gruppi[g] = []
    gruppi[g].push(d)
  })

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {isAdmin && (
        <div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload size={15} /> {uploading ? 'Caricamento...' : 'Carica documento'}
          </button>
          <input ref={fileRef} type="file" multiple hidden
            onChange={e => e.target.files && handleUpload(e.target.files)} />
        </div>
      )}

      {documenti.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
          <FolderOpen size={40} strokeWidth={1} style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14 }}>Nessun documento</p>
          {isAdmin && <p style={{ fontSize: 12, marginTop: 4 }}>Carica i documenti del cliente</p>}
        </div>
      ) : (
        Object.entries(gruppi).map(([gruppo, docs]) => (
          <div key={gruppo}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{gruppo}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {docs.map(d => (
                <div key={d.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
                  <div style={{ flexShrink: 0 }}>{getFileIcon(d.tipo)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nome}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {formatSize(d.dimensione ? parseInt(d.dimensione) : undefined)}
                      {d.dimensione && ' · '}
                      {new Date(d.caricato_il).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <a href={d.url} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', padding: 6, color: 'var(--text2)', borderRadius: 6, background: 'var(--bg3)' }}>
                      <Download size={14} />
                    </a>
                    {isAdmin && (
                      <button onClick={() => handleDelete(d)} style={{ display: 'flex', alignItems: 'center', padding: 6, color: 'var(--danger)', borderRadius: 6, background: 'rgba(248,113,113,0.1)', border: 'none', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
