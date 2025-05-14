import { NextRequest, NextResponse } from 'next/server'

/**
 * Utilitas untuk menangani CORS di API routes
 * Fungsi ini akan menambahkan header CORS yang diperlukan untuk permintaan API
 * dan menangani permintaan OPTIONS dengan benar
 *
 * @param req NextRequest
 * @param res NextResponse atau Response
 * @returns Response yang sudah dilengkapi dengan header CORS
 */
export function cors(req: NextRequest, res: NextResponse | Response) {
  // Mendapatkan origin dari header permintaan, atau fallback ke "*"
  const origin = req.headers.get('origin') || '*'

  // Set header CORS
  const headers = new Headers(res.headers)
  headers.set('Access-Control-Allow-Origin', origin)
  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  headers.set(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  // Jika ini adalah permintaan OPTIONS, kembalikan respons 200 dengan header CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers
    })
  }

  // Untuk permintaan non-OPTIONS, kembalikan respons asli dengan header CORS
  return new Response(
    // Gunakan body dari respons asli, bisa berupa ReadableStream, ArrayBuffer, atau string
    res instanceof Response ? res.body : JSON.stringify({ error: 'Invalid response type' }),
    {
      status: res.status,
      statusText: res instanceof Response ? res.statusText : 'OK',
      headers
    }
  )
}

export default cors
