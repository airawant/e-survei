"use client"

import { useEffect } from "react"
import { redirect } from "next/navigation"
import { supabaseClient } from "@/lib/supabase/client"

export default function AdminPage() {
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession()

      if (session) {
        // Cek apakah user adalah admin
        const { data: adminData, error } = await supabaseClient
          .from("admin_users")
          .select("id")
          .eq("id", session.user.id)
          .single()

        if (adminData) {
          // Jika admin, alihkan ke halaman manage
          redirect("/admin/manage")
        } else {
          // Jika user tapi bukan admin, alihkan ke login
          redirect("/admin/login")
        }
      } else {
        // Jika tidak login, alihkan ke login
        redirect("/admin/login")
      }
    }

    checkAuth()
  }, [])

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <h2 className="text-xl">Mengalihkan ke halaman admin...</h2>
      </div>
    </div>
  )
}
