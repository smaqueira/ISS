import Sidebar from '@/components/layout/Sidebar'
import AsistenteWidget from '@/components/layout/AsistenteWidget'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
        {children}
      </main>
      <AsistenteWidget />
    </div>
  )
}
