"use client";

import { useEffect, useState, type ReactNode } from "react";

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Komponen fallback default yang menampilkan indikator loading
 */
export function LoadingFallback({ message = "Memuat data..." }: { message?: string }) {
  return (
    <div className="flex justify-center items-center py-12">
      <div className="flex items-center space-x-2">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-gray-500">{message}</span>
      </div>
    </div>
  );
}

/**
 * Komponen untuk mengatasi masalah hidrasi dengan menampilkan konten hanya di sisi klien
 * dan menampilkan fallback (opsional) saat di server atau selama hidrasi
 */
export function ClientOnly({ children, fallback = <LoadingFallback /> }: ClientOnlyProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? children : fallback;
}

export default ClientOnly;
