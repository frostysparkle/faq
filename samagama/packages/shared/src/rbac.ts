import type { UserRole } from "./types.js";

const roleRank: Record<UserRole, number> = {
  student: 1,
  moderator: 2,
  admin: 3
};

export function hasAnyRole(role: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(role);
}

export function hasMinimumRole(role: UserRole, minimumRole: UserRole): boolean {
  return roleRank[role] >= roleRank[minimumRole];
}

export function canModerate(role: UserRole): boolean {
  return hasMinimumRole(role, "moderator");
}

export function canAdminister(role: UserRole): boolean {
  return role === "admin";
}
