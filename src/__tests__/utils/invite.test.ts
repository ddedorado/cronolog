import { describe, it, expect, vi } from 'vitest'

describe('invite code validation', () => {
  it('validates correct codes (case-insensitive)', async () => {
    vi.stubEnv('VITE_INVITE_CODES', 'ABC123,BETA-ACCESS')
    // Re-import to pick up the new env
    vi.resetModules()
    const { validateInviteCode, isInviteOnly } = await import('@/utils/invite')

    expect(isInviteOnly()).toBe(true)
    expect(validateInviteCode('ABC123')).toBe(true)
    expect(validateInviteCode('abc123')).toBe(true)
    expect(validateInviteCode('BETA-ACCESS')).toBe(true)
    expect(validateInviteCode('beta-access')).toBe(true)
    vi.unstubAllEnvs()
  })

  it('rejects invalid codes', async () => {
    vi.stubEnv('VITE_INVITE_CODES', 'ABC123,BETA-ACCESS')
    vi.resetModules()
    const { validateInviteCode } = await import('@/utils/invite')

    expect(validateInviteCode('WRONG')).toBe(false)
    expect(validateInviteCode('')).toBe(false)
    expect(validateInviteCode('ABC12')).toBe(false)
    vi.unstubAllEnvs()
  })

  it('allows all when no codes configured', async () => {
    vi.stubEnv('VITE_INVITE_CODES', '')
    vi.resetModules()
    const { validateInviteCode, isInviteOnly } = await import('@/utils/invite')

    expect(isInviteOnly()).toBe(false)
    expect(validateInviteCode('anything')).toBe(true)
    vi.unstubAllEnvs()
  })

  it('trims whitespace from codes', async () => {
    vi.stubEnv('VITE_INVITE_CODES', ' CODE1 , CODE2 ')
    vi.resetModules()
    const { validateInviteCode } = await import('@/utils/invite')

    expect(validateInviteCode('CODE1')).toBe(true)
    expect(validateInviteCode(' CODE2 ')).toBe(true)
    vi.unstubAllEnvs()
  })
})
