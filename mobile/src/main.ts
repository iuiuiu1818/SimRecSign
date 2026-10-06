import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'

import './styles/design-tokens.css'
import './styles/vant-theme.css'
import './styles/global.css'

import 'vant/es/dialog/style'
import 'vant/es/toast/style'

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')