"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image"
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Menu,
  X,
  LayoutDashboard,
  FileText,
  ChevronRight,
  ArrowUpRight,
  ClipboardCheck,
  Settings,
  LineChart,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSurvey } from "@/context/SupabaseSurveyContext";
import { supabaseClient } from "@/lib/supabase/client";

// Komponen tombol logout yang tidak memerlukan AdminAuthContext
const LogoutButton = ({
  onClick,
  className = "",
  iconClassName = "",
}: {
  onClick: () => void;
  className?: string;
  iconClassName?: string;
}) => {
  return (
    <Button
      onClick={onClick}
      variant="ghost"
      size="icon"
      title="Logout"
      className={`text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full ${className}`}
    >
      <LogOut className={iconClassName || "w-4 h-4"} />
    </Button>
  );
};

const NavBar = () => {
  // Semua hooks harus dipanggil di bagian atas, sebelum kondisi apa pun
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { loading } = useSurvey();
  const [isAdmin, setIsAdmin] = useState(false);

  // Definisikan fungsi handler logout (bukan di dalam hook)
  const handleLogout = async () => {
    try {
      await supabaseClient.auth.signOut();
      window.location.href = "/admin/login";
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Cek apakah pengguna adalah admin menggunakan Supabase langsung
  useEffect(() => {
    let isMounted = true;

    const checkAdminStatus = async () => {
      try {
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();

        if (!isMounted) return;

        if (session?.user) {
          const { data: adminData } = await supabaseClient
            .from("admin_users")
            .select("id")
            .eq("id", session.user.id)
            .single();

          if (!isMounted) return;
          setIsAdmin(!!adminData);
        } else {
          if (!isMounted) return;
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        if (!isMounted) return;
        setIsAdmin(false);
      }
    };

    checkAdminStatus();

    // Cleanup function untuk mencegah update state setelah unmount
    return () => {
      isMounted = false;
    };
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const isActive = (path: string) => pathname === path;

  const mainLinks = [
    { name: "Dasbor", path: "/", icon: LayoutDashboard },
    { name: "Hasil Survei", path: "/results", icon: BarChart3 },
    { name: "Analisis Tren", path: "/trend-analysis", icon: LineChart },
  ];

  // Menu admin yang hanya muncul jika pengguna adalah admin
  const adminLinks = isAdmin
    ? [{ name: "Manajemen Survei", path: "/admin/manage", icon: ClipboardCheck }]
    : [];

  // Gabungkan menu utama dan menu admin
  const navLinks = [...mainLinks, ...adminLinks];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100 shadow-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2 group" onClick={closeMenu}>
                <div className="w-8 h-8 bg-emerald-600 rounded-md flex items-center justify-center group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
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
                <span className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-green-500">
                  Survei Kemenag Tanjungpinang
                </span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={cn(
                    "px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 ease-in-out flex items-center space-x-1 hover:bg-gray-100",
                    isActive(link.path)
                      ? "text-emerald-600"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <link.icon className="w-4 h-4" />
                  <span>{link.name}</span>
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center space-x-3">
              <Link href="/take-survey">
                <Button variant="outline" size="sm" className="text-sm">
                  <span>Isi Survei</span>
                  <ArrowUpRight className="ml-1 w-3 h-3" />
                </Button>
              </Link>
              {isAdmin && <LogoutButton onClick={handleLogout} className="h-8 w-8" />}
              <div className={cn("transition-opacity", loading ? "opacity-100" : "opacity-0")}>
                <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center space-x-2">
              {isAdmin && <LogoutButton onClick={handleLogout} className="h-8 w-8" />}
              <button
                onClick={toggleMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-600"
              >
                {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-gray-800 bg-opacity-50 transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeMenu}
      >
        <div
          className={cn(
            "fixed inset-y-0 right-0 max-w-xs w-full bg-white shadow-lg transform transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "translate-x-full"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-5 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <Link href="/" className="flex items-center space-x-2 group" onClick={closeMenu}>
                <div className="w-8 h-8 bg-emerald-600 rounded-md flex items-center justify-center group-hover:shadow-lg transition-all duration-300 group-hover:scale-105">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-green-500">
                  HasilKu
                </span>
              </Link>
              <button
                onClick={closeMenu}
                className="rounded-md p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  href={link.path}
                  className={cn(
                    "group flex items-center px-3 py-3 rounded-md text-base font-medium transition-all duration-150",
                    isActive(link.path)
                      ? "bg-emerald-50 text-emerald-600"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  onClick={closeMenu}
                >
                  <link.icon className="w-5 h-5 mr-3" />
                  <span>{link.name}</span>
                  <ChevronRight
                    className={cn(
                      "ml-auto w-4 h-4 transition-transform",
                      isActive(link.path)
                        ? "text-emerald-600 transform rotate-90"
                        : "text-gray-400 group-hover:translate-x-1"
                    )}
                  />
                </Link>
              ))}
            </nav>

            <div className="mt-auto pt-6 border-t border-gray-100">
              <div className="flex items-center space-x-3">
                <Link href="/take-survey" onClick={closeMenu} className="flex-1">
                  <Button className="w-full justify-center bg-emerald-600 hover:bg-emerald-700">
                    <span>Isi Survei</span>
                    <ArrowUpRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spacer for fixed header */}
      <div className="h-16"></div>
    </>
  );
};

export default NavBar;
