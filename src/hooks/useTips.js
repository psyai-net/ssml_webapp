import { ref } from "vue";

export default function useTips() {
  const tipMsg = ref("");
  const isMsgHide = ref(true);
  let tipsTimer = null;
  /**
   * tips提示
   */
  function tipsFun(text, time = 2000) {
    tipMsg.value = text;
    if (isMsgHide.value) {
      clearTimeout(tipsTimer);
      isMsgHide.value = false;
      tipsTimer = setTimeout(() => {
        isMsgHide.value = true;
        tipMsg.value = "";
      }, time);
    }
  }
  return {
    tipMsg,
    tipsFun,
  };
}
