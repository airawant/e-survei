import type { Metadata } from "next"
import { Toaster } from "sonner"
import { AdminAuthProvider } from "@/context/AdminAuthContext"
import "../globals.css"

export const metadata: Metadata = {
  title: "Admin Panel - Survei Kemenag",
  description: "Panel admin untuk mengelola survei dan respons"
}

export default function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" suppressHydrationWarning={true}>
      <body suppressHydrationWarning={true}>
        <AdminAuthProvider>
          <Toaster richColors position="top-right" />
          {children}
        </AdminAuthProvider>
      </body>
    </html>
  )
}
