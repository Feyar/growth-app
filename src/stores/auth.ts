import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase, supabaseEnabled } from '@/utils/supabase'
import type { User, Session } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(true)

  async function init() {
    if (!supabaseEnabled || !supabase) {
      loading.value = false
      return
    }
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    user.value = data.session?.user ?? null
    loading.value = false

    supabase.auth.onAuthStateChange((_event, s) => {
      session.value = s
      user.value = s?.user ?? null
    })
  }

  async function signIn(email: string, password: string) {
    if (!supabaseEnabled || !supabase) return { error: new Error('Supabase 未配置') }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) {
      session.value = data.session
      user.value = data.user
    }
    return { data, error }
  }

  async function signOut() {
    if (!supabaseEnabled || !supabase) return
    await supabase.auth.signOut()
    user.value = null
    session.value = null
  }

  const isLoggedIn = () => !!user.value

  return { user, session, loading, init, signIn, signOut, isLoggedIn }
})
