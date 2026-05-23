export const USER_ROLES = Object.freeze({
  STUDENT: "student",
  MODERATOR: "moderator",
  ADMIN: "admin"
});

export const USER_ROLE_VALUES = Object.freeze(Object.values(USER_ROLES));

export const ROLE_GROUPS = Object.freeze({
  ADMINISTRATORS: [USER_ROLES.ADMIN],
  EDITORS: [USER_ROLES.ADMIN, USER_ROLES.MODERATOR],
  READERS: [USER_ROLES.ADMIN, USER_ROLES.MODERATOR, USER_ROLES.STUDENT]
});
