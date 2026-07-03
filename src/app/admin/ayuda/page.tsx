export default function AyudaPage() {
  const s = {
    h2: { fontSize: '1.05rem', fontWeight: 700, marginBottom: 10, marginTop: 28, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8 } as React.CSSProperties,
    h3: { fontSize: '0.88rem', fontWeight: 700, marginBottom: 6, marginTop: 16, color: 'var(--text)' } as React.CSSProperties,
    p: { fontSize: '0.83rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: 6 } as React.CSSProperties,
    li: { fontSize: '0.83rem', color: 'var(--muted)', lineHeight: 1.7, marginLeft: 16 } as React.CSSProperties,
    badge: (color: string) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: color + '20', color, marginRight: 6, marginBottom: 4 } as React.CSSProperties),
    tip: { background: '#f9731615', border: '1px solid #f9731630', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#f97316', marginTop: 10, marginBottom: 6 } as React.CSSProperties,
    divider: { border: 'none', borderTop: '1px solid var(--border)', margin: '8px 0' } as React.CSSProperties,
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 4 }}>Manual de usuario</h1>
      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: 28 }}>
        Guía completa del Intelligent Sales System · Última actualización: julio 2025
      </p>

      {/* Índice */}
      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.88rem' }}>Contenido</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {[
            ['1.', 'Dashboard'],
            ['2.', 'Clientes (CRM)'],
            ['3.', 'Pedidos'],
            ['4.', 'Catálogo de productos'],
            ['5.', 'Cotizaciones B2B'],
            ['6.', 'Prospección automática'],
            ['7.', 'Buscador de grupos'],
            ['8.', 'Broadcast'],
            ['9.', 'Contenido e imágenes IA'],
            ['10.', 'Importar contactos'],
            ['11.', 'Configuración'],
            ['12.', 'Catálogo público'],
          ].map(([n, t]) => (
            <div key={n} style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700, marginRight: 6 }}>{n}</span>{t}
            </div>
          ))}
        </div>
      </div>

      {/* 1. Dashboard */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h2 style={s.h2}>⚡ 1. Dashboard</h2>
        <p style={s.p}>Pantalla principal del sistema. Se carga automáticamente al ingresar.</p>
        <h3 style={s.h3}>Qué muestra</h3>
        <ul>
          <li style={s.li}><strong>Ventas del mes</strong> — total facturado en pedidos entregados vs. mes anterior</li>
          <li style={s.li}><strong>Clientes activos</strong> — cantidad con status "cliente", separado B2B y B2C</li>
          <li style={s.li}><strong>Leads nuevos (7 días)</strong> — prospectos ingresados en la última semana</li>
          <li style={s.li}><strong>Tasa de conversión</strong> — porcentaje de leads que se convirtieron en clientes</li>
          <li style={s.li}><strong>Pipeline</strong> — barra de progreso por cada etapa del embudo</li>
          <li style={s.li}><strong>Top zonas</strong> — barrios con más clientes registrados</li>
          <li style={s.li}><strong>Últimos pedidos</strong> — los 5 pedidos más recientes del mes</li>
          <li style={s.li}><strong>Tareas de hoy</strong> — generadas automáticamente cada mañana por el cron</li>
        </ul>
        <div style={s.tip}>💡 Las tareas del día se generan automáticamente a las 8am. Si no aparecen, esperá al día siguiente o ejecutá el cron manualmente desde Vercel.</div>
      </div>

      {/* 2. CRM */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h2 style={s.h2}>👥 2. Clientes (CRM)</h2>
        <p style={s.p}>Administrá todos tus contactos, tanto negocios (B2B) como particulares (B2C).</p>
        <h3 style={s.h3}>Estados del cliente</h3>
        <div style={{ marginBottom: 10 }}>
          <span style={s.badge('#3b82f6')}>nuevo</span> Ingresó al sistema, todavía no fue contactado<br />
          <span style={s.badge('#eab308')}>contactado</span> Se le mandó un mensaje o propuesta<br />
          <span style={s.badge('#f97316')}>interesado</span> Respondió y mostró interés<br />
          <span style={s.badge('#22c55e')}>cliente</span> Ya compró o cerró trato<br />
          <span style={s.badge('#64748b')}>inactivo</span> Sin respuesta por más de 14 días (automático)
        </div>
        <h3 style={s.h3}>Funciones principales</h3>
        <ul>
          <li style={s.li}>Crear cliente manualmente con nombre, teléfono, email, zona, rubro y tipo</li>
          <li style={s.li}>Cambiar estado arrastrando o desde el menú del cliente</li>
          <li style={s.li}>Ver historial de interacciones (mensajes, pedidos, emails)</li>
          <li style={s.li}>Botón WhatsApp → genera propuesta con IA y abre wa.me con el mensaje ya escrito</li>
          <li style={s.li}>Importar masivamente desde CSV/Excel (ver sección 10)</li>
        </ul>
        <div style={s.tip}>💡 El sistema marca automáticamente como "inactivo" a los clientes contactados sin respuesta por más de 14 días.</div>
      </div>

      {/* 3. Pedidos */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h2 style={s.h2}>📦 3. Pedidos</h2>
        <p style={s.p}>Registrá y seguí cada pedido vinculado a un cliente.</p>
        <h3 style={s.h3}>Estados del pedido</h3>
        <div style={{ marginBottom: 8 }}>
          <span style={s.badge('#94a3b8')}>pendiente</span>
          <span style={s.badge('#eab308')}>confirmado</span>
          <span style={s.badge('#f97316')}>preparacion</span>
          <span style={s.badge('#22c55e')}>entregado</span>
          <span style={s.badge('#ef4444')}>cancelado</span>
        </div>
        <ul>
          <li style={s.li}>Cada pedido se vincula a un cliente del CRM</li>
          <li style={s.li}>Podés agregar ítems con producto, cantidad y precio unitario</li>
          <li style={s.li}>El total se calcula automáticamente</li>
          <li style={s.li}>Solo los pedidos en estado "entregado" cuentan para las ventas del dashboard</li>
        </ul>
      </div>

      {/* 4. Catálogo */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h2 style={s.h2}>🛍️ 4. Catálogo de productos</h2>
        <p style={s.p}>Administrá los productos que aparecen en tu página pública y en las cotizaciones.</p>
        <h3 style={s.h3}>Cómo agregar un producto</h3>
        <ul>
          <li style={s.li}>Completá nombre, precio, unidad (kg, unidad, caja, etc.) y categoría</li>
          <li style={s.li}>Podés agregar una URL de imagen para que aparezca en el catálogo público</li>
          <li style={s.li}>Activar/desactivar productos sin borrarlos (los desactivados no aparecen en el catálogo)</li>
        </ul>
        <h3 style={s.h3}>Link del catálogo público</h3>
        <p style={s.p}>Aparece arriba de la lista. Copialo y compartilo en grupos de WhatsApp, bio de Instagram, estados. Los clientes pueden ver los productos y mandar un pedido directo por WhatsApp.</p>
        <div style={s.tip}>💡 El catálogo público (<strong>/catalogo</strong>) no requiere login. Cualquiera con el link puede verlo y hacer un pedido.</div>
      </div>

      {/* 5. Cotizaciones */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h2 style={s.h2}>📄 5. Cotizaciones B2B</h2>
        <p style={s.p}>Generá propuestas formales con PDF para cerrar ventas con negocios.</p>
        <h3 style={s.h3}>Cómo crear una cotización</h3>
        <ul>
          <li style={s.li}><strong>Paso 1:</strong> Buscá el cliente B2B por nombre</li>
          <li style={s.li}><strong>Paso 2:</strong> Agregá los productos con cantidad y precio (los del catálogo aparecen como sugerencias)</li>
          <li style={s.li}><strong>Paso 3:</strong> Apretá "Generar con IA" → escribe automáticamente la introducción y el cierre</li>
          <li style={s.li}><strong>Paso 4:</strong> Elegí la vigencia (3, 5, 7, 10, 15 o 30 días)</li>
          <li style={s.li}><strong>Paso 5:</strong> Guardá → se abre el PDF listo para descargar o enviar</li>
        </ul>
        <h3 style={s.h3}>En el PDF</h3>
        <ul>
          <li style={s.li}>Tu logo y datos de empresa en el encabezado</li>
          <li style={s.li}>Número de cotización único</li>
          <li style={s.li}>Tabla de productos con subtotales y total</li>
          <li style={s.li}>Botón para descargar como PDF (Ctrl+P → Guardar como PDF)</li>
          <li style={s.li}>Botón para enviar el link por WhatsApp al cliente</li>
        </ul>
      </div>

      {/* 6. Prospección */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h2 style={s.h2}>🔍 6. Prospección automática</h2>
        <p style={s.p}>Buscá negocios potenciales en Google Maps y la IA los califica e importa al CRM.</p>
        <h3 style={s.h3}>Tres modos de búsqueda</h3>
        <ul>
          <li style={s.li}><strong>Simple:</strong> Un rubro + una zona → 10 resultados con score de la IA</li>
          <li style={s.li}><strong>Por rubros:</strong> Una ciudad + varios rubros → búsqueda secuencial e importación automática</li>
          <li style={s.li}><strong>Por zonas CABA/GBA:</strong> Seleccionás barrios y rubros → hace todas las combinaciones automáticamente</li>
        </ul>
        <h3 style={s.h3}>Score de la IA (0-100)</h3>
        <div style={{ marginBottom: 8 }}>
          <span style={s.badge('#22c55e')}>75-100</span> Alta probabilidad de compra<br />
          <span style={s.badge('#eab308')}>50-74</span> Vale la pena contactar<br />
          <span style={s.badge('#ef4444')}>0-49</span> Baja prioridad
        </div>
        <ul>
          <li style={s.li}>Solo importa contactos con score ≥ 60 que tengan teléfono o web</li>
          <li style={s.li}>Los que ya están en el CRM aparecen con badge <span style={s.badge('#f59e0b')}>ya en CRM</span> y no se reimportan</li>
        </ul>
        <div style={s.tip}>💡 El modo "Por zonas" puede hacer decenas de búsquedas en una sola sesión. Empezá con 2-3 rubros y 4-5 zonas para no agotar las claves de Serper.</div>
      </div>

      {/* 7. Grupos */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h2 style={s.h2}>👥 7. Buscador de grupos</h2>
        <p style={s.p}>Encontrá grupos de WhatsApp y Facebook por zona para compartir tu catálogo con particulares (B2C).</p>
        <ul>
          <li style={s.li}>Seleccionás un barrio o escribís cualquier zona</li>
          <li style={s.li}>Elegís el tema (vecinos, gastronomía, emprendedores, etc.)</li>
          <li style={s.li}>El sistema busca links de grupos públicos y los lista ordenados por plataforma</li>
          <li style={s.li}>Botón directo para unirte a grupos de WhatsApp o ver grupos de Facebook</li>
        </ul>
        <div style={s.tip}>💡 Estrategia: entrá a 5-10 grupos de vecinos por semana y publicá tu catálogo. Una publicación por grupo por semana máximo para no ser bloqueado.</div>
      </div>

      {/* 8. Broadcast */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h2 style={s.h2}>📣 8. Broadcast</h2>
        <p style={s.p}>Enviá un mensaje masivo a tus contactos por WhatsApp con un solo clic por cliente.</p>
        <h3 style={s.h3}>Cómo usarlo</h3>
        <ul>
          <li style={s.li}><strong>Paso 1:</strong> Filtrá por tipo (B2B / B2C / todos) y estado (cliente, interesado, etc.)</li>
          <li style={s.li}><strong>Paso 2:</strong> Escribí la idea del mensaje o dejalo en blanco para que la IA proponga algo</li>
          <li style={s.li}><strong>Paso 3:</strong> Apretá "Generar con IA" → redacta el mensaje adaptado al público seleccionado</li>
          <li style={s.li}><strong>Paso 4:</strong> Editá el mensaje si querés y apretá "Abrir en WhatsApp"</li>
        </ul>
        <div style={s.tip}>💡 WhatsApp no permite envío automático masivo. El botón "Abrir primeros 10" abre cada chat con el mensaje ya escrito — solo tenés que apretar Enviar en cada uno.</div>
      </div>

      {/* 9. Contenido e imágenes */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h2 style={s.h2}>🎨 9. Contenido e Imágenes IA</h2>
        <h3 style={s.h3}>Generador de contenido</h3>
        <ul>
          <li style={s.li}><strong>Instagram:</strong> Caption + hashtags + imagen de flyer generada automáticamente</li>
          <li style={s.li}><strong>Broadcast WhatsApp:</strong> Mensaje listo para copiar y enviar por listas</li>
          <li style={s.li}><strong>Calendario semanal:</strong> Plan de 7 días con idea, caption y hashtags por día</li>
        </ul>
        <h3 style={s.h3}>Generador de imágenes</h3>
        <ul>
          <li style={s.li}>Escribís el producto → la IA genera el prompt → genera la imagen</li>
          <li style={s.li}><strong>Flyer de oferta</strong> (1080×1080) — precio tachado, descuento destacado</li>
          <li style={s.li}><strong>Historia de Instagram</strong> (1080×1920) — formato vertical 9:16</li>
          <li style={s.li}><strong>Banner WhatsApp</strong> (1280×720) — horizontal para broadcasts</li>
          <li style={s.li}><strong>Showcase</strong> (1080×1080) — foto elegante sobre fondo neutro</li>
          <li style={s.li}>Tu logo aparece automáticamente en la esquina inferior derecha</li>
          <li style={s.li}>Cadena de generación: Fal.ai → Ideogram → Pollinations (siempre genera algo)</li>
        </ul>
        <div style={s.tip}>💡 Para que el logo aparezca en las imágenes, primero subilo en Configuración → Logo.</div>
      </div>

      {/* 10. Importar */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h2 style={s.h2}>📥 10. Importar contactos</h2>
        <p style={s.p}>Subí un Excel o CSV con tus contactos existentes y se importan solos al CRM.</p>
        <h3 style={s.h3}>Cómo preparar el archivo</h3>
        <ul>
          <li style={s.li}>Exportá tu Excel como CSV (Archivo → Guardar como → CSV)</li>
          <li style={s.li}>El sistema detecta automáticamente las columnas por el nombre del encabezado</li>
          <li style={s.li}>Columnas reconocidas: nombre, teléfono, email, ciudad, tipo, rubro, notas</li>
          <li style={s.li}>La columna "tipo" puede ser "b2b", "negocio", "empresa" → se importa como B2B; todo lo demás es B2C</li>
        </ul>
        <ul>
          <li style={s.li}>Muestra una preview antes de confirmar</li>
          <li style={s.li}>Los duplicados (mismo nombre o teléfono) se omiten automáticamente</li>
          <li style={s.li}>Todos los importados quedan con estado "nuevo"</li>
        </ul>
        <div style={s.tip}>💡 Podés arrastrar el archivo directo a la pantalla, sin necesidad de buscarlo.</div>
      </div>

      {/* 11. Configuración */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h2 style={s.h2}>⚙️ 11. Configuración</h2>
        <p style={s.p}>Todas las claves API y datos de la empresa se administran desde acá, sin tocar código.</p>
        <h3 style={s.h3}>Datos de empresa</h3>
        <ul>
          <li style={s.li}><strong>Logo</strong> — se muestra en las imágenes generadas, cotizaciones y catálogo público</li>
          <li style={s.li}><strong>Nombre, WhatsApp, email, slogan</strong> — aparecen en cotizaciones y catálogo</li>
        </ul>
        <h3 style={s.h3}>Claves API</h3>
        <ul>
          <li style={s.li}><strong>Groq (x4):</strong> Motor de IA para todo el texto generado. Rotan automáticamente.</li>
          <li style={s.li}><strong>Serper (x3):</strong> Búsquedas en Google Maps para prospección. Rotan automáticamente.</li>
          <li style={s.li}><strong>Fal.ai (x3):</strong> Generación de imágenes fotorrealistas. Rotan automáticamente.</li>
          <li style={s.li}><strong>Ideogram:</strong> Fallback de generación de imágenes.</li>
          <li style={s.li}><strong>Telegram:</strong> Token del bot y Chat ID del grupo para recibir el briefing diario.</li>
          <li style={s.li}><strong>Resend:</strong> Clave para el envío de emails automáticos de seguimiento.</li>
        </ul>
        <div style={s.tip}>💡 Nunca compartas estas claves. Solo las ingresás en esta pantalla o directamente en Supabase.</div>
      </div>

      {/* 12. Catálogo público */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h2 style={s.h2}>🌐 12. Catálogo público</h2>
        <p style={s.p}>Página pública en <strong>/catalogo</strong> — no requiere login, cualquier persona puede verla.</p>
        <ul>
          <li style={s.li}>Muestra todos los productos activos con foto, precio y descripción</li>
          <li style={s.li}>El cliente agrega productos al carrito y completa su nombre y dirección</li>
          <li style={s.li}>Al confirmar, se abre WhatsApp con el pedido ya redactado y enviado a tu número</li>
          <li style={s.li}>Ideal para compartir en grupos de vecinos, Instagram bio y estados de WhatsApp</li>
        </ul>
        <div style={s.tip}>💡 Para que el botón de pedido funcione, configurá el número de WhatsApp en Configuración → COMPANY_WHATSAPP (formato internacional sin +: ej. 5491155554444).</div>
      </div>

      {/* Automatización */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h2 style={s.h2}>🤖 Automatizaciones</h2>
        <p style={s.p}>El sistema trabaja solo en segundo plano sin que tengas que hacer nada.</p>
        <ul>
          <li style={s.li}><strong>8:00am todos los días</strong> — genera las tareas del día en el dashboard</li>
          <li style={s.li}><strong>Día 3 sin respuesta</strong> — envía email de seguimiento automático al cliente</li>
          <li style={s.li}><strong>Día 7 sin respuesta</strong> — envía segundo email de seguimiento</li>
          <li style={s.li}><strong>Día 14 sin respuesta</strong> — marca el cliente como "inactivo"</li>
          <li style={s.li}><strong>Prospectos sin contactar</strong> — genera tarea urgente para los que llevan más de 1 día sin contactar</li>
          <li style={s.li}><strong>Briefing Telegram</strong> — cada mañana manda al grupo un resumen con tareas y estadísticas</li>
        </ul>
      </div>

      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.75rem', marginTop: 28, paddingBottom: 20 }}>
        Intelligent Sales System · Stack: Next.js + Supabase + Groq + Vercel · Costo mensual: $0
      </div>
    </div>
  )
}
