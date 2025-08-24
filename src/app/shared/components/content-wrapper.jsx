import { SiteHeader } from "@/app/shared/components/site-header";
import { useAuth } from "@/auth/context/AuthProvider";
import { SidebarInset } from "@/core/components/ui/sidebar";

export function ContentWrapper({ children }) {
  const { userRole } = useAuth();

  return (
    <>
      {userRole === "patient" ? (
        <SidebarInset className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto bg-background">
            <div className="mx-auto max-w-7xl space-y-6 p-6 animate-fadeIn">
              {children}
            </div>
          </main>
        </SidebarInset>
      ) : (
        <>
          <SidebarInset className="flex flex-1 flex-col overflow-hidden">
            <SiteHeader />
            <main className="flex-1 overflow-y-auto bg-background">
              <div className="mx-auto max-w-7xl space-y-6 p-6 animate-fadeIn">
                {children}
              </div>
            </main>
          </SidebarInset>
        </>
      )}
    </>
  );
}
