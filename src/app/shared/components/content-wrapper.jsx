import { SidebarInset } from "@/core/components/ui/sidebar";

export function ContentWrapper({ children }) {
  return (
    <SidebarInset className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-7xl space-y-6 p-6 animate-fadeIn">
          {children}
        </div>
      </main>
    </SidebarInset>
  );
}
