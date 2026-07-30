export type AccessControlState = "open" | "protected" | "misconfigured";
type Environment = Readonly<Record<string, string | undefined>>;

const EXTERNAL_SECRET_KEYS = [
  "HOSTINGER_API_TOKEN",
  "CLOUDFLARE_API_TOKEN",
  "PORKBUN_API_KEY",
  "PORKBUN_SECRET_API_KEY",
  "NAMECHEAP_API_KEY",
  "OPENROUTER_API_KEY"
] as const;

export function accessControlState(
  environment: Environment = process.env
): AccessControlState {
  const username = environment.APP_ACCESS_USERNAME?.trim() ?? "";
  const password = environment.APP_ACCESS_PASSWORD ?? "";
  if (username && password) return "protected";

  const hasPartialAccessConfig = Boolean(username || password);
  const hasExternalSecrets = EXTERNAL_SECRET_KEYS.some((key) =>
    Boolean(environment[key]?.trim())
  );
  if (
    hasPartialAccessConfig ||
    (environment.NODE_ENV === "production" && hasExternalSecrets)
  ) {
    return "misconfigured";
  }
  return "open";
}

function constantTimeEqual(left: string, right: string): boolean {
  const length = Math.max(left.length, right.length);
  let difference = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

export function isAuthorizedBasicRequest(
  authorization: string | null,
  environment: Environment = process.env
): boolean {
  if (!authorization?.startsWith("Basic ")) return false;
  try {
    const decoded = atob(authorization.slice(6));
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;
    const username = decoded.slice(0, separator);
    const password = decoded.slice(separator + 1);
    return (
      constantTimeEqual(username, environment.APP_ACCESS_USERNAME ?? "") &&
      constantTimeEqual(password, environment.APP_ACCESS_PASSWORD ?? "")
    );
  } catch {
    return false;
  }
}
