export type CampaignStatus = 'ativa' | 'encerrada' | 'sorteada'

export interface Campaign {
  id: string
  title: string
  description: string
  emoji: string
  /** cor de fundo do card do prêmio */
  accent: string
  pricePerNumber: number
  totalNumbers: number
  drawDate: string // ISO
  status: CampaignStatus
  createdAt: string
  /** usado só nas campanhas de demonstração */
  autoDraw?: boolean
  winner?: {
    number: number
    name: string
    phone: string
    drawnAt: string
    seed: string
  }
}

export type OrderStatus = 'reservado' | 'pago' | 'expirado'

export interface Order {
  id: string
  campaignId: string
  numbers: number[]
  name: string
  phone: string
  email: string
  total: number
  status: OrderStatus
  createdAt: string
  expiresAt: string
  paidAt?: string
  pixCode: string
}

export interface DB {
  campaigns: Campaign[]
  orders: Order[]
}
