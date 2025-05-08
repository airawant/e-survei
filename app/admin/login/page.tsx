"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Lock, User } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { supabaseClient } from "@/lib/supabase/client"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMessage("")

    try {
      console.log("Mencoba login dengan email:", email)
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Login error:", error)
        setErrorMessage(
          error.message === "Invalid login credentials"
            ? "Email atau password salah"
            : error.message
        )
        toast.error("Gagal masuk: " + (error.message === "Invalid login credentials"
          ? "Email atau password salah"
          : error.message))
        return
      }

      if (!data.user) {
        setErrorMessage("Gagal mendapatkan data pengguna")
        toast.error("Gagal mendapatkan data pengguna")
        return
      }

      // Periksa apakah pengguna adalah admin
      const { data: adminData, error: adminError } = await supabaseClient
        .from("admin_users")
        .select("id, role")
        .eq("id", data.user.id)
        .single()

      if (adminError || !adminData) {
        console.error("Akun Anda tidak memiliki izin admin:", adminError)
        setErrorMessage("Akun Anda tidak memiliki izin admin")
        toast.error("Akun Anda tidak memiliki izin admin")

        // Logout karena bukan admin
        await supabaseClient.auth.signOut()
        return
      }

      console.log("Login berhasil, role:", adminData.role)
      toast.success("Login berhasil")

      // Arahkan pengguna ke dashboard admin
      router.push("/admin/manage")
    } catch (err) {
      console.error("Unexpected error during login:", err)
      setErrorMessage("Terjadi kesalahan saat login")
      toast.error("Terjadi kesalahan saat login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
        <div className="text-center">
          <div className="flex justify-center">
            <div className="relative w-20 h-20">
              <Image
                src="/logo.png"
                alt="Logo"
                fill
                sizes="(max-width: 80px) 100vw, 80px"
                className="object-contain"
                priority
              />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Login Admin
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Masuk ke dashboard admin untuk mengelola aplikasi
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-50 text-red-800 p-3 rounded-md text-sm">
            {errorMessage}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email Anda"
                />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10"
                  placeholder="Password Anda"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Ingat saya
              </label>
            </div>

            <div className="text-sm">
              <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                Lupa password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                loading ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            >
              {loading ? "Sedang Masuk..." : "Masuk"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
