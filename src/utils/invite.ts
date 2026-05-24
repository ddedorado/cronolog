import { functions } from '@/lib/firebase'
import { httpsCallable } from 'firebase/functions'

// ── Types ────────────────────────────────────────────────
export interface InviteResult {
  valid: boolean
  reason?: 'invalid' | 'exhausted' | 'expired'
  remaining?: number
}

// ── Feature flag ─────────────────────────────────────────
const inviteCodesEnv = (import.meta.env.VITE_INVITE_CODES ?? '').trim()

export function isInviteOnly(): boolean {
  return inviteCodesEnv.length > 0
}

// ── Validate (read-only, for live feedback while typing) ─
export async function validateInviteCode(code: string): Promise<InviteResult> {
  const trimmed = code.trim()
  if (!trimmed) return { valid: false, reason: 'invalid' }

  try {
    const validateFn = httpsCallable<{ code: string }, InviteResult>(functions, 'validateInviteCode')
    const result = await validateFn({ code: trimmed })
    return result.data
  } catch (err) {
    console.error('validateInviteCode error', err)
    return { valid: false, reason: 'invalid' }
  }
}

// ── Redeem (atomic consume, call on registration submit) ─
export async function redeemInviteCode(code: string): Promise<InviteResult> {
  const trimmed = code.trim()
  if (!trimmed) return { valid: false, reason: 'invalid' }

  try {
    const redeemFn = httpsCallable<{ code: string }, InviteResult>(functions, 'redeemInviteCode')
    const result = await redeemFn({ code: trimmed })
    return result.data
  } catch (err) {
    console.error('redeemInviteCode error', err)
    return { valid: false, reason: 'invalid' }
  }
}
