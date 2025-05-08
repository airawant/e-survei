"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { FileQuestion, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  const router = useRouter()

  useEffect(() => {
    console.info("404 Error: User attempted to access non-existent route")
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-white px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mb-8 animate-float">
        <FileQuestion className="h-10 w-10 text-red-400" />
      </div>
      <h1 className="text-5xl font-bold text-gray-900 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8 max-w-md">
        Oops! The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="space-x-4">
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="border-gray-200 hover:bg-gray-50 hover:text-gray-900"
        >
          Go Back
        </Button>
        <Button onClick={() => router.push("/")} className="shadow-subtle">
          <Home className="mr-2 h-4 w-4" />
          Return Home
        </Button>
      </div>
    </div>
  )
}
