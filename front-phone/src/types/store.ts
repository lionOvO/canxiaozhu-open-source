export interface StoreRankItem {
  id: string
  name: string
  revenue: number
  profit: number
  orders: number
  abnormal: boolean
}

export interface MultiStoreData {
  stores: StoreRankItem[]
}
