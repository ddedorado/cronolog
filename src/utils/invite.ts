import { supabase } from '@/lib/supabase'

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

  const { data, error } = await supabase.rpc('validate_invite_code', {
    input_code: trimmed,
  })

  if (error) {
    console.error('validate_invite_code RPC error', error)
    return { valid: false, reason: 'invalid' }
  }

  return data as InviteResult
}

// ── Redeem (atomic consume, call on registration submit) ─
export async function redeemInviteCode(code: string): Promise<InviteResult> {
  const trimmed = code.trim()
  if (!trimmed) return { valid: false, reason: 'invalid' }

  const { data, error } = await supabase.rpc('redeem_invite_code', {
    input_code: trimmed,
  })

  if (error) {
    console.error('redeem_invite_code RPC error', error)
    return { valid: false, reason: 'invalid' }
  }

  return data as InviteResult
}
