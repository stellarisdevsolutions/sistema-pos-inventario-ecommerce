const demoPassword = "password123";
const demoAccounts = [
  { label: "Administrador", email: "admin@aurastudio.com", legacyHash: "$2b$10$hashedpasswordforadminaurastudio" },
  { label: "Supervisor", email: "supervisor@aurastudio.com", legacyHash: "$2b$10$hashedpasswordforsupervisor" },
  { label: "Cajera", email: "cajera@aurastudio.com", legacyHash: "$2b$10$hashedpasswordforcashier" },
  { label: "Almacenero", email: "almacen@aurastudio.com", legacyHash: "$2b$10$hashedpasswordforwarehouse" },
];

export function isDemoLoginEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.ENABLE_DEMO_LOGIN === "1";
}

export const demoSupervisorEmails = [demoAccounts[0].email, demoAccounts[1].email];

export function getDemoLoginOptions() {
  if (!isDemoLoginEnabled()) return null;

  return {
    password: demoPassword,
    accounts: demoAccounts.map(({ label, email }) => ({ label, email })),
  };
}

export function verifyDemoLogin(email: string, password: string, storedHash: string): boolean {
  return isDemoLoginEnabled() &&
    password === demoPassword &&
    demoAccounts.some((account) => account.email === email && account.legacyHash === storedHash);
}
