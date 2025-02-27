// route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    // Create a route-level Supabase client for the OAuth callback
    const supabase = createRouteHandlerClient({ cookies })
    // Exchange the code for a session
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to dashboard after successful OAuth
  return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
}
