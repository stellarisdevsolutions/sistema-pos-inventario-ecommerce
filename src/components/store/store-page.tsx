import { StoreHeader } from "@/components/layout/store-header";
import { StoreFooter } from "@/components/layout/store-footer";
import { StoreMobileNav } from "@/components/layout/store-mobile-nav";
import { StoreCartSheet } from "@/components/layout/store-cart-sheet";

export function StorePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20 md:pb-0 flex flex-col font-store bg-store-bg text-store-ink">
      <StoreHeader />
      <main className="store-width flex-1 py-9 md:py-14">{children}</main>
      <StoreFooter />
      <StoreMobileNav />
      <StoreCartSheet />
    </div>
  );
}
