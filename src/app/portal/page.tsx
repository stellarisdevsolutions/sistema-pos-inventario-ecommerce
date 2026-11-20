import { getDemoLoginOptions } from "@/lib/auth/demo-login";
import { PortalLoginForm } from "./login-form";

export default function PortalLoginPage() {
  return <PortalLoginForm demo={getDemoLoginOptions()} />;
}
