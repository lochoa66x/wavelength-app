export const INVALID_ACCOUNT_SESSION_MESSAGE =
  "Your account session could not be verified. Public job search is still available.";

export async function loadVerifiedAuthSession(authClient) {
  const { data: claimsData, error: claimsError } = await authClient.getClaims();
  const claims = claimsData?.claims;

  if (claimsError || !claims?.sub) {
    return { session: null, error: "" };
  }

  const { data: sessionData, error: sessionError } = await authClient.getSession();
  const session = sessionData?.session || null;

  if (sessionError || session?.user?.id !== claims.sub) {
    return { session: null, error: INVALID_ACCOUNT_SESSION_MESSAGE };
  }

  return { session, error: "" };
}
