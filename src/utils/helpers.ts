export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDate().toString().padStart(2, '0')
  const month = d.toLocaleDateString('es-ES', { month: 'long' })
  const year = d.getFullYear()
  return `${day} ${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

const CATEGORY_COLORS = [
  '#3B82F6', '#22C55E', '#EAB308', '#F97316',
  '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6',
  '#6366F1', '#F59E0B', '#10B981', '#F43F5E',
]

export function nextCategoryColor(usedColors: string[]): string {
  const available = CATEGORY_COLORS.filter((c) => !usedColors.includes(c))
  return available[0] ?? CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)]
}
