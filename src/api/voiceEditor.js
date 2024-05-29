import axios from "@/axios";
import { checkResult } from "@/utill.js";

function getSessions(key) {
  return JSON.parse(sessionStorage.getItem(key));
}

async function querySpeakerInfo(query, form) {
  return checkResult(
    await axios.post(
      `${psyaiEditorUrl}inner/joint/assets/tts/timbre/info${query}`,
      {
        ...form,
      }
    )
  );
}

async function voiceEditorData(form) {
  return checkResult(
    await axios.post(psyaiEditorUrl + "web-tools/tts/label", {
      ...form,
    })
  );
}

async function pinyinData(form) {
  return checkResult(
    await axios.post(psyaiEditorUrl + "web-tools/tts/label/pinyin/v2", {
      ...form,
    })
  );
}

async function aditionCreate(form) {
  return checkResult(
    await axios.post(psyaiEditorUrl + "web-tools/tts/gen", {
      ...form,
    })
  );
}
export { querySpeakerInfo, voiceEditorData, pinyinData, aditionCreate };
