/**
 * Privacy utilities for protecting user PII throughout the application.
 *
 * Key principles:
 * - NEVER expose email addresses in public UI or APIs
 * - Mask emails even in admin views for enhanced privacy
 * - Use screen_name or anonymous fallback for all public displays
 * - Strip sensitive fields (is_admin, webauthn_user_id, last_login, status) from public responses
 */

import type { User } from "@/types/database";

/**
 * Public-safe user data type - only includes fields safe for public exposure
 */
export interface PublicUser {
  id: string;
  screen_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Generate anonymous display name from user ID
 * Format: "Player #XXXXX" using last 5 characters of UUID
 *
 * @example
 * generateAnonymousName("123e4567-e89b-12d3-a456-426614174000") // "Player #74000"
 */
export function generateAnonymousName(userId: string): string {
  const idSuffix = userId.slice(-5).toUpperCase();
  return `Player #${idSuffix}`;
}

/**
 * Get public-safe display name for a user
 * Returns screen_name if set, otherwise generates anonymous name
 * NEVER returns email address
 *
 * @example
 * getPublicUserDisplay({ id: "abc123", screen_name: "JohnDoe" }) // "JohnDoe"
 * getPublicUserDisplay({ id: "abc123", screen_name: null }) // "Player #BC123"
 */
export function getPublicUserDisplay(user: Pick<User, "id" | "screen_name">): string {
  if (user.screen_name) {
    return user.screen_name;
  }
  return generateAnonymousName(user.id);
}

/**
 * Get initials for avatar display
 * Uses first letter of screen_name if available, otherwise "P" for Player
 * NEVER uses email address
 *
 * @example
 * getPublicUserInitials({ id: "abc", screen_name: "John Doe" }) // "J"
 * getPublicUserInitials({ id: "abc", screen_name: null }) // "P"
 */
export function getPublicUserInitials(user: Pick<User, "id" | "screen_name">): string {
  if (user.screen_name && user.screen_name.length > 0) {
    return user.screen_name[0].toUpperCase();
  }
  return "P"; // P for Player
}

/**
 * Mask email address for privacy
 * Shows first 1-2 characters + "***" + full domain
 * Used in admin views and user's own profile
 *
 * @example
 * maskEmail("john@example.com") // "jo***@example.com"
 * maskEmail("j@example.com") // "j***@example.com"
 * maskEmail("john.doe@company.co.uk") // "jo***@company.co.uk"
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return "***@***"; // Fallback for invalid email format
  }

  // Show first 1-2 characters based on length
  const visibleChars = localPart.length === 1 ? 1 : 2;
  const maskedLocal = localPart.slice(0, visibleChars) + "***";

  return `${maskedLocal}@${domain}`;
}

/**
 * Create public-safe user object by removing all sensitive fields
 * Explicitly strips: email, is_admin, webauthn_user_id, last_login, status
 *
 * Use this when returning user data from public APIs or displaying in public UI
 *
 * @example
 * const publicUser = sanitizeUserForPublic(fullUser);
 * // Returns only: id, screen_name, avatar_url, created_at, updated_at
 */
export function sanitizeUserForPublic(user: User): PublicUser {
  return {
    id: user.id,
    screen_name: user.screen_name,
    avatar_url: user.avatar_url,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}
