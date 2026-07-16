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

export function useIsAdmin(): boolean {
  return useRole() === 'admin'
}
