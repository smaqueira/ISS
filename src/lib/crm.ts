// CRM constants — status, prioridad, temperatura, acciones

export const STATUS_OPTIONS = [
  { value: 'prospecto',            label: 'Prospecto' },
  { value: 'contactado',           label: 'Contactado' },
  { value: 'sin_respuesta',        label: 'Sin respuesta' },
  { value: 'respondio',            label: 'Respondió' },
  { value: 'interesado',           label: 'Interesado' },
  { value: 'negociacion',          label: 'Negociación' },
  { value: 'presupuesto_enviado',  label: 'Presupuesto enviado' },
  { value: 'esperando_respuesta',  label: 'Esperando respuesta' },
  { value: 'cliente',              label: 'Cliente' },
  { value: 'cliente_recurrente',   label: 'Cliente recurrente' },
  { value: 'no_interesado',        label: 'No interesado' },
  { value: 'perdido',              label: 'Perdido' },
] as const

export const STATUS_LABELS: Record<string, string> = {
  prospecto:           'Prospecto',
  contactado:          'Contactado',
  sin_respuesta:       'Sin respuesta',
  respondio:           'Respondió',
  interesado:          'Interesado',
  negociacion:         'Negociación',
  presupuesto_enviado: 'Presupuesto enviado',
  esperando_respuesta: 'Esperando respuesta',
  cliente:             'Cliente',
  cliente_recurrente:  'Cliente recurrente',
  no_interesado:       'No interesado',
  perdido:             'Perdido',
  // legacy
  nuevo:               'Prospecto',
  inactivo:            'Perdido',
}

export const STATUS_COLORS: Record<string, string> = {
  prospecto:           '#6366f1',
  contactado:          '#3b82f6',
  sin_respuesta:       '#94a3b8',
  respondio:           '#06b6d4',
  interesado:          '#f59e0b',
  negociacion:         '#f97316',
  presupuesto_enviado: '#8b5cf6',
  esperando_respuesta: '#a78bfa',
  cliente:             '#22c55e',
  cliente_recurrente:  '#16a34a',
  no_interesado:       '#ef4444',
  perdido:             '#dc2626',
  nuevo:               '#6366f1',
  inactivo:            '#dc2626',
}

export const ACCION_OPTIONS = [
  { value: 'whatsapp',  label: 'Enviar WhatsApp' },
  { value: 'llamar',    label: 'Llamar' },
  { value: 'catalogo',  label: 'Enviar catálogo' },
  { value: 'promocion', label: 'Enviar promoción' },
  { value: 'reunion',   label: 'Agendar reunión' },
  { value: 'esperar',   label: 'Esperar respuesta' },
  { value: 'otro',      label: 'Otro' },
]

export const MOTIVO_PERDIDA_OPTIONS = [
  { value: 'precio',          label: 'Precio' },
  { value: 'tiene_proveedor', label: 'Ya tiene proveedor' },
  { value: 'no_respondio',    label: 'No respondió' },
  { value: 'no_producto',     label: 'No trabaja este producto' },
  { value: 'sin_interes',     label: 'Sin interés' },
  { value: 'cerro_negocio',   label: 'Cerró el negocio' },
  { value: 'otro',            label: 'Otro' },
]

export const PRIORIDAD_OPTIONS = [
  { value: 'alta',  label: 'Alta',  color: '#ef4444' },
  { value: 'media', label: 'Media', color: '#f59e0b' },
  { value: 'baja',  label: 'Baja',  color: '#94a3b8' },
]

export const TEMPERATURA_OPTIONS = [
  { value: 'caliente', label: 'Caliente', color: '#ef4444' },
  { value: 'tibio',    label: 'Tibio',    color: '#f59e0b' },
  { value: 'frio',     label: 'Frío',     color: '#3b82f6' },
]

// Groups for dashboard
export const STATUS_GROUPS = {
  activos:   ['prospecto', 'contactado', 'sin_respuesta', 'respondio', 'interesado', 'negociacion', 'presupuesto_enviado', 'esperando_respuesta', 'nuevo'],
  ganados:   ['cliente', 'cliente_recurrente'],
  perdidos:  ['no_interesado', 'perdido', 'inactivo'],
}
