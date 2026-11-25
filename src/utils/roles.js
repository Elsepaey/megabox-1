// Backend staff roles (exact values). Both reach the /Owner dashboard; some
// actions are Owner-only on the server and hidden for Admin in the UI.
export const STAFF_ROLES = ['Owner', 'Admin'];

export const isStaffRole = (role) => STAFF_ROLES.includes(role);
