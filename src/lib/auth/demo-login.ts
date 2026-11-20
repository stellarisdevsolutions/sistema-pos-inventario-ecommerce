const demoAccounts = new Map([
  ["admin@aurastudio.com", "$2b$10$hashedpasswordforadminaurastudio"],
  ["supervisor@aurastudio.com", "$2b$10$hashedpasswordforsupervisor"],
  ["cajera@aurastudio.com", "$2b$10$hashedpasswordforcashier"],
  ["almacen@aurastudio.com", "$2b$10$hashedpasswordforwarehouse"],
]);

export function isDemoLoginEnabled(): boolean {
  return process.env.NODE_ENV === "development" && process.env.ENABLE_DEMO_LOGIN === "1";
}

export const demoSupervisorEmails = ["admin@aurastudio.com", "supervisor@aurastudio.com"];

export function verifyDemoLogin(email: string, password: string, storedHash: string): boolean {
  return isDemoLoginEnabled() &&
    password === "password123" &&
    demoAccounts.get(email) === storedHash;
}
