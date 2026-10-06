import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import router from './router'
import App from './App.vue'
import './style.css'
import './styles/design-tokens.css'
import './styles/element-overrides.css'

import { vPermission, vRole } from './directives/permission'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.directive('permission', vPermission)
app.directive('role', vRole)

app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount('#app')