// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  components: [
    {
      path: '~/components',
      pathPrefix: false
    }
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { prerender: true }
  },

  sourcemap: {
    server: false,
    client: false
  },

  compatibilityDate: '2025-01-15',

  icon: {
    serverBundle: {
      collections: ['lucide', 'simple-icons']
    },
    clientBundle: {
      scan: true
    },
    // Avoid external Iconify fetches
    fallbackToApi: false
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  nitro: {
    // Mark better-sqlite3 as external - don't bundle it
    externals: {
      external: ['better-sqlite3']
    }
  }
})
