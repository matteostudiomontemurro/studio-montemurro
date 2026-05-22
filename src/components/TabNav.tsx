import { BarChart2, FileText, Calculator, TrendingUp, FolderOpen } from 'lucide-react'

export type TabId = 'riepilogo' | 'fatture' | 'imposte' | 'confronto' | 'documenti'

const TABS: { id: TabId; label: string; Icon: React.ElementType }[] = [
  { id: 'riepilogo',  label: 'Riepilogo',  Icon: BarChart2 },
  { id: 'fatture',   label: 'Fatture',    Icon: FileText },
  { id: 'imposte',   label: 'Imposte',    Icon: Calculator },
  { id: 'confronto', label: 'Confronto',  Icon: TrendingUp },
  { id: 'documenti', label: 'Documenti',  Icon: FolderOpen },
]

export default function TabNav({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <div style={{
      display: 'flex', gap: 4, overflowX: 'auto', padding: '0 12px',
      scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      borderBottom: '1px solid var(--border)',
      background: 'white',
    }}>
      {TABS.map(({ id, label, Icon }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '10px 14px 8px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: isActive ? 'var(--primary)' : 'var(--text3)',
              borderBottom: `2px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
              whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'all 0.2s',
              fontSize: 11, fontFamily: 'var(--font)', fontWeight: isActive ? 600 : 500,
              letterSpacing: '0.03em',
              marginBottom: -1,
            }}
          >
            <Icon size={16} />
            {label}
          </button>
        )
      })}
    </div>
  )
}
