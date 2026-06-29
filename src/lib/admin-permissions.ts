export function canManageEmployees(user: { role: string; staffRole: string | null }) {
  return user.role === "FOUNDER"
    || user.role === "ADMIN"
    || user.staffRole === "HUMAN_RESOURCE";
}
