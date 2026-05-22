export const USER_ROLES = ["customer", "venueOwner", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export function isAdminRole(role: string | null | undefined): role is "admin" {
  return role === "admin";
}

export function roleDisplayName(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "venueOwner":
      return "Venue Owner";
    case "customer":
      return "Customer";
  }
}
