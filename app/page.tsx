"use client"

import Link from "next/link"
import { ArrowRight, ClipboardList, PieChart, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Layout from "@/components/Layout"
import ClientOnly from "@/components/survey/ClientOnly"
import StatsCards from "@/components/survey/StatsCards"
import { cn } from "@/lib/utils"

export default function Home() {
  return (
    <Layout>
      {/* Hero Section */}
      <section className="rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 p-8 mb-12 border border-emerald-100 shadow-subtle overflow-hidden relative">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div className="z-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Portal Survei Kantor Kementerian Agama Kota Tanjungpinang</h1>
            <p className="text-lg text-gray-700 mb-8">
              Bangun survei yang cerdas, kumpulkan umpan balik berharga, dan visualisasikan data dengan platform manajemen survei yang canggih.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/admin/manage">
                <Button size="lg" className="rounded-lg">
                  Buat Survei
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/take-survey">
                <Button variant="outline" size="lg" className="rounded-lg">
                  Isi Survei
                </Button>
              </Link>
            </div>
          </div>
          <div className="hidden md:flex justify-end">
            <div className="w-full max-w-md aspect-[4/3] bg-white rounded-xl shadow-lg p-4 transform rotate-1 transition-transform duration-500 hover:rotate-0">
              <div className="w-full h-full bg-gradient-to-tr from-emerald-500/10 to-green-500/10 rounded-lg p-4">
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-500 text-sm font-medium">
                        {i + 1}
                      </div>
                      <div className="h-2 bg-emerald-100 rounded-full ml-3 flex-1"></div>
                    </div>
                  ))}
                  <div className="mt-6 space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-6 bg-emerald-50 rounded-lg"></div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-6">
                    <div className="w-24 h-8 bg-emerald-100 rounded-md"></div>
                    <div className="w-24 h-8 bg-emerald-500 rounded-md"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 w-64 h-64 bg-emerald-200 rounded-full filter blur-3xl opacity-20 transform translate-x-1/4 translate-y-1/4"></div>
        <div className="absolute left-0 top-0 w-64 h-64 bg-green-200 rounded-full filter blur-3xl opacity-20 transform -translate-x-1/4 -translate-y-1/4"></div>
      </section>

      {/* Stats */}
      <section className="mb-16">
        <ClientOnly>
          <StatsCards />
        </ClientOnly>
      </section>

      {/* Features */}
      <section className="mb-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Manajemen Survei yang Canggih</h2>
          <p className="text-gray-600">Semua yang Anda butuhkan untuk membuat, mendistribusikan, dan menganalisis survei di satu tempat.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Buat Survei Berbobot",
              description:
                "Rancang survei dengan pertanyaan berbobot untuk hasil yang lebih akurat. Tetapkan tingkat kepentingan untuk setiap pertanyaan dan dapatkan wawasan yang tepat.",
              icon: ClipboardList,
              color: "bg-emerald-50 text-emerald-600 border-emerald-200",
              link: "/admin/surveys/create",
            },
            {
              title: "Jadwalkan & Distribusikan",
              description:
                "Hasilkan tautan unik dan kode QR untuk memudahkan pendistribusian survei Anda.",
              icon: PieChart,
              color: "bg-green-50 text-green-600 border-green-200",
              link: "/admin/manage",
            },
            {
              title: "Analisis Hasil",
              description:
                "Visualisasikan data Anda dengan analitik yang canggih. Uraikan respons berdasarkan demografi dan dapatkan wawasan yang dapat ditindaklanjuti.",
              icon: BarChart3,
              color: "bg-teal-50 text-teal-600 border-teal-200",
              link: "/results",
            },
          ].map((feature, i) => (
            <div key={i} className="glass-panel card-hover p-6">
              <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-5", feature.color)}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 mb-4">{feature.description}</p>
              <Link href={feature.link} className="text-emerald-600 font-medium flex items-center group">
                <span>Pelajari lebih lanjut</span>
                <ArrowRight className="ml-1 w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white p-8 shadow-lg">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Siap mulai mengumpulkan umpan balik berharga?</h2>
          <p className="text-emerald-100 mb-8 text-lg">
            Buat survei pertama Anda dalam hitungan menit dan dapatkan wawasan dari audiens Anda.
          </p>
          <Link href="/admin/manage">
            <Button size="lg" variant="secondary" className="rounded-lg font-medium">
              Mulai Sekarang
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  )
}
