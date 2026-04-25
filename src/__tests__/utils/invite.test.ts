import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing the module under test
const rpcMock = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: any[]) => rpcMock(...args) },
}))

describe('invite code validation', () => {
  beforeEach(() => {
    vi.resetModules()
    rpcMock.mockReset()
  })

  it('validates correct codes via Supabase RPC', async () => {
    vi.stubEnv('VITE_INVITE_CODES', 'CRONOLOG2026')
    vi.resetModules()
    rpcMock.mockResolvedValue({ data: { valid: true, remaining: 5 }, error: null })

    const { validateInviteCode, isInviteOnly } = await import('@/utils/invite')

    expect(isInviteOnly()).toBe(true)
    const result = await validateInviteCode('ABC123')
    expect(rpcMock).toHaveBeenCalledWith('validate_invite_code', { input_code: 'ABC123' })
    expect(result.valid).toBe(true)
    expect(result.remaining).toBe(5)
    vi.unstubAllEnvs()
  })

  it('returns invalid for unknown codes', async () => {
    vi.stubEnv('VITE_INVITE_CODES', 'CRONOLOG2026')
    vi.resetModules()
    rpcMock.mockResolvedValue({ data: { valid: false, reason: 'invalid' }, error: null })

    const { validateInviteCode } = await import('@/utils/invite')

    const result = await validateInviteCode('WRONG')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('invalid')
    vi.unstubAllEnvs()
  })

  it('returns exhausted when code has no remaining uses', async () => {
    vi.stubEnv('VITE_INVITE_CODES', 'CRONOLOG2026')
    vi.resetModules()
    rpcMock.mockResolvedValue({ data: { valid: false, reason: 'exhausted' }, error: null })

    const { validateInviteCode } = await import('@/utils/invite')

    const result = await validateInviteCode('USED-UP')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('exhausted')
    vi.unstubAllEnvs()
  })

  it('redeems a code atomically', async () => {
    vi.stubEnv('VITE_INVITE_CODES', 'CRONOLOG2026')
    vi.resetModules()
    rpcMock.mockResolvedValue({ data: { valid: true, remaining: 4 }, error: null })

    const { redeemInviteCode } = await import('@/utils/invite')

    const result = await redeemInviteCode('ABC123')
    expect(rpcMock).toHaveBeenCalledWith('redeem_invite_code', { input_code: 'ABC123' })
    expect(result.valid).toBe(true)
    expect(result.remaining).toBe(4)
    vi.unstubAllEnvs()
  })

  it('handles RPC errors gracefully', async () => {
    vi.stubEnv('VITE_INVITE_CODES', 'CRONOLOG2026')
    vi.resetModules()
    rpcMock.mockResolvedValue({ data: null, error: { message: 'network error' } })

    const { validateInviteCode } = await import('@/utils/invite')

    const result = await validateInviteCode('ABC123')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('invalid')
    vi.unstubAllEnvs()
  })

  it('returns invalid for empty code without calling RPC', async () => {
    vi.stubEnv('VITE_INVITE_CODES', 'CRONOLOG2026')
    vi.resetModules()

    const { validateInviteCode } = await import('@/utils/invite')

    const result = await validateInviteCode('  ')
    expect(rpcMock).not.toHaveBeenCalled()
    expect(result.valid).toBe(false)
    vi.unstubAllEnvs()
  })

  it('allows all when no codes configured', async () => {
    vi.stubEnv('VITE_INVITE_CODES', '')
    vi.resetModules()

    const { isInviteOnly } = await import('@/utils/invite')
    expect(isInviteOnly()).toBe(false)
    vi.unstubAllEnvs()
  })
})
