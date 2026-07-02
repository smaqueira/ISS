import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount)
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date))
}

export function waLink(phone: string, message?: string) {
  const clean = phone.replace(/\D/g, '')
  return `https://wa.me/${clean}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}

export function getSeason() {
  const m = new Date().getMonth() + 1
  if (m >= 12 || m <= 2) return 'verano'
  if (m <= 5) return 'otoño'
  if (m <= 8) return 'invierno'
  return 'primavera'
}

export function getDayName() {
  return ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'][new Date().getDay()]
}

export function isPayday() {
  const d = new Date().getDate()
  return d === 14 || d === 15 || d === 29 || d === 30
}

export function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}
