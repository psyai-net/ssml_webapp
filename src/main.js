import "./public-path";
import { createApp } from "vue";
import Home from "./view/voiceEditor";
// import router from "./router/index.js";

let instance = null;
function render(props = {}) {
  const { container, parentActions } = props;

  instance = createApp(Home);

  instance.config.globalProperties.$actions = parentActions;

  // instance.use(router);

  instance.mount(container ? container.querySelector("#app") : "#app");
}

// 独立运行时
if (!window.__POWERED_BY_QIANKUN__) {
  render();
}

export async function bootstrap() {
  console.log("[vue] vue app bootstraped");
}
export async function mount(props) {
  try {
    render(props);
  } catch (e) {
    console.error(e);
  }
}
export async function unmount() {
  instance.unmount();
  instance = null;
}
