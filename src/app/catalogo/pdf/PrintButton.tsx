'use client'
export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        position: 'fixed', top: 20, right: 20, zIndex: 100,
        background: '#7EC8C8', color: '#0D1326', border: 'none',
        padding: '12px 28px', borderRadius: 30,
        fontWeight: 700, fontSize: 14, cursor: 'pointer',
        boxShadow: '0 4px 20px #7EC8C844',
        fontFamily: 'Montserrat, sans-serif',
      }}
    >
      🖨️ Guardar como PDF
    </button>
  )
}
