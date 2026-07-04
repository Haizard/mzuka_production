import { ClientMobileBottomNav } from "@/components/mobile-bottom-nav";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="lg:pb-0 mobile-content-pad">{children}</div>
      <ClientMobileBottomNav />
    </>
  );
}
