import { createHash } from 'node:crypto';

/**
 * Hash an IP address into an opaque, non-reversible identifier.
 * Salted with ANALYTICS_IP_SALT so the same IP across deployments cannot
 * be correlated, and IPs cannot be brute-forced from a leaked database.
 *
 * @returns 16-char hex prefix of sha256(ip + salt)
 */
export function hashIp(ip: string): string {
  if (!ip || typeof ip !== 'string') return 'unknown';
  const salt = process.env.ANALYTICS_IP_SALT || 'portfolio-default-salt-change-me';
  return createHash('sha256').update(`${ip}::${salt}`).digest('hex').slice(0, 16);
}
