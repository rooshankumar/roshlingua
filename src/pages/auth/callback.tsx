import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function Callback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      const supabase = createClientComponentClient()

      const { data, error } = await supabase.auth.exchangeCodeForSession()

      if (error) {
        console.error('Login failed:', error.message)
        return
      }

      // Login success! Redirect to homepage or dashboard
      router.replace('/')
    }

    handleAuth()
  }, [])

  return <p>Signing you in...</p>
}
