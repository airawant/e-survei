"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Layout from "@/components/Layout"
import ClientOnly from "@/components/survey/ClientOnly"
import StatsCards from "@/components/survey/StatsCards"

export default function Home() {
  return (
    <Layout>
      {/* Full Banner Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center text-center rounded-2xl overflow-hidden shadow-lg">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="/images/kanto2.jpg" // ganti dengan path gambar Anda di public/
            alt="Survey Banner"
            className="w-full h-full object-cover"
          />
          {/* Overlay agar teks terbaca */}
          <div className="absolute inset-0 bg-black/50" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-2xl px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 drop-shadow-lg">
            Portal Survei Kantor Kementerian Agama Kota Tanjungpinang
          </h1>
          <p className="text-lg text-gray-100 mb-10 drop-shadow">
            Ikuti survei kami untuk membantu meningkatkan kualitas layanan.
          </p>
          <Link href="/take-survey">
            <Button size="lg" className="rounded-lg font-medium bg-emerald-600 hover:bg-emerald-700 text-white">
              Isi Survei
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
      <section className="mb-16">
        {" "}
        <ClientOnly>
          {" "}
          <StatsCards />{" "}
        </ClientOnly>{" "}
      </section>{" "}
    </Layout>
  )
}
