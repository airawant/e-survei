"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import { Session, User } from "@supabase/supabase-js"
import { supabaseClient } from "@/lib/supabase/client"

// Tipe untuk data admin dari tabel admin_users
interface AdminUser {
  id: string
  email: string
  full_name?: string
  role: string
  created_at: string
}

// Tipe untuk konteks autentikasi admin
interface AdminAuthContextType {
  user: User | null
  adminData: AdminUser | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

// Membuat konteks
const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

// Hook untuk menggunakan konteks
export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider")
  }
  return context
}

// Provider konteks
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [adminData, setAdminData] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)

  const router = useRouter()
  const pathname = usePathname()

  // Effect untuk memeriksa dan memperbarui sesi
  useEffect(() => {
    const setupAuth = async () => {
      try {
        setIsLoading(true)

        // Dapatkan sesi saat ini
        const { data: { session: currentSession }, error: sessionError } = await supabaseClient.auth.getSession()

        if (sessionError) {
          console.error("Error getting session:", sessionError)
          return
        }

        setSession(currentSession)

        if (currentSession?.user) {
          setUser(currentSession.user)

          // Cek apakah user adalah admin
          const { data: adminUserData, error: adminError } = await supabaseClient
            .from("admin_users")
            .select("*")
            .eq("id", currentSession.user.id)
            .single()

          if (adminError) {
            console.error("Error fetching admin data:", adminError)
            // Jika bukan admin dan mencoba mengakses halaman admin (kecuali login)
            if (pathname?.startsWith("/admin") && pathname !== "/admin/login") {
              router.push("/admin/login")
            }
            return
          }

          setAdminData(adminUserData as AdminUser)
        } else if (pathname?.startsWith("/admin") && pathname !== "/admin/login") {
          // Redirect ke halaman login jika tidak ada sesi dan mencoba mengakses halaman admin
          router.push("/admin/login")
        }
      } catch (error) {
        console.error("Auth setup error:", error)
      } finally {
        setIsLoading(false)
      }
    }

    setupAuth()

    // Listener untuk perubahan autentikasi
    const { data: authListener } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event)
      setSession(session)
      setUser(session?.user || null)

      if (session?.user) {
        try {
          // Periksa apakah pengguna adalah admin
          const { data: adminUserData, error: adminError } = await supabaseClient
            .from("admin_users")
            .select("*")
            .eq("id", session.user.id)
            .single()

          if (adminError) {
            console.error("Error fetching admin data:", adminError)
            setAdminData(null)

            // Jika bukan admin dan mencoba mengakses halaman admin
            if (pathname?.startsWith("/admin") && pathname !== "/admin/login") {
              router.push("/admin/login")
            }
            return
          }

          setAdminData(adminUserData as AdminUser)
        } catch (error) {
          console.error("Error checking admin status:", error)
        }
      } else {
        setAdminData(null)

        // Redirect ke login jika tidak ada sesi
        if (pathname?.startsWith("/admin") && pathname !== "/admin/login") {
          router.push("/admin/login")
        }
      }
    })

    // Cleanup function
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [pathname, router])

  // Fungsi untuk login
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true)

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      if (!data.user) {
        throw new Error("Gagal mendapatkan data pengguna")
      }

      // Periksa apakah pengguna adalah admin
      const { data: adminUserData, error: adminError } = await supabaseClient
        .from("admin_users")
        .select("*")
        .eq("id", data.user.id)
        .single()

      if (adminError || !adminUserData) {
        // Logout karena bukan admin
        await supabaseClient.auth.signOut()
        throw new Error("Akun Anda tidak memiliki izin admin")
      }

      setAdminData(adminUserData as AdminUser)
      setUser(data.user)
      setSession(data.session)

      router.push("/admin/manage")
      toast.success("Berhasil masuk")
    } catch (error: any) {
      console.error("Login error:", error)
      toast.error(error.message || "Terjadi kesalahan saat login")
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Fungsi untuk logout
  const signOut = async () => {
    try {
      setIsLoading(true)

      await supabaseClient.auth.signOut()

      setUser(null)
      setAdminData(null)
      setSession(null)

      router.push("/admin/login")
      toast.success("Berhasil keluar")
    } catch (error: any) {
      console.error("Logout error:", error)
      toast.error("Terjadi kesalahan saat logout")
    } finally {
      setIsLoading(false)
    }
  }

  // Nilai yang akan disediakan oleh konteks
  const value = {
    user,
    adminData,
    isLoading,
    isAuthenticated: !!user && !!adminData,
    signIn,
    signOut,
  }

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}
