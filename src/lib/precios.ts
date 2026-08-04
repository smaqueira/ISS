// Cálculo del precio MAYORISTA por producto.
// Minorista = precio de BlueMarket (por kilo). Mayorista = precio por kilo × kilos
// que trae la caja. Si el producto no tiene precio/kg mayorista cargado, se usa el
// descuento general sobre el precio minorista.

export interface MayCfg { precioKg?: number; kilosCaja?: number; off?: boolean }

// ¿El producto NO se ofrece por mayorista? (switch por producto)
export function mayoristaDeshabilitado(cfg: MayCfg | undefined): boolean {
  return cfg?.off === true
}

export interface MayResult {
  unitKg: number    // precio mayorista por kilo
  kilosCaja: number // kilos de la caja (0 = se vende por kilo, sin caja)
  boxTotal: number  // precio total de la caja
  porCaja: boolean  // true si se vende por caja
}

const clamp = (n: number) => Math.min(90, Math.max(0, n))

export function calcMayorista(retail: number, cfg: MayCfg | undefined, descGeneral: number): MayResult {
  const kg = cfg?.kilosCaja && cfg.kilosCaja > 0 ? cfg.kilosCaja : 0
  const unit = (cfg?.precioKg && cfg.precioKg > 0)
    ? cfg.precioKg
    : retail * (1 - clamp(descGeneral) / 100)
  const box = kg > 0 ? unit * kg : unit
  return { unitKg: Math.round(unit), kilosCaja: kg, boxTotal: Math.round(box), porCaja: kg > 0 }
}

export function fmtAR(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-AR')
}
