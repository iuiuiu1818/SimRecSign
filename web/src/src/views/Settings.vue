<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <div class="settings-page">
    <h2 class="page-title">个人设置</h2>
    <el-row :gutter="20">
      <el-col :xs="24" :sm="4">
        <el-menu :default-active="route.path" router class="settings-menu">
          <el-menu-item index="/settings/profile">个人信息</el-menu-item>
          <el-menu-item index="/settings/password">修改密码</el-menu-item>
          <el-menu-item index="/settings/sign-password">签名密码</el-menu-item>
          <el-menu-item index="/settings/signature">我的签名</el-menu-item>
          <el-menu-item index="/settings/certificate">我的证书</el-menu-item>
        </el-menu>
      </el-col>
      <el-col :xs="24" :sm="18">
        <router-view />
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.settings-page {

  margin: 0 auto;
}

.page-title {
  font-size: 22px;
  font-weight: 600;
  color: var(--srs-text-primary);
  margin: 0 0 24px;
}

.settings-menu {
  border-right: none;
  border-radius: 8px;
  background: var(--srs-bg-card);
  border: 1px solid var(--srs-border);
}

.settings-menu .el-menu-item {
  height: 44px;
  line-height: 44px;
}

.settings-menu .el-menu-item.is-active {
  background-color: var(--srs-primary-bg);
  color: var(--srs-primary);
  font-weight: 500;
}
</style>