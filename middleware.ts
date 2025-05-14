import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Dapatkan respons berikutnya
  const response = NextResponse.next()

  // Mendapatkan origin dari header permintaan, atau fallback ke "*"
  const origin = request.headers.get('origin') || '*'

  // Tambahkan header CORS ke respons
  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  response.headers.set(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  // Tangani permintaan OPTIONS secara khusus
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: response.headers
    })
  }

  return response
}

export const config = {
  // Terapkan middleware hanya untuk API routes
  matcher: '/api/:path*',
}
