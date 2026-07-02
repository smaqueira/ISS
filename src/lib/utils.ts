import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function getWhatsAppLink(phone: string, message?: string): string {
  const clean = phone.replace(/\D/g, '')
  const encoded = message ? encodeURIComponent(message) : ''
  return `https://wa.me/${clean}${encoded ? `?text=${encoded}` : ''}`
}

export function getDayOfWeek(): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return days[new Date().getDay()]
}

export function getSeason(): string {
  const month = new Date().getMonth() + 1
  if (month >= 12 || month <= 2) return 'verano'
  if (month >= 3 && month <= 5) return 'otoño'
  if (month >= 6 && month <= 8) return 'invierno'
  return 'primavera'
}

export function isPayday(): boolean {
  const day = new Date().getDate()
  return day === 14 || day === 15 || day === 29 || day === 30
}

export function scoreColor(score: number): string {
  if (score >= 75) return 'text-green-400'
  if (score >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    nuevo: 'Nuevo',
    contactado: 'Contactado',
    interesado: 'Interesado',
    cliente: 'Cliente',
    inactivo: 'Inactivo',
  }
  return labels[status] || status
}

export function statusColor(status: string): string {
  const colors: Record<string, string> = {
    nuevo: 'bg-blue-500/20 text-blue-400',
    contactado: 'bg-yellow-500/20 text-yellow-400',
    interesado: 'bg-orange-500/20 text-orange-400',
    cliente: 'bg-green-500/20 text-green-400',
    inactivo: 'bg-gray-500/20 text-gray-400',
  }
  return colors[status] || 'bg-gray-500/20 text-gray-400'
}

export function orderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pendiente: 'Pendiente',
    confirmado: 'Confirmado',
    preparacion: 'En preparación',
    enviado: 'Enviado',
    entregado: 'Entregado',
  }
  return labels[status] || status
}
