'use client'
import { useEffect, useState } from 'react'

type Role = 'admin' | 'readonly' | null

let cached: Role = null

export function useRole(): Role {
  const [role, setRole] = useState<Role>(cached)

  useEffect(() => {
    if (cached) { setRole(cached); return }
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { cached = d.role; setRole(d.role) })
      .catch(() => setRole(null))
  }, [])

  return role
}

// null = todavía cargando, true = admin, false = no admin
export function useIsAdmin(): boolean | null {
  const role = useRole()
  if (role === null) return null
  return role === 'admin'
}
