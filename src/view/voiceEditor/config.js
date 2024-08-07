export const MICROSOFT = "azure";
export const TENCENT = "tencent";
export const CHUMENWENWEN = "moyin";
export const ALIYUN = "alibaba";
export const ELEVENLABS = "ElevenLabs";
export const MINIMAX = "minimax";

export const ID_TO_COMPANYS = {
  "642a7b3fb9b3dde907f9a740": MICROSOFT,
  "647f3ab2710f103710858f9a": TENCENT,
  "64f03887f4a4549398d61e35": CHUMENWENWEN,
  "656d7a0d32e6b419094a6ee0": ALIYUN,
  "64c9cc0680009c782090c73a": ELEVENLABS,
  "64c9cc0680009c782090cxxx": MINIMAX,
};
/**
 * 不同厂商可用的 SSML 标签映射关系
 *  pauseEnum：停顿
 *  speechSpeedEnum：局部语速
 *  continuous：连续词
 *  pinyin：多音字
 *  digitSymbolEnum：数字符号
 *  volumeEnum：音量
 *  toneEnum：音调
 *  emotionEnum：情绪
 */
export const SSML_TAG_AVALIBLE_MAP = {
  [MICROSOFT]: [
    "pauseEnum",
    "speechSpeedEnum",
    "continuous",
    "pinyin",
    "digitSymbolEnum",
    "volumeEnum",
    "toneEnum",
    "emotionEnum",
  ],
  [TENCENT]: ["pauseEnum", "pinyin", "digitSymbolEnum"],
  [CHUMENWENWEN]: ["pauseEnum", "continuous", "pinyin", "digitSymbolEnum"],
  [ALIYUN]: ["pauseEnum", "digitSymbolEnum"],
  [ELEVENLABS]: [],
  [MINIMAX]: [],
};

export const REAL_SSML_TAG_MAP = {
  [MICROSOFT]: {
    wrapper: (speed, content, lang, voiceID, emotion) =>
      `<speak version=\"1.0\" xmlns=\"http://www.w3.org/2001/10/synthesis\" xmlns:mstts=\"https://www.w3.org/2001/mstts\" xml:lang=\"${lang}\"><voice name=\"${voiceID}\"><mstts:express-as style=\"${emotion}\"><prosody rate="${speed}">${content}</prosody></mstts:express-as></voice></speak>`,
    pauseEnum: (value) => `<break time=\"${value}\"/>`,
    speechSpeedEnum: (content, value) =>
      `<prosody rate="${value}">${content}</prosody>`,
    continuous: (content) => `<s>${content}</s>`,
    pinyin: (content, value) => `<sub alias="/${value[0]}">${content}</sub>`,
    digitSymbolEnum: (content, value) =>
      `<say-as interpret-as="${value}">${content}</say-as>`,
    volumeEnum: (content, value) =>
      `<prosody volume="${value}">${content}</prosody>`,
    toneEnum: (content, value) =>
      `<prosody pitch="${value}">${content}</prosody>`,
  },
  [TENCENT]: {
    wrapper: (speed, content) => `<speak>${content}</speak>`,
    pauseEnum: (value) => `<break time=\"${value}\"/>`,
    pinyin: (content, value) =>
      `<phoneme alphabet="py" ph="${value[1]}">${content}</phoneme>`,
    digitSymbolEnum: (content, value) =>
      `<say-as interpret-as="${value}">${content}</say-as>`,
  },
  [CHUMENWENWEN]: {
    wrapper: (speed, content, lang) =>
      `<speak version="1.0" xml:lang="${lang}" xmlns="http://www.w3.org/2001/10/synthesis" domain="public.weather"><option speed="${speed}" >${content}</option></speak>`,
    pauseEnum: (value) => `<break time=\"${value}\"/>`,
    continuous: (content) => `<w>${content}</w>`,
    pinyin: (content, value) => `<p phoneme="${value[1]}">${content}</p>`,
    digitSymbolEnum: (content, value) =>
      `<say-as interpret-as="${value}">${content}</say-as>`,
  },
  [ALIYUN]: {
    wrapper: (speed, content) => {
      const rate = Math.round(1000 * (1 - 1 / (speed < 0.66 ? 0.66 : speed)));
      return `<speak rate="${rate}">${content}</speak>`;
    },
    pauseEnum: (value) => `<break time=\"${value}\"/>`,
    digitSymbolEnum: (content, value) =>
      `<say-as interpret-as="${value}">${content}</say-as>`,
  },
  [ELEVENLABS]: {
    wrapper: (speed, content) => content,
  },
  [MINIMAX]: {
    wrapper: (speed, content) => content,
  },
};
/**
 * SSML 标签嵌套规则
 */
export const SSML_TAG_NEST_RULE = {
  pauseEnum: [],
  speechSpeedEnum: ["pauseEnum", "pinyin", "digitSymbolEnum"],
  continuous: ["pinyin"],
  pinyin: [],
  digitSymbolEnum: [],
  volumeEnum: ["pauseEnum", "pinyin", "digitSymbolEnum"],
  toneEnum: ["pauseEnum", "pinyin", "digitSymbolEnum"],
};
