import { createRouter, createWebHashHistory } from "vue-router";

import Home from "../view/voiceEditor/index.vue"; // 导入你的组件

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  // 添加其他路由规则
];

const router = createRouter({
  base: "/",
  history: createWebHashHistory(),
  routes,
});

export default router;
