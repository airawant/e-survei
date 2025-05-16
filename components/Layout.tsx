"use client"

import type React from "react"
import NavBar from "./NavBar"
import { cn } from "@/lib/utils"
import { Facebook, Instagram, Mail, MapPin, Phone, Twitter, Youtube } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"

interface LayoutProps {
  children: React.ReactNode
  className?: string
  fullWidth?: boolean
}

const Layout = ({ children, className, fullWidth = false }: LayoutProps) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Mohon masukkan alamat email");
      return;
    }

    // Validasi format email sederhana
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Format email tidak valid");
      return;
    }

    setIsSubmitting(true);

    // Simulasi pengiriman data ke server
    setTimeout(() => {
      toast.success("Terima kasih telah berlangganan!");
      setEmail("");
      setIsSubmitting(false);
    }, 1000);

    // Pada implementasi sebenarnya, Anda akan mengirim data ke API:
    // fetch('/api/subscribe', {
    //   method: 'POST',
    //   body: JSON.stringify({ email }),
    //   headers: { 'Content-Type': 'application/json' }
    // })
    // .then(res => res.json())
    // .then(data => {
    //   toast.success("Terima kasih telah berlangganan!");
    //   setEmail("");
    // })
    // .catch(err => toast.error("Terjadi kesalahan. Silakan coba lagi."))
    // .finally(() => setIsSubmitting(false));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar />
      <main className={cn("flex-1 pb-12 pt-8", !fullWidth && "px-4 sm:px-6 md:px-8")}>
        <div className={cn(!fullWidth && "max-w-7xl mx-auto", className)}>{children}</div>
      </main>
      <footer className="bg-gray-800 text-white">
        {/* Footer bagian atas dengan informasi dan link */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Kolom 1: Logo dan alamat */}
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center mr-3">
                  <Image
                    src="/logo.png"
                    alt="Logo Kemenag"
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                </div>
                <span className="font-semibold text-lg">E-Survei Kantor Kemenag Tanjungpinang</span>
              </div>
              <div className="mt-4 text-gray-300 text-sm space-y-2">
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                  <p>Jl. Daeng Kamboja KM.24 Kp. Bugis, Kec. Tanjungpinang Kota, Kota Tanjung Pinang, Kepulauan Riau 29115</p>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 mr-2 text-gray-400 flex-shrink-0" />
                  <p>0821 72 801 123</p>
                </div>
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-2 text-gray-400 flex-shrink-0" />
                  <p>tanjungpinang@kemenag.go.id</p>
                </div>
              </div>
            </div>

            {/* Kolom 2: Link Cepat */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Link Cepat</h3>
              <ul className="space-y-2 text-gray-300">
                <li>
                  <Link href="/" className="hover:text-white transition-colors">Beranda</Link>
                </li>
                <li>
                  <Link href="/results" className="hover:text-white transition-colors">Hasil Survei</Link>
                </li>
                <li>
                  <Link href="/trend-anlysis" className="hover:text-white transition-colors">Analisis Tren Survei</Link>
                </li>
                <li>
                  <Link href="/take-survey" className="hover:text-white transition-colors">Isi Survei</Link>
                </li>
                <li>
                  <Link href="/pengembang" className="hover:text-white transition-colors">Pengembang</Link>
                </li>
              </ul>
            </div>

            {/* Kolom 3: Link Terkait */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Link Terkait</h3>
              <ul className="space-y-2 text-gray-300">
                <li>
                  <a href="https://tanjungpinang.kemenag.go.id" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Website Kemenag Tanjungpinang</a>
                </li>
                <li>
                  <a href="https://kepri.kemenag.go.id" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Kanwil Kemenag Kepri</a>
                </li>
                <li>
                  <a href="https://romantik.web.bps.go.id/rekomendasi-terbit/K2RlakNQZENtRys2NGVIeXgyRjhpQT09" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Rekomendasi Terbit</a>
                </li>
              </ul>
            </div>

            {/* Kolom 4: Ikuti Kami */}
            <div>
              <h3 className="font-semibold text-lg mb-4">Ikuti Kami</h3>
              <div className="flex flex-wrap gap-3">
                <a href="https://facebook.com/kemenagtpi" target="_blank" rel="noopener noreferrer" className="bg-gray-700 p-2 rounded-full hover:bg-blue-600 transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="https://twitter.com/kemenagtpi" target="_blank" rel="noopener noreferrer" className="bg-gray-700 p-2 rounded-full hover:bg-sky-500 transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="https://instagram.com/kemenag_tpi/" target="_blank" rel="noopener noreferrer" className="bg-gray-700 p-2 rounded-full hover:bg-pink-600 transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="https://www.youtube.com/@kemenagtpi" target="_blank" rel="noopener noreferrer" className="bg-gray-700 p-2 rounded-full hover:bg-red-600 transition-colors">
                  <Youtube className="h-5 w-5" />
                </a>
              {/* </div>
              <div className="mt-6"> */}
                <h4 className="text-sm font-medium mb-2">Berlangganan Info Terbaru</h4>
                <form onSubmit={handleSubscribe} className="flex mt-2">
                  <input
                    type="email"
                    placeholder="Alamat email Anda"
                    className="px-3 py-2 text-gray-900 bg-white rounded-l text-sm focus:outline-none w-full"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 rounded-r px-3 py-2 text-sm font-medium transition-colors disabled:bg-green-800 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Proses..." : "Daftar"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Footer bagian bawah dengan copyright */}
        <div className="border-t border-gray-700 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-center items-center text-sm text-gray-400">
              <p>© {new Date().getFullYear()} Kemenag Kota Tanjungpinang. Hak Cipta Dilindungi Undang-Undang.</p>
              {/* <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="/privacy-policy" className="hover:text-white transition-colors">
                  Kebijakan Privasi
                </a>
                <a href="/terms-of-service" className="hover:text-white transition-colors">
                  Ketentuan Layanan
                </a>
                <a href="/contact" className="hover:text-white transition-colors">
                  Kontak
                </a>
              </div> */}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
