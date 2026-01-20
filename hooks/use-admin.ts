"use client";

import { User } from "@/types/database";

/**
 * Client-side hook to check if user is admin
 * User object must be passed from server component
 */
export function useAdmin(user: User | null) {
  return {
    isAdmin: user?.is_admin || false,
    user,
  };
}
