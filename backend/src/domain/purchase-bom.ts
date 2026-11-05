export interface PurchaseIngredientRule {
  ingredient: string
  unit: string
  unitPrice: number
  supplier: string
  supplierOptions: string[]
  usagePerDish: number
}

export const PURCHASE_BOM: Record<string, PurchaseIngredientRule[]> = {
  招牌牛肉饭: [
    { ingredient: '牛肉', unit: 'kg', unitPrice: 38, supplier: '鲜肉供应商', supplierOptions: ['鲜肉供应商', '优选食材'], usagePerDish: 0.18 },
    { ingredient: '大米', unit: 'kg', unitPrice: 3.5, supplier: '粮油供应商', supplierOptions: ['粮油供应商', '优选食材'], usagePerDish: 0.16 },
    { ingredient: '青菜', unit: 'kg', unitPrice: 5, supplier: '蔬菜供应商', supplierOptions: ['蔬菜供应商', '优选食材'], usagePerDish: 0.08 },
  ],
  酸菜鱼单人餐: [
    { ingredient: '鱼片', unit: 'kg', unitPrice: 28, supplier: '鲜鱼供应商', supplierOptions: ['鲜鱼供应商', '优选食材'], usagePerDish: 0.25 },
    { ingredient: '酸菜', unit: 'kg', unitPrice: 5, supplier: '调味供应商', supplierOptions: ['调味供应商', '优选食材'], usagePerDish: 0.12 },
    { ingredient: '大米', unit: 'kg', unitPrice: 3.5, supplier: '粮油供应商', supplierOptions: ['粮油供应商', '优选食材'], usagePerDish: 0.14 },
  ],
  番茄鸡蛋盖饭: [
    { ingredient: '番茄', unit: 'kg', unitPrice: 6, supplier: '蔬菜供应商', supplierOptions: ['蔬菜供应商', '优选食材'], usagePerDish: 0.18 },
    { ingredient: '鸡蛋', unit: '个', unitPrice: 0.9, supplier: '蛋品供应商', supplierOptions: ['蛋品供应商', '优选食材'], usagePerDish: 2 },
    { ingredient: '大米', unit: 'kg', unitPrice: 3.5, supplier: '粮油供应商', supplierOptions: ['粮油供应商', '优选食材'], usagePerDish: 0.14 },
  ],
  凉拌黄瓜: [
    { ingredient: '黄瓜', unit: 'kg', unitPrice: 4.8, supplier: '蔬菜供应商', supplierOptions: ['蔬菜供应商', '优选食材'], usagePerDish: 0.25 },
  ],
  酸梅汤: [
    { ingredient: '酸梅汤原液', unit: '桶', unitPrice: 21, supplier: '饮品供应商', supplierOptions: ['饮品供应商', '优选食材'], usagePerDish: 0.12 },
  ],
}

export const PURCHASE_INGREDIENTS = Object.values(PURCHASE_BOM)
  .flat()
  .reduce<PurchaseIngredientRule[]>((rules, rule) => {
    if (!rules.some((item) => item.ingredient === rule.ingredient)) {
      rules.push(rule)
    }
    return rules
  }, [])
