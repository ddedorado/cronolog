const INVITE_CODES: Set<string> = new Set(
  (import.meta.env.VITE_INVITE_CODES ?? '')
    .split(',')
    .map((c: string) => c.trim().toUpperCase())
    .filter(Boolean),
)

export function validateInviteCode(code: string): boolean {
  if (INVITE_CODES.size === 0) return true // No codes configured = open registration
  return INVITE_CODES.has(code.trim().toUpperCase())
}

export function isInviteOnly(): boolean {
  return INVITE_CODES.size > 0
}
