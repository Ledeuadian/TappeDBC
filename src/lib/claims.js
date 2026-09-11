import { supabase } from './supabase.js'

/**
 * Claim-code redemption — QR/card-based account verification.
 *
 * A physical Tappe card ships with a QR containing /claim/<code>.
 * Flow:
 *   1. lookupClaim(code)   — anyone can check a code (anon-safe)
 *   2. redeemClaim(code)   — logged-in user claims it; DB trigger flips
 *                            profiles.is_verified → true
 */

/** Look up a claim code without redeeming. Returns the row or null.
 *  Excludes claimed_by / claimed_at so anon callers can't enumerate
 *  which users own which codes. */
export async function lookupClaim(code) {
  const { data, error } = await supabase
    .from('card_claims')
    .select('code, card_id, expires_at')
    .eq('code', code)
    .maybeSingle()

  if (error) throw error
  return data
}

/**
 * Admin / staff only — generate a batch of fresh unused claim codes.
 * Requires profiles.is_admin = true. Throws 'Admin only' for anyone else.
 */
export async function generateClaimCodes(count = 50) {
  const { data, error } = await supabase.rpc('generate_claim_codes', { count })
  if (error) {
    const err = new Error(
      error.message === 'Admin only'
        ? 'You need admin privileges to generate claim codes.'
        : error.message,
    )
    err.code = error.code || 'RPC_ERROR'
    throw err
  }
  return data // array of { code }
}

/**
 * Redeem a claim code as the current signed-in user.
 * Returns { claimed: true, cardId } on success.
 * Throws Error with a friendly message on failure.
 */
export async function redeemClaim(code) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const err = new Error('Please sign in first to claim your card.')
    err.code = 'NOT_SIGNED_IN'
    throw err
  }

  // Atomic claim: only succeeds if still unclaimed and unexpired.
  // Use .maybeSingle() so a lost race (0 rows updated) returns null instead
  // of 406 Not Acceptable, which would surface as a misleading error.
  const { data, error } = await supabase
    .from('card_claims')
    .update({ claimed_by: user.id, claimed_at: new Date().toISOString() })
    .eq('code', code)
    .is('claimed_by', null)
    .gt('expires_at', new Date().toISOString())
    .select()
    .maybeSingle()

  if (error) {
    const err = new Error('This code is invalid, already claimed, or expired.')
    err.code = 'CLAIM_FAILED'
    throw err
  }
  if (!data) {
    // Lost race or no longer valid
    const err = new Error('This code is invalid, already claimed, or expired.')
    err.code = 'CLAIM_FAILED'
    throw err
  }

  return { claimed: true, cardId: data.card_id }
}
