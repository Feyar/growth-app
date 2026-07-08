<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useGrowthStore } from '@/stores/growth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const growth = useGrowthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true
  const { error: err } = await auth.signIn(email.value, password.value)
  loading.value = false
  if (err) {
    error.value = err.message
  } else {
    await growth.loadAll()
    router.replace('/')
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-6">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <div class="text-5xl mb-4">🧭</div>
        <h1 class="text-2xl font-bold text-slate-100">成长系统</h1>
        <p class="text-sm text-slate-400 mt-2">登录你的账号，继续你的旅程</p>
      </div>

      <form @submit.prevent="handleLogin" class="card space-y-4">
        <div>
          <label class="text-xs text-slate-400 mb-1 block">邮箱</label>
          <input
            v-model="email"
            type="email"
            placeholder="you@example.com"
            class="w-full bg-deep-600 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-grow-500/50 transition-colors"
          />
        </div>
        <div>
          <label class="text-xs text-slate-400 mb-1 block">密码</label>
          <input
            v-model="password"
            type="password"
            placeholder="••••••••"
            class="w-full bg-deep-600 border border-white/10 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-grow-500/50 transition-colors"
          />
        </div>

        <p v-if="error" class="text-red-400 text-xs text-center">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="btn-primary w-full flex items-center justify-center gap-2"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <p class="text-center text-xs text-slate-500 mt-6">
        首次使用？联系管理员开通账号
      </p>
    </div>
  </div>
</template>
