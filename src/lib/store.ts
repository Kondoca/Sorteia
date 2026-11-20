import { useSyncExternalStore } from 'react'
import type { Campaign, DB, Order } from '../types'
import { onlyDigits, uid } from './format'

const KEY = 'sorteia:v1'
export const RESERVATION_MINUTES = 10

const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString()

const FIRST = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elaine', 'Felipe', 'Gabi', 'Hugo', 'Isis', 'João', 'Karen', 'Lucas', 'Marina', 'Nando', 'Olívia', 'Paulo', 'Rafa', 'Sabrina', 'Tiago', 'Vitória']
const LAST = ['Souza', 'Lima', 'Nunes', 'Oliveira', 'Santos', 'Costa', 'Pereira', 'Alves', 'Ribeiro', 'Martins']

function seedOrders(campaign: Campaign, filledRatio: number, rng: () => number): Order[] {
  const orders: Order[] = []
  const taken = new Set<number>()
  const target = Math.floor(campaign.totalNumbers * filledRatio)
  while (taken.size < target) {
    const qty = 1 + Math.floor(rng() * 5)
    const numbers: number[] = []
    for (let i = 0; i < qty && taken.size < target; i++) {
      let n = Math.floor(rng() * campaign.totalNumbers)
      while (taken.has(n)) n = (n + 1) % campaign.totalNumbers
      taken.add(n)
      numbers.push(n)
    }
    const name = `${FIRST[Math.floor(rng() * FIRST.length)]} ${LAST[Math.floor(rng() * LAST.length)]}`
    const created = new Date(Date.now() - rng() * 6 * 86_400_000).toISOString()
    orders.push({
      id: uid(),
      campaignId: campaign.id,
      numbers: numbers.sort((a, b) => a - b),
      name,
      phone: `119${String(Math.floor(rng() * 1e8)).padStart(8, '0')}`,
      email: `${name.split(' ')[0].toLowerCase()}@exemplo.com`,
      total: numbers.length * campaign.pricePerNumber,
      status: 'pago',
      createdAt: created,
      expiresAt: created,
      paidAt: created,
      pixCode: makePixCode(numbers.length * campaign.pricePerNumber),
    })
  }
  return orders
}

function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function initialDB(): DB {
  const rng = mulberry32(42)
  const campaigns: Campaign[] = [
    {
      id: 'moto-160',
      title: 'Moto 0 km 160cc',
      description:
        'Uma moto zero quilômetro, com documentação e emplacamento pagos. Retirada na loja parceira ou entrega na sua cidade.',
      emoji: '🏍️',
      accent: '#cfe9dc',
      pricePerNumber: 2.5,
      totalNumbers: 300,
      drawDate: days(12),
      status: 'ativa',
      createdAt: days(-8),
    },
    {
      id: 'kit-ferramentas',
      title: 'Kit de ferramentas profissional',
      description:
        'Parafusadeira, furadeira de impacto, esmerilhadeira e maleta com 120 peças. Ideal para quem trabalha com obra ou manutenção.',
      emoji: '🧰',
      accent: '#fde7b0',
      pricePerNumber: 1,
      totalNumbers: 100,
      drawDate: days(4),
      status: 'ativa',
      createdAt: days(-5),
    },
    {
      id: 'iphone',
      title: 'Smartphone topo de linha 256 GB',
      description: 'Aparelho lacrado, com nota fiscal e garantia de 1 ano.',
      emoji: '📱',
      accent: '#f9d3c8',
      pricePerNumber: 5,
      totalNumbers: 200,
      drawDate: days(-2),
      status: 'encerrada',
      createdAt: days(-20),
      autoDraw: true,
    },
  ]
  const orders = [
    ...seedOrders(campaigns[0], 0.46, rng),
    ...seedOrders(campaigns[1], 0.78, rng),
    ...seedOrders(campaigns[2], 1, rng),
  ]
  return { campaigns, orders }
}

/* ---------- store reativa simples sobre localStorage ---------- */

let db: DB = load()
const listeners = new Set<() => void>()

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as DB
  } catch {
    /* localStorage indisponível */
  }
  const fresh = initialDB()
  persist(fresh)
  return fresh
}

function persist(next: DB) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* ignora */
  }
}

function set(updater: (d: DB) => DB) {
  db = updater(db)
  persist(db)
  listeners.forEach((l) => l())
}

export function useDB(): DB {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => db,
  )
}

/* ---------- regras de negócio ---------- */

export function expireReservations() {
  const now = Date.now()
  if (!db.orders.some((o) => o.status === 'reservado' && new Date(o.expiresAt).getTime() < now)) return
  set((d) => ({
    ...d,
    orders: d.orders.map((o) =>
      o.status === 'reservado' && new Date(o.expiresAt).getTime() < now ? { ...o, status: 'expirado' } : o,
    ),
  }))
}

export function numberStatus(d: DB, campaignId: string) {
  const map = new Map<number, 'reservado' | 'pago'>()
  for (const o of d.orders) {
    if (o.campaignId !== campaignId || o.status === 'expirado') continue
    for (const n of o.numbers) map.set(n, o.status)
  }
  return map
}

export function campaignStats(d: DB, c: Campaign) {
  const map = numberStatus(d, c.id)
  let paid = 0
  let reserved = 0
  map.forEach((s) => (s === 'pago' ? paid++ : reserved++))
  return {
    paid,
    reserved,
    free: c.totalNumbers - paid - reserved,
    revenue: paid * c.pricePerNumber,
    percent: Math.round(((paid + reserved) / c.totalNumbers) * 100),
  }
}

export function makePixCode(total: number) {
  // Código "copia e cola" fictício no formato EMV — apenas para demonstração
  const value = total.toFixed(2)
  const txid = uid().toUpperCase()
  return `00020126580014BR.GOV.BCB.PIX0136demo-sorteia-chave-aleatoria5204000053039865406${value.length
    .toString()
    .padStart(2, '0')}${value}5802BR5907SORTEIA6009SAO PAULO62${(txid.length + 4).toString().padStart(2, '0')}05${txid.length
    .toString()
    .padStart(2, '0')}${txid}6304DEMO`
}

export class NumbersTakenError extends Error {
  numbers: number[]
  constructor(numbers: number[]) {
    super('Alguns números já foram reservados por outra pessoa.')
    this.numbers = numbers
  }
}

export function createOrder(input: {
  campaignId: string
  numbers: number[]
  name: string
  phone: string
  email: string
}): Order {
  expireReservations()
  const campaign = db.campaigns.find((c) => c.id === input.campaignId)
  if (!campaign || campaign.status !== 'ativa') throw new Error('Esta campanha não está mais recebendo participações.')
  const taken = numberStatus(db, campaign.id)
  const conflict = input.numbers.filter((n) => taken.has(n))
  if (conflict.length) throw new NumbersTakenError(conflict)

  const now = new Date()
  const total = input.numbers.length * campaign.pricePerNumber
  const order: Order = {
    id: uid(),
    campaignId: campaign.id,
    numbers: [...input.numbers].sort((a, b) => a - b),
    name: input.name.trim(),
    phone: onlyDigits(input.phone),
    email: input.email.trim(),
    total,
    status: 'reservado',
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + RESERVATION_MINUTES * 60_000).toISOString(),
    pixCode: makePixCode(total),
  }
  set((d) => ({ ...d, orders: [order, ...d.orders] }))
  return order
}

export function markPaid(orderId: string) {
  set((d) => ({
    ...d,
    orders: d.orders.map((o) =>
      o.id === orderId && o.status === 'reservado' ? { ...o, status: 'pago', paidAt: new Date().toISOString() } : o,
    ),
  }))
}

export function cancelOrder(orderId: string) {
  set((d) => ({
    ...d,
    orders: d.orders.map((o) => (o.id === orderId && o.status === 'reservado' ? { ...o, status: 'expirado' } : o)),
  }))
}

export function upsertCampaign(c: Campaign) {
  set((d) => {
    const exists = d.campaigns.some((x) => x.id === c.id)
    return { ...d, campaigns: exists ? d.campaigns.map((x) => (x.id === c.id ? c : x)) : [c, ...d.campaigns] }
  })
}

export function setCampaignStatus(id: string, status: Campaign['status']) {
  set((d) => ({ ...d, campaigns: d.campaigns.map((c) => (c.id === id ? { ...c, status } : c)) }))
}

export function slugify(s: string) {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 40) || uid()
  )
}

/**
 * Sorteio auditável: o ganhador é definido por SHA-256(semente + lista de números pagos).
 * Qualquer pessoa com a semente e a lista consegue refazer a conta e chegar ao mesmo número.
 */
export async function computeWinner(seed: string, paidNumbers: number[]) {
  const sorted = [...paidNumbers].sort((a, b) => a - b)
  const payload = `${seed}:${sorted.join(',')}`
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload))
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  const index = Number(BigInt('0x' + hex.slice(0, 15)) % BigInt(sorted.length))
  return { number: sorted[index], hash: hex, index }
}

export function randomSeed() {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function drawCampaign(id: string, drawnAt = new Date().toISOString()) {
  const c = db.campaigns.find((x) => x.id === id)
  if (!c) throw new Error('Campanha não encontrada')
  const paidOrders = db.orders.filter((o) => o.campaignId === id && o.status === 'pago')
  const paidNumbers = paidOrders.flatMap((o) => o.numbers)
  if (!paidNumbers.length) throw new Error('Nenhum número pago para sortear.')
  const seed = randomSeed()
  const result = await computeWinner(seed, paidNumbers)
  const owner = paidOrders.find((o) => o.numbers.includes(result.number))!
  const winner = { number: result.number, name: owner.name, phone: owner.phone, drawnAt, seed }
  set((d) => ({
    ...d,
    campaigns: d.campaigns.map((x) => (x.id === id ? { ...x, status: 'sorteada', winner } : x)),
    orders: d.orders.map((o) => (o.campaignId === id && o.status === 'reservado' ? { ...o, status: 'expirado' } : o)),
  }))
  return { ...result, winner, pool: paidNumbers.length }
}

/** Campanhas de demonstração com data passada são sorteadas automaticamente (mesmo algoritmo real) */
let autoDrawing = false
export async function runAutoDraws() {
  if (autoDrawing) return
  autoDrawing = true
  try {
    await autoDrawAll()
  } finally {
    autoDrawing = false
  }
}

async function autoDrawAll() {
  for (const c of db.campaigns) {
    if (c.autoDraw && c.status === 'encerrada' && !c.winner && new Date(c.drawDate).getTime() < Date.now()) {
      await drawCampaign(c.id, c.drawDate)
    }
  }
}

export function resetDemo() {
  set(() => initialDB())
  void runAutoDraws()
}
