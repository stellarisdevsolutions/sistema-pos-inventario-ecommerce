import { Suspense } from "react";
import { connection } from "next/server";
import { getDemoLoginOptions } from "@/lib/auth/demo-login";
import { PortalLoginForm } from "./login-form";

async function PortalLoginLoader() {
  await connection();
  return <PortalLoginForm demo={getDemoLoginOptions()} />;
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={null}>
      <PortalLoginLoader />
    </Suspense>
  );
}
