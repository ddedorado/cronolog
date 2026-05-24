import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock firebase functions before importing the module under test
const callableMock = vi.fn()
vi.mock('firebase/functions', () => ({
  httpsCallable: () => callableMock,
}))
vi.mock('@/lib/firebase', () => ({
  functions: {},
}))

describe('invite code validation', () => {
  beforeEach(() => {
    vi.resetModules()
    callableMock.mockReset()
  })

  it('validates correct codes via Cloud Function', async () => {
    vi.stubEnv('VITE_INVITE_CODES', 'CRONOLOG2026')
    vi.resetModules()
    callableMock.mockResolvedValue({ data: { valid: true, remaining: 5 } })

    const { validateInviteCode, isInviteOnly } = await import('@/utils/invite')

    expect(isInviteOnly()).toBe(true)
    const result = await validateInviteCode('ABC123')
    expect(callableMock).toHaveBeenCalledWith({ code: 'ABC123' })
    expect(result.valid).toBe(true)
    expect(result.remaining).toBe(5)
    vi.unstubAllEnvs()
  })

  it('returns invalid for unknown codes', async () => {
    vi.stubEnv('VITE_INVITE_CODES', 'CRONOLOG2026')
    vi.resetModules()
    callableMock.mockResolvedValue({ data: { valid: false, reason: 'invalid' } })

    const { validateInviteCode } = await import('@/utils/invite')

    const result = await validateInviteCode('WRONG')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('invalid')
    vi.unstubAllEnvs()
  })

  it('returns exhausted when code has no remaining uses', async () => {
    vi.stubEnv('VITE_INVITE_CODES', 'CRONOLOG2026')
    vi.resetModules()
    callableMock.mockResolvedValue({ data: { valid: false, reason: 'exhausted' } })

    const { validateInviteCode } = await import('@/utils/invite')

    const result = await validateInviteCode('USED-UP')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('exhausted')
    vi.unstubAllEnvs()
  })

  it('redeems a code atomically', async () => {
    vi.stubEnv('VITE_INVITE_CODES', 'CRONOLOG2026')
    vi.resetModules()
    callableMock.mockResolvedValue({ data: { valid: true, remaining: 4 } })

    const { redeemInviteCode } = await import('@/utils/invite')

    const result = await redeemInviteCode('ABC123')
    expect(callableMock).toHaveBeenCalledWith({ code: 'ABC123' })
    expect(result.valid).toBe(true)
    expect(result.remaining).toBe(4)
    vi.unstubAllEnvs()
  })

  it('handles Cloud Function errors gracefully', async () => {
    vi.stubEnv('VITE_INVITE_CODES', 'CRONOLOG2026')
    vi.resetModules()
    callableMock.mockRejectedValue(new Error('network error'))

    const { validateInviteCode } = await import('@/utils/invite')

    const result = await validateInviteCode('ABC123')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('invalid')
    vi.unstubAllEnvs()
  })

  it('returns invalid for empty code without calling Cloud Function', async () => {
    vi.stubEnv('VITE_INVITE_CODES', 'CRONOLOG2026')
    vi.resetModules()

    const { validateInviteCode } = await import('@/utils/invite')

    const result = await validateInviteCode('  ')
    expect(callableMock).not.toHaveBeenCalled()
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
