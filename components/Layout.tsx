"use client"

import type React from "react"
import NavBar from "./NavBar"
import { cn } from "@/lib/utils"

interface LayoutProps {
  children: React.ReactNode
  className?: string
  fullWidth?: boolean
}

const Layout = ({ children, className, fullWidth = false }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar />
      <main className={cn("flex-1 pb-12 pt-8", !fullWidth && "px-4 sm:px-6 md:px-8")}>
        <div className={cn(!fullWidth && "max-w-7xl mx-auto", className)}>{children}</div>
      </main>
      <footer className="bg-white border-t border-gray-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} Kemenag Kota Tanjungpinang</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="hover:text-gray-900 transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-gray-900 transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-gray-900 transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Layout
