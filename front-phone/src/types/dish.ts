export type Quadrant = 'star' | 'cashCow' | 'question' | 'dog'

export interface DishItem {
  id: string
  name: string
  sales: number
  grossMargin: number
  quadrant: Quadrant
}

export interface DishQuadrantData {
  dishes: DishItem[]
  suggestions: string[]
}
