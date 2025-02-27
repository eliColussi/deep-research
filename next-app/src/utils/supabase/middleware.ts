// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // We'll start by creating a new NextResponse
  // that passes through the request headers.
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create a server-side Supabase client, referencing your env vars.
  // This is a *separate* context from your client-side code, so it's fine
  // as long as you only do it once here for middleware logic.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // Write cookie to the response
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // This ensures the session cookie is refreshed if needed
  await supabase.auth.getSession()

  // Return the updated response, which includes any new/modified cookies
  return response
}
