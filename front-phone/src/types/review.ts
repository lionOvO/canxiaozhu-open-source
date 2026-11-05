export type ReviewPlatform = 'meituan' | 'eleme' | 'douyin' | 'dianping' | 'all'

export interface ReviewItem {
  id: string
  platform: Exclude<ReviewPlatform, 'all'>
  rating: number
  content: string
  time: string
  tags: string[]
  isNegative: boolean
  aiReply?: string
}

export interface ReviewData {
  platforms: { key: ReviewPlatform; label: string }[]
  reviews: ReviewItem[]
}
