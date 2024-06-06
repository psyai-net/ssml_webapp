<template>
  <div class="voiceEditorBg">
    <div class="voiceEditorTips animationSlide" @click.capture="closeDropDown">
      <!-- 标题 -->
      <div class="textEditorTitle readonly">
        文本编辑
        <span class="textEditorTitleClose" @click="canceEditor">×</span>
      </div>
      <!-- 功能项下拉列表 -->
      <div
        class="custom-element"
        v-show="isShowDropDown"
        :style="{ left: leftDropDownLeft }"
      >
        <span class="editorTags">
          <span :class="['editorTagsOptionBox', { cur: editorIs }]">
            <button
              class="speech"
              v-for="item in navArrList"
              @mouseup="navClick(item)"
            >
              <p></p>
              {{ item.desc }}
            </button>
          </span>
        </span>
      </div>
      <!-- 富文本编辑器 -->
      <JoditVue
        ref="editorRef"
        :value="editorContent"
        :config="editorConfig"
        :height="'480px'"
        :width="'1080px'"
        class="textEditor"
      ></JoditVue>
      <div class="editorText">{{ editorText.length }} / 2000</div>
      <!-- 取消/保存 -->
      <div class="textEditorBottom">
        <div class="save_msg" v-if="saveMsg">
          {{ saveMsg }}
        </div>
        <div
          class="cancel readonly"
          contenteditable="false"
          @click="canceEditor"
        >
          取消
        </div>
        <div
          class="preserve readonly"
          contenteditable="false"
          @click="confirmClick"
        >
          保存
        </div>
      </div>
      <!-- loading浮层 -->
      <div class="loaderBox" v-if="loaderShow">
        <div class="loader"></div>
      </div>
      <div class="saveTipsBox readonly" v-if="saveTipsShow">
        <div class="saveTipsContent animationTop">
          <div>
            <p>提醒</p>
            <span>生成讲解将覆盖您原有文本内容</span>
          </div>
          <div class="saveTipsButton">
            <div class="cancel" @click="saveTipsShow = false">取消</div>
            <div class="confirm" @click="confirmClick">确定</div>
          </div>
        </div>
      </div>
      <!-- tips -->
      <div class="tipMsg" v-if="tipMsg">{{ tipMsg }}</div>
      <!-- 气泡 -->
      <div class="global-disabled-tip"></div>
    </div>

    <!-- controls -->
    <audio ref="audioPlayer" :src="audioSrc" @ended="onAudioEnded"></audio>
    <div class="ssmlHtml" style="display: none"></div>
  </div>
</template>
<script setup>
import axios from "@/axios";
import {
  ref,
  onMounted,
  onBeforeUnmount,
  reactive,
  computed,
  watch,
  getCurrentInstance,
} from "vue";
// 富文本编辑器
import JoditVue from "jodit-vue/src/JoditEditor.vue";
import "jodit/build/jodit.css";
import "./voiceStyle.less";
// 富文本编辑操作图标
import audition from "@/assets/voiceEditor/audition.png"; //试听播放
import emotion from "@/assets/voiceEditor/emotion.png"; //情绪
import revoke from "@/assets/voiceEditor/revoke.png"; //返回
import restore from "@/assets/voiceEditor/restore.png"; //恢复
import pause from "@/assets/voiceEditor/pause.png"; //停顿
import speed from "@/assets/voiceEditor/speed.png"; //语速
import continuous from "@/assets/voiceEditor/continuous.png"; //连续词语
import multitone from "@/assets/voiceEditor/multitone.png"; //多音字
import numIcon from "@/assets/voiceEditor/numIcon.png"; //数字符号
import sound from "@/assets/voiceEditor/sound.png"; //音量
import toneTuning from "@/assets/voiceEditor/toneTuning.png"; //音调
import suspend from "@/assets/voiceEditor/suspend.png"; //试听暂停
// api
import {
  aditionCreate,
  pinyinData,
  voiceEditorData,
} from "../../api/voiceEditor";
// hooks
import useTips from "@/hooks/useTips";
// utils
import { escapeSpecialCharacters, unescapeSpecialCharacters } from "@/utill";
// config
import {
  ID_TO_COMPANYS,
  SSML_TAG_AVALIBLE_MAP,
  SSML_TAG_NEST_RULE,
  REAL_SSML_TAG_MAP,
} from "./config";

const { tipMsg, tipsFun } = useTips();

// ue5 返显数据的地方
const editorContent = ref("");
const saveDataHTML = ref(null);
const saveDataSSML = ref(null);
const saveDataStr = ref(null);

const editorRef = ref(null);
const textEditorTitle = ref("");
const loaderShow = ref(false);
const saveTipsShow = ref(false);
const saveMsg = ref("");
const editorText = ref("");
const audioSrc = ref("");
const ssmlHTML = ref("");
const isClick = ref(true);
const lang = ref("zh-CN");
const anchor = ref("zh-CN-XiaoxiaoNeural");

const inputLength = ref(0);

window.PsyaiLangID = lang;
window.PsyaiVoiceID = anchor;
window.editorContentHtml = editorContent;
window.psyaiTextEditorTitles = textEditorTitle;

const propsData = reactive({});
// const speakerInfo = reactive({});
// const speakerCompany = computed(() => ID_TO_COMPANYS[speakerInfo.company]);
const speakerCompany = computed(() => propsData.company);
const speakerCompanyAvalibleTags = computed(
  () => SSML_TAG_AVALIBLE_MAP[speakerCompany.value] || []
);
// ssml标签转换
const realSsmlTags = computed(() => REAL_SSML_TAG_MAP[speakerCompany.value]);
const hasUnavailableTag = ref(false);
// 初始化内容时，设置不可用标签样式
watch(speakerCompany, async () => {
  const container = document.createElement("div");
  container.innerHTML = editorContent.value;
  // 获取选中的标签
  const ssmlTags = Array.from(container.querySelectorAll("div.editorTags"));
  ssmlTags.map((tag) => {
    const tagType = tag?.classList?.value?.split(" ")[1];
    if (!speakerCompanyAvalibleTags.value.includes(tagType)) {
      hasUnavailableTag.value = true;
      tag?.classList?.add("editorTags--disabled");
    }
  });
  editorContent.value = container.innerHTML;
});
// 有不可用标签时给出提示
watch(hasUnavailableTag, () => {
  if (hasUnavailableTag.value) {
    tipsFun("修改音色后部分设置不可用，请点击文本框修改", 1500);
  }
});

// 富文本编辑器按钮配置
const editorbuttonData = [
  // 'bold', 'italic', 'underline',  'undo', 'redo',
  {
    name: "undoButton",
    iconURL: revoke,
    command: "undo",
    tooltip: "文本撤销功能",
    tooltipPos: "left",
    isDisabled: function (editor) {
      return !editor.history.canUndo();
    },
  },
  {
    name: "redoButton",
    iconURL: restore,
    command: "redo",
    tooltip: "文本恢复功能",
    isDisabled: function (editor) {
      // 检查恢复历史记录是否为空
      return !editor.history.canRedo();
    },
  },
  {
    name: "pauseEnum",
    iconURL: pause,
    tooltip: "请在文本中插入停顿",
    showTooltipDelay: 10000, // 设置显示提示文字的延迟时间为500毫秒
    exec: function (editor) {
      leftDropClick("pauseEnum", editor); // 停顿
    },
  },
  {
    name: "speechSpeedEnum",
    tooltip: "请选择文本并设置局部语速",
    iconURL: speed,
    exec: function (editor) {
      leftDropClick("speechSpeedEnum", editor); //局部语速
    },
  },
  {
    name: "continuous",
    tooltip: "请选择文本并设置连续词语",
    iconURL: continuous,
    exec: function (editor) {
      if (window.getSelection().toString()) {
        editorObj.type = "continuous";
        editorObj.editor = editor;
        navClick({
          value: "continuous",
          desc: "连续词语",
        });
      }
    },
  },
  {
    name: "pinyin",
    tooltip: "请选择单个汉字并设置发音",
    iconURL: multitone,
    exec: function (editor) {
      window.postMessage(
        {
          payload: {
            type: "ssml_get_pinyin",
            data: window.getSelection().toString(),
          },
        },
        "*"
      );
      leftDropClick("pinyin", editor);
    },
  },
  {
    name: "digitSymbolEnum",
    tooltip: "请选择数字并设置发音",
    iconURL: numIcon,
    exec: function (editor) {
      leftDropClick("digitSymbolEnum", editor); //数字符号
    },
  },
  {
    name: "volumeEnum",
    tooltip: "请选择文本并设置音量",
    iconURL: sound,
    exec: function (editor) {
      leftDropClick("volumeEnum", editor); //音量
    },
  },
  {
    name: "toneEnum",
    tooltip: "请选择文本并设置音调",
    iconURL: toneTuning,
    exec: function (editor) {
      leftDropClick("toneEnum", editor); //音调
    },
  },
  {
    name: "emotionEnum",
    tooltip: "请选择文本并设置情绪",
    iconURL: emotion,
    exec: function (editor) {
      leftDropClick("emotionEnum", editor); //情绪
    },
  },
  {
    name: "audition",
    tooltip: "试听",
    iconURL: audition,
    exec: function () {
      auditionClick();
    },
  },
];
// 富文本编辑器配置
const editorConfig = reactive({
  placeholder: "请输入内容",
  // ignoreTags: ['editorTags'],
  buttons: editorbuttonData,
  buttonsMD: editorbuttonData,
  buttonsSM: editorbuttonData,
  buttonsXS: editorbuttonData,
  sizes: ["19px"],
  showTooltipDelay: 1,
  showTooltip: false,
  defaultTimeout: 1,
  textColor: "#ff0000", // 设置文本颜色为红色
  dragAndDrop: false,
  showCharsCounter: false,
  showWordsCounter: false,
  showZoomer: false,
  showFullScreen: false,
  showStatusbar: false,
  statusbar: false, // 是否显示底部状态栏
  askBeforePasteFromWprd: false, // 复制粘贴不弹窗提示
  askBeforePasteHTML: false,
  defaultActionOnPaste: "insert_only_text",
  InsertMode: "insert_only_text",
  addNewLineOnDBLClick: false,
  editHTMLDocumentMode: false,
  showBrowerColorPicker: false,
  textIcons: false,
  iframe: false,
  saveSelectionOnBlur: false,
  disablePlugins: [],
  enter: "br",
  presets: "inline",
  direction: "left", // 设置文本方向为从左往右
  // readonly: ['span'],
  disableDblClickPaste: true, // 禁用双击粘贴事件
  safeMode: false,
  events: {
    click: handleEditorContentClick,
    change: editorContentChange,
    dblclick: function (event) {
      // event.preventDefault();
      // const lastChild = document.querySelector(".jodit-wysiwyg").lastChild();;
      // // var lastChild = this.editor.lastChild();
      //
      // if (lastChild) {
      //   var lastChildTagName = lastChild.getNodeName();
      //
      //   if (lastChildTagName === 'BR') {
      //     lastChild.remove();
      //   } else if (lastChildTagName === 'P') {
      //     lastChild.innerHTML += '<br>';
      //   }
      // }
    },
    // selectionchange: function (event) {
    //   console.log("selectionchange");
    // },
    keydown: (event) => {
      var editorNum = editorText.value; // 获取删除前的全部文本
      var initialLength = editorNum.length; // 获取删除前的文本长度
      // 删除键
      if (event.keyCode === 8 || event.keyCode === 46) {
        setTimeout(function () {
          var updatedLength = editorText.value.length; // 获取删除后的文本长度
          if (updatedLength < initialLength) {
            // console.log("文本被删除");
            //当没有选择文字的时候
            disabledAll(false);
            disabledState(["pauseEnum", "emotionEnum"], true);
          } else {
            // console.log("未删除文本");
          }
        }, 100);
      }
    },
    // 通过键盘移动光标时，更新按钮状态
    keyup: () => {
      // 在这里处理光标移动事件
      // console.log("光标位置：", getCursorPosition());
      // console.log("光标所在标签：", getCursorTag()?.dataset?.type);
      disabledAll(false);
      disabledState(
        filterBtnsByTagNestRule(getCursorTag()?.dataset?.type, [
          "pauseEnum",
          "emotionEnum",
        ]),
        true
      );
    },
  },
});

/**
 * 获取音色信息
 * @param {*} speakerId
 */
function querySpeaker(speakerId) {
  if (!speakerId) {
    console.error(`querySpeakerInfo end: !speakerId`);
    return;
  }

  function querySpeakerInfoWithRetry(options, retries = 3) {
    return axios
      .post(`${psyaiEditorUrl}inner/joint/assets/tts/timbre/info`, options)
      .then((response) => response.data)
      .catch((error) => {
        if (retries === 1) {
          throw error;
        }
        return querySpeakerInfoWithRetry(options, retries - 1);
      });
  }

  return querySpeakerInfoWithRetry(
    { speaker_id: speakerId, uid: psyaiEditorUid },
    3
  );
}

// 富文本功能按钮
const editorIs = ref(false);
const navDataList = reactive({});
const isShowDropDown = ref(false);
const editorObj = reactive({
  editor: {},
  type: "",
  value: "",
});
// 编辑器功能按钮下拉弹窗定位
const navOption = reactive({
  pauseEnum: { left: 130, index: "" },
  speechSpeedEnum: { left: 180, index: "" },
  continuous: { left: 254, index: "" },
  pinyin: { left: 334, index: "" },
  digitSymbolEnum: { left: 396, index: "" },
  volumeEnum: { left: 470, index: "" },
  toneEnum: { left: 520, index: "" },
  emotionEnum: { left: 580, index: "" },
});
const navArrList = computed(() => navDataList[editorObj.type] || []);
const leftDropDownLeft = computed(() =>
  editorObj.type ? navOption[editorObj.type].left + "px" : ""
);
/**
 * DropDownClose优先于leftDropClick执行：关闭下拉列表
 */
function closeDropDown() {
  if (
    document.querySelector(".editorTags").children[0].className ==
    "editorTagsOptionBox cur"
  ) {
    editorIs.value = false;
  }
  const editorTagsOptionBoxAll = document.querySelectorAll(
    ".editorTagsOptionBox"
  );
  if (document.querySelector(".editorTagsOptionBox.cur")) {
    editorTagsOptionBoxAll.forEach(function (element) {
      element.classList.remove("cur");
      setTimeout(function () {
        element.parentElement?.removeAttribute("data-isShow");
      }, 10);
    });
  }
}
/**
 * 富文本编辑器功能按钮点击：显示下拉功能列表
 * @param {*} type 功能类型
 *  pauseEnum：停顿
 *  speechSpeedEnum：局部语速
 *  continuous：连续词
 *  pinyin：多音字
 *  digitSymbolEnum：数字符号
 *  volumeEnum：音量
 *  toneEnum：音调
 *  emotionEnum：情绪
 * @param {*} editor 富文本编辑器实例
 */
function leftDropClick(type, editor) {
  editorObj.type = type;
  editorObj.editor = editor;
  isShowDropDown.value = true;
  if (
    document.querySelector(".editorTags").children[0].className ==
    "editorTagsOptionBox"
  ) {
    editorIs.value = !editorIs.value;
  }
}
/**
 * 执行相应功能：插入ssml标签
 */
function navClick(name) {
  editorIs.value = false;
  isShowDropDown.value = false;
  editorIs.value = !editorIs.value;

  const editType = editorObj.type;
  const selectedText = window.getSelection().toString();
  if (editType === "emotionEnum") {
    emotionFun(name);
    return;
  }
  const wrappedText = () => {
    return [
      `<div class="editorTags ${editType}">`,
      `<pre></pre>`,
      // 无选中文案：
      //  停顿
      // 有选中文案：
      //  下划线：连续词、多音字
      //  []包括：局部语速、数字符号、音量、音调
      editType === "pinyin" || editType === "continuous"
        ? `<span class="border valText" data-type="${editType}" data-mark="${name.item_mark}" data-desc="${name.desc}" data-val="${name.value}" data-numVal="${name.numValue}">${selectedText}</span>`
        : editType === "pauseEnum"
        ? `<span class="valText" data-type="${editType}" data-mark="${name.item_mark}" data-desc="${name.desc}" data-val="${name.value}" data-numVal="${name.numValue}"><s></s></span>`
        : `<pre></pre><i>[</i><pre></pre><span class="valText" data-type="${editType}" data-mark="${name.item_mark}" data-desc="${name.desc}" data-val="${name.value}" data-numVal="${name.numValue}">${selectedText}</span><pre></pre><i>]</i><pre></pre>`,
      // 按钮
      `<div
        class="optionBtn editorTagsOption readonly"
        contenteditable="false"
        data-optionBtn="optionBtn"
      >`,
      // 按钮文案
      `<b>${name.desc}</b>`,
      // `<div class="disabled-tip"></div>`,
      // `<s style="display: none" class="noneNode">${name.value}</s>`,
      // 下拉列表
      `<div class="editorTagsOptionBox">`,
      // 下拉项
      navArrList.value
        .map(
          (item, index) =>
            `<div
              class="editorList"
              data-index="${index}"
              data-type="${editType}"
              data-mark="${item.item_mark}"
              data-desc="${item.desc}"
              data-val="${item.value}"
              data-numVal="${item.numValue}"
            >
              ${
                name.value == item.value ||
                (name.item_mark &&
                  item.item_mark &&
                  name.item_mark == item.item_mark)
                  ? `<p class="active"></p>`
                  : `<p></p>`
              }
              <span>${item.desc}</span>
            </div>`
        )
        .join(""),
      // 下拉移除按钮
      `<div
        class="editorList"
        data-index="${-1}"
      >
        <p></p>
        <span>移除</span>
      </div>`,
      `</div>`,
      `</div>`,
      `<pre></pre>`,
      `</div>`,
    ].join("");
  };
  editorObj.editor.selection.insertHTML(wrappedText());
  disabledAll(false);
  disabledState(
    filterBtnsByTagNestRule(undefined, ["pauseEnum", "emotionEnum"]),
    true
  );
}
const emotionVal = ref("");
const emotionText = ref("");
/**
 * 情绪显示
 * @param {*} name
 */
function emotionFun(name) {
  const emotionButton = document.querySelector('.jodit-toolbar-button_emotionEnum .jodit-toolbar-button__button');
  if (emotionButton) {
    const span = document.createElement('span');
    span.textContent = `情绪 - ${name.desc}`;
    emotionButton.innerHTML = '';
    emotionButton.appendChild(span);
  }
  emotionVal.value = name.value;
  emotionText.value = name.desc;
}
window.emotionFun = emotionFun;

// 试听start
const audioPlayer = ref(null);
const playing = ref(false);
async function auditionClick() {
  if (document.querySelector(".jodit-wysiwyg").innerHTML == "") {
    tipsFun("没有内容无法试听", 1500);
    return;
  }
  if (editorText.value.length > 2000) {
    tipsFun("编辑内容不能超过2000字", 1500);
    return;
  }
  const audioElRef = audioPlayer.value;
  // 如果正在播放：暂停
  if (playing.value) {
    audioElRef.pause();
    document.querySelector(
      ".jodit-toolbar-button_audition .jodit-icon"
    ).style.backgroundImage = `url('${audition}')`;
    playing.value = false;
    return;
  }
  // 如果内容没有变化：切换播放状态
  if (ssmlHTML.value == htmlToSsml()) {
    setTimeout(togglePlayback, 0);
  } else {
    auditionFun();
    // 调用后端方法，后端判断是否触发试听
    // if (developMode) {
    //   auditionFun();
    // } else {
    //   psyaiAudition(editorText.value);
    // }
  }
}
async function auditionFun() {
  //试听接口
  loaderShow.value = true;
  window.postMessage(
    {
      payload: {
        type: "ssml_gen_audio",
        data: {
          text: htmlToSsml(),
          original_text: editorText.value,
          speed: propsData.speed,
          timbre_id: propsData.timbre_id,
        },
      },
    },
    "*"
  );
}
/**
 * 试听播放/暂停
 */
const togglePlayback = () => {
  const audioElRef = audioPlayer.value;
  if (playing.value) {
    audioElRef.pause();
    document.querySelector(
      ".jodit-toolbar-button_audition .jodit-icon"
    ).style.backgroundImage = `url('${audition}')`;
  } else {
    audioElRef.play();
    document.querySelector(
      ".jodit-toolbar-button_audition .jodit-icon"
    ).style.backgroundImage = `url('${suspend}')`;
  }
  playing.value = !playing.value;
};
/**
 * 播放结束
 */
function onAudioEnded() {
  document.querySelector(
    ".jodit-toolbar-button_audition .jodit-icon"
  ).style.backgroundImage = `url('${audition}')`;

  playing.value = false;
}
// 试听end

// 编辑start
/**
 * 富文本编辑器内容点击事件
 */
//function contenteditableFunFalse(){
//  var editor = document.querySelector(".jodit-wysiwyg");
//  disabledAll(false)
//  editor.setAttribute("contenteditable", "true");
//}
/**
 * 编辑区可编辑
 */
function contenteditableFunTrue() {
  var editor = document.querySelector(".jodit-wysiwyg");
  if (editor.getAttribute("contenteditable") === "false") {
    editor.setAttribute("contenteditable", "true");
  }
}
function disabledAll(type) {
  disabledState(
    [
      // 'undoButton', //撤销
      // 'redoButton',//恢复
      "pauseEnum", //停顿
      "speechSpeedEnum", //局部语速
      "continuous", //连续词语
      "pinyin", //多音字
      "digitSymbolEnum", //数字符号
      "volumeEnum", // 音量
      "toneEnum", //音调
      "emotionEnum", //情绪
    ],
    type
  );
}
/**
 * 批量调整按钮状态：可用的按钮根据状态设置，不可用的按钮全部禁用
 * @param {*} arr 按钮列表
 * @param {*} enable true：启用 false：禁用
 */
function disabledState(arr, enable) {
  function disabled(name, type) {
    const pauseButton = document.querySelector(`.jodit-toolbar-button_${name}`);
    if (pauseButton) {
      if (type) {
        pauseButton.classList.remove("disabled");
      } else {
        pauseButton.classList.add("disabled");
      }
    }
  }
  arr.forEach((d) => {
    const finalStatus =
      d === "audition"
        ? enable
        : speakerCompanyAvalibleTags.value.includes(d)
        ? enable
        : false;
    disabled(d, finalStatus);
  });
}
/**
 * 根据公司是否可用过滤按钮
 * @param wantToUseBtns 想要使用的按钮
 */
function filterBtnsByCompanyAvalible(wantToUseBtns) {
  return wantToUseBtns.filter((e) =>
    speakerCompanyAvalibleTags.value.includes(e)
  );
}
function arrayContainsArray(superset, subset) {
  return subset.every((value) => superset.includes(value));
}
function getCursorPosition() {
  // 获取 Jodit 实例
  const editor = editorRef.value.editor;
  // 获取 Selection 对象
  const selection = editor.editorWindow.getSelection();
  // 获取 Range 对象
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    // 获取光标位置
    const cursorPosition = range.startOffset;
    return cursorPosition;
  }
  return null;
}
function getCursorTag() {
  // 获取 Jodit 实例
  const editor = editorRef.value.editor;
  // 获取 Selection 对象
  const selection = editor.editorWindow.getSelection();
  // 获取光标所在的节点
  const node = selection.anchorNode;
  // 获取光标所在的标签
  const tag = node.parentNode;
  return tag;
}
/**
 * 在设置按钮状态时，先根据外层标签+标签嵌套规则 过滤可用按钮
 * @param wrapTag 包裹标签
 * @param wantToUseBtns 想要使用的按钮
 */
function filterBtnsByTagNestRule(wrapTag, wantToUseBtns) {
  return SSML_TAG_NEST_RULE[wrapTag]
    ? wantToUseBtns.filter((e) => SSML_TAG_NEST_RULE[wrapTag].includes(e))
    : wantToUseBtns;
}
function getSelectionStrAsync() {
  return new Promise((resolve) => {
    setTimeout(() => {
      const selectionStr = window.getSelection().toString();
      resolve(selectionStr);
    }, 100);
  });
}
function isZeroWidthSpaceSelected() {
  var selection = window.getSelection(); // 获取当前的选区
  if (selection.rangeCount > 0) {
    var range = selection.getRangeAt(0); // 获取选区的范围
    var text = range.toString(); // 获取选区范围内的文本
    if (text.includes("\uFEFF")) {
      // &#xFEFF 存在于选区范围内
      return true;
    }
  }
  // &#xFEFF 不存在于选区范围内
  return false;
}
/**
 * 编辑区点击
 */
async function handleEditorContentClick(event) {
  console.log("--------editor content click start--------");
  contenteditableFunTrue();
  if (!event.target) return;

  const clickTargetElType = event.target.dataset.type;
  function getSelectedElement() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = document.createElement("div");
      container.appendChild(range.cloneContents());
      // 获取选中的标签
      const selectedTags = Array.from(container.querySelectorAll("*"));
      const selectedSSMLTags = Array.from(
        container.querySelectorAll(".editorTags")
      ).map((tag) => tag?.classList?.value?.split(" ")[1]);
      const selectedTagNames = selectedTags.map((e) => e.tagName.toLowerCase());
      const selectedPreTags = selectedTagNames.filter((d) => d === "pre");
      return { selectedPreTags, selectedSSMLTags };
    }
  }
  // 调用函数以获取选中的DOM元素
  function checkSentenceCompleteness(str) {
    // const sentenceEndings = ['.', '?', '!', '。', '？', '！', 'br',''];
    // // 获取字符串的第一个字符和最后一个字符
    // const firstChar = str.trim().charAt(0);
    // const lastChar = str.trim().slice(-1);
    // // 判断第一个字符和最后一个字符是否为句子结尾标点符号
    // if (sentenceEndings.includes(firstChar) && sentenceEndings.includes(lastChar)) {
    //   return true;
    // } else {
    //   return false;
    // }
    var selection = window.getSelection();
    var selectedText = selection.toString();

    if (selectedText.length >= 500) {
      return false;
    } else {
      return true;
    }
  }
  // 选中的文本：延时获取，修复点击选中文本后，选中文本仍然存在的问题
  const selectionStr = await getSelectionStrAsync();
  // 根据选中的内容设置按钮可用状态
  if (selectionStr) {
    // 判断是否是数字
    if (/^\d+$/.test(selectionStr)) {
      disabledAll(false);
      disabledState(
        filterBtnsByTagNestRule(clickTargetElType, [
          "speechSpeedEnum", // 局部语速
          "continuous", // 连续词语
          "digitSymbolEnum", // 数字符号
          "volumeEnum", // 音量
          "toneEnum", // 音调
          "emotionEnum", // 情绪
        ]),
        true
      );
    } else if (selectionStr.length == 1) {
      if (isZeroWidthSpaceSelected()) {
        disabledAll(false);
        disabledState(
          filterBtnsByTagNestRule(clickTargetElType, [
            "pauseEnum",
            "emotionEnum",
          ]),
          true
        );
      } else {
        // 判断是否单个字选择
        disabledAll(false);
        disabledState(
          filterBtnsByTagNestRule(clickTargetElType, [
            "speechSpeedEnum", //局部语速
            "pinyin", // 多音字
            "volumeEnum", // 音量
            "toneEnum", // 音调
            "emotionEnum", // 情绪
          ]),
          true
        );
      }
    } else if (selectionStr.length > 1) {
      const { selectedPreTags, selectedSSMLTags } = getSelectedElement();
      if (selectedPreTags.length % 2) {
        // 判断不能跨标签插入标签
        disabledAll(false);
        disabledState(
          filterBtnsByTagNestRule(clickTargetElType, [
            "emotionEnum", // 情绪
          ]),
          true
        );
        tipsFun("划选范围有误");
      } else if (selectedSSMLTags.length) {
        // 根据内层标签+标签嵌套规则，判断按钮是否可用
        disabledAll(false);
        disabledState(
          [
            "pauseEnum", //停顿
            "speechSpeedEnum", //局部语速
            "continuous", //连续词语
            "digitSymbolEnum", //数字符号
            "volumeEnum", // 音量
            "toneEnum", //音调
          ].filter((e) =>
            SSML_TAG_NEST_RULE[e]
              ? arrayContainsArray(SSML_TAG_NEST_RULE[e], selectedSSMLTags)
              : false
          ),
          true
        );
      } else if (checkSentenceCompleteness(selectionStr)) {
        //判断是否是完整句子
        disabledAll(false);
        disabledState(
          filterBtnsByTagNestRule(clickTargetElType, [
            "speechSpeedEnum", //局部语速
            "continuous", //连续词语
            "volumeEnum", // 音量
            "toneEnum", //音调
            "emotionEnum", //情绪
          ]),
          true
        );
      }
    } else {
      disabledAll(false);
      disabledState(
        filterBtnsByTagNestRule(clickTargetElType, [
          "speechSpeedEnum", // 局部语速
          "continuous", // 连续词语
          "emotionEnum", // 情绪
        ]),
        true
      );
    }
    disabledState(["pauseEnum"], false);
  } else {
    // 当没有选择文字的时候
    disabledAll(false);
    disabledState(
      filterBtnsByTagNestRule(clickTargetElType, ["pauseEnum", "emotionEnum"]),
      true
    );
  }

  // 标签下拉项
  if (
    event.target.getAttribute("data-index") &&
    event.target.getAttribute("data-index") >= 0
  ) {
    let valTextDom;
    if (event.target.getAttribute("data-type") == "pauseEnum") {
      valTextDom = event.target.parentElement.parentElement.parentElement;
    } else {
      valTextDom =
        event.target.parentElement.parentElement.parentElement.querySelector(
          ".valText"
        );
    }
    valTextDom.setAttribute(
      "data-type",
      event.target.getAttribute("data-type")
    );
    valTextDom.setAttribute(
      "data-desc",
      event.target.getAttribute("data-desc")
    );
    valTextDom.setAttribute("data-val", event.target.getAttribute("data-val"));
    valTextDom.setAttribute(
      "data-numVal",
      event.target.getAttribute("data-numVal")
    );
    valTextDom.setAttribute(
      "data-mark",
      event.target.getAttribute("data-mark")
    );

    // const noneNode =
    //   event.target.parentElement.parentElement.querySelector(".noneNode");
    // noneNode.innerText = event.target.getAttribute("data-val");

    // disabledState(["pauseEnum"], false);
    Array.from(event.target.parentElement.children).forEach((item) => {
      if (item.children) {
        item.children[0].className = "";
      }
    });
    event.target.children[0].className = "active";
    event.target.parentElement.parentElement.children[0].innerHTML =
      event.target.innerText;
    event.target.parentElement.className = "editorTagsOptionBox";
  }
  // 标签按钮
  else if (event.target.getAttribute("data-optionBtn")) {
    // disabledState(["pauseEnum"], false);
    // 1.屏幕滑动 下拉框 也跟着动
    // var parentRect = document.querySelector('.jodit-workplace').getBoundingClientRect();
    // event.target.children[1].style.left = event.target.offsetLeft+parentRect.left+'px';
    // event.target.children[1].style.top = 2+event.target.offsetTop+parentRect.top+event.target.offsetHeight-document.querySelector('.jodit-wysiwyg').scrollTop+'px';
    // event.target.children[1].style.position = 'fixed';
    if (event.target.getAttribute("data-isShow")) {
      event.target.lastElementChild.className = "editorTagsOptionBox";
      event.target?.removeAttribute("data-isShow");
    } else {
      event.target.lastElementChild.className = "editorTagsOptionBox cur";
      event.target.setAttribute("data-isShow", "true");
      event.target.lastElementChild.style.removeProperty("left");
      event.target.lastElementChild.style.removeProperty("top");
      var parentRect = document
        .querySelector(".jodit-workplace")
        .getBoundingClientRect();
      var eventLeft = event.target.offsetLeft;
      var eventTop = event.target.offsetTop;
      var eventHeight = event.target.offsetHeight;
      var eventWidth = event.target.offsetWidth;
      var eventChildWidth = event.target.lastElementChild.offsetWidth;
      var eventChildTop = event.target.lastElementChild.offsetTop;
      var eventChildHeight = event.target.lastElementChild.offsetHeight;
      var joditBox = document.querySelector(".jodit-wysiwyg");
      // 判断下拉菜单是否超过右侧界，超界往左侧移动
      if (eventLeft + eventChildWidth >= joditBox.offsetWidth) {
        event.target.lastElementChild.style.left =
          -(eventLeft + eventChildWidth - joditBox.offsetWidth + 20) + "px";
      }
      // 判断是否是一行还是两行，下拉菜单是否换第一行，还是第二行
      if (eventHeight > 40) {
        if (event.offsetX <= 400) {
          event.target.lastElementChild.style.left = -eventLeft + 15 + "px";
          event.target.lastElementChild.style.top =
            eventChildTop + eventHeight / 2 + "px";
        }
      }
      // 判断 下拉菜单 没有展示全，移动到合适的地方。
      if (
        event.pageY - parentRect.top + eventChildHeight >
        joditBox.offsetHeight
      ) {
        joditBox.scrollTo({
          top:
            joditBox.scrollTop +
            (event.pageY -
              parentRect.top +
              eventChildHeight -
              joditBox.offsetHeight +
              20),
          behavior: "smooth", // 设置过渡动画
        });
      }
    }
  }
  // 移除
  else if (
    event.target.getAttribute("data-index") &&
    event.target.getAttribute("data-index") < 0
  ) {
    // 移除
    const parentElement =
      event.target.parentElement.parentElement.parentElement;
    const editorTagsElementsTags =
      parentElement.querySelectorAll(".editorTags");
    if (editorTagsElementsTags.length) {
      tipsFun("移除此标签，请先把它内部标签先移除掉。");
      return;
    }
    const valTextElement = Array.from(
      event.target.parentNode.parentNode.parentNode.children
    ).find((child) => child.classList.contains("valText"));
    const editorTagsElements = event.target.parentNode.parentNode.parentNode;
    const spanElement = document.createElement("span");
    spanElement.className = "classTxt";
    if (valTextElement) {
      const range = document.createRange();
      const fragment = range.createContextualFragment(valTextElement.innerHTML);
      editorTagsElements.parentNode.insertBefore(
        fragment,
        editorTagsElements.nextSibling
      );
    }
    editorTagsElements.remove();
    // disabledState(["pauseEnum"], false);
  }
}
function removeEditorTagsOptionBox(element) {
  // 标签
  const editorTagsOptionBoxRegex =
    /<div class="editorTagsOptionBox"[^>]*>[\s\S]*?<\/div>/g;
  // 标签下拉框
  const editorListRegex = /<div class="editorList"[^>]*>[\s\S]*?<\/div>/g;
  // const classTxtRegex = /<span class="classTxt"[^>]*>[\s\S]*?<\/span>/g;
  const editorTagsOptionRegex =
    /<div class="optionBtn editorTagsOption[^>]*>[\s\S]*?<\/div>/g;
  const preRegex = /<pre[^>]*>[\s\S]*?<\/pre>/g;
  const emRegex = /<em[^>]*>[\s\S]*?<\/em>/g;
  const iRegex = /<i[^>]*>[\s\S]*?<\/i>/g;
  const nbspRegex = /&nbsp;/g;
  let processedHTML = element.innerHTML.replace(editorTagsOptionBoxRegex, "");
  processedHTML = processedHTML.replace(editorListRegex, "");
  // processedHTML = processedHTML.replace(classTxtRegex, '');
  processedHTML = processedHTML.replace(editorTagsOptionRegex, "");
  processedHTML = processedHTML.replace(preRegex, "");
  processedHTML = processedHTML.replace(emRegex, "");
  processedHTML = processedHTML.replace(iRegex, "");
  processedHTML = processedHTML.replace(nbspRegex, "");
  processedHTML = processedHTML.replace(
    /<div class="editorTags pauseEnum"[^>]*>/g,
    ""
  );
  processedHTML = processedHTML.replace(
    /<div class="editorTags speechSpeedEnum"[^>]*>/g,
    ""
  );
  processedHTML = processedHTML.replace(
    /<div class="editorTags continuous"[^>]*>/g,
    ""
  );
  processedHTML = processedHTML.replace(
    /<div class="editorTags pinyin"[^>]*>/g,
    ""
  );
  processedHTML = processedHTML.replace(
    /<div class="editorTags digitSymbolEnum"[^>]*>/g,
    ""
  );
  processedHTML = processedHTML.replace(
    /<div class="editorTags volumeEnum"[^>]*>/g,
    ""
  );
  processedHTML = processedHTML.replace(
    /<div class="editorTags toneEnum"[^>]*>/g,
    ""
  );
  processedHTML = processedHTML.replace(
    /<div class="editorTags emotionEnum"[^>]*>/g,
    ""
  );
  processedHTML = processedHTML.replace(/<\/div>/g, "");

  return processedHTML;
}
/**
 * 编辑区内容变化
 */
function editorContentChange(content) {
  console.log("--------editor content change start--------");
  document.querySelector(".ssmlHtml").innerHTML = removeEditorTagsOptionBox(
    document.querySelector(".jodit-wysiwyg")
  );
  setTimeout(() => {
    editorText.value = unescapeSpecialCharacters(
      htmlToSsml().replace(/<[^>]+>/g, "")
    );
    // realTimeFun(editorText.value);
  }, 50);
  disabledState(["audition"], !!content.trim().length);
}
// 编辑end

/**
 * 取消
 */
function canceEditor() {
  playing.value = false;
  window.postMessage(
    {
      payload: {
        type: "ssml_cancel",
      },
    },
    "*"
  );
  // psyaiCancelFun();
}
/**
 * 保存
 */
function confirmClick() {
  if (editorText.value.length > 2000) {
    tipsFun("编辑内容不能超过2000字", 1500);
    return;
  }
  // 保存接口
  // 编辑器中的内容
  saveDataHTML.value = document.querySelector(".jodit-wysiwyg").innerHTML;
  // 编辑器中的内容转换成SSML格式
  saveDataSSML.value = htmlToSsml();
  // 编辑器中的内容转换成字符串格式
  saveDataStr.value = editorText.value;
  window.postMessage(
    {
      payload: {
        type: "ssml_confirm",
        data: {
          saveDataHTML: saveDataHTML.value,
          saveDataSSML: saveDataSSML.value,
          saveDataStr: saveDataStr.value,
          emotionText: emotionText.value,
          emotionValue: emotionVal.value,
        },
      },
    },
    "*"
  );
}
/**
 * 将html标签转为ssml标签：如果是可用标签，则转换为ssml标签，否则只获取内容文本
 * 同时对文本内容进行特殊字符转义
 */
function htmlToSsml() {
  function replaceTags(element) {
    // 创建一个空字符串来存储新的内容
    var newContent = "";
    // 遍历子节点
    for (var i = 0; i < element.childNodes.length; i++) {
      var node = element.childNodes[i];

      // 如果是元素节点
      if (node.nodeType === 1) {
        // 获取元素节点的data-type属性值
        var dataType = node.getAttribute("data-type");
        var dataMark = node.getAttribute("data-mark");
        var dataVal = node.getAttribute("data-val");
        var dataNumVal = node.getAttribute("data-numVal");

        const getContent = () => replaceTags(node);
        switch (dataType) {
          case "pauseEnum":
            newContent += realSsmlTags.value[dataType]
              ? realSsmlTags.value[dataType](dataVal)
              : getContent();
            break;
          case "speechSpeedEnum":
            newContent += realSsmlTags.value[dataType]
              ? realSsmlTags.value[dataType](getContent(), dataVal)
              : getContent();
            break;
          case "continuous":
            newContent += realSsmlTags.value[dataType]
              ? realSsmlTags.value[dataType](getContent(), dataVal)
              : getContent();
            break;
          case "pinyin":
            newContent += realSsmlTags.value[dataType]
              ? realSsmlTags.value[dataType](getContent(), [
                  dataVal,
                  dataNumVal,
                ])
              : getContent();
            break;
          case "digitSymbolEnum":
            newContent += realSsmlTags.value[dataType]
              ? realSsmlTags.value[dataType](
                  getContent(),
                  dataMark && dataMark !== "null"
                    ? navDataList[dataType].find(
                        (e) => e.item_mark === dataMark
                      )?.value
                    : dataVal
                )
              : getContent();
            break;
          case "volumeEnum":
            newContent += realSsmlTags.value[dataType]
              ? realSsmlTags.value[dataType](getContent(), dataVal)
              : getContent();
            break;
          case "toneEnum":
            newContent += realSsmlTags.value[dataType]
              ? realSsmlTags.value[dataType](getContent(), dataVal)
              : getContent();
            break;
          default:
            newContent += getContent();
        }
      } else {
        // 如果是文本节点，则直接将内容添加到新的内容字符串中
        newContent += escapeSpecialCharacters(node.textContent);
      }
    }

    return newContent;
  }
  // 选择所有的<span>元素
  let ssmlHtml = document.querySelector(".ssmlHtml");
  const processedHTML = replaceTags(ssmlHtml).toString();
  // const processedStr = `<speak version=\"1.0\" xmlns=\"http://www.w3.org/2001/10/synthesis\" xmlns:mstts=\"https://www.w3.org/2001/mstts\" xml:lang=\"${PsyaiLangID.value}\"><voice name=\"${PsyaiVoiceID.value}\"><mstts:express-as style=\"${emotionVal.value}\">${processedHTML}</mstts:express-as></voice></speak>`;
  const processedStr = realSsmlTags.value.wrapper(
    processedHTML,
    PsyaiLangID.value,
    PsyaiVoiceID.value,
    emotionVal.value
  );
  // var str = processedStr.replace(/[\s\r\n]+(?![^<>]*>)/g, "");
  let str = processedStr.replace(/[\t\r\n]+(?![^<>]*>)/g, "");
  str = str.replace(/ {2,}/g, " ");
  return str;
}
function keyDown() {
  // 键盘事件
  document.addEventListener("keydown", function (event) {
    var editorNum = editorText.value; // 获取删除前的全部文本
    var initialLength = editorNum.length; // 获取删除前的文本长度
    // 删除键
    if (event.keyCode === 8 || event.keyCode === 46) {
      setTimeout(function () {
        var updatedLength = editorText.value.length; // 获取删除后的文本长度
        if (updatedLength < initialLength) {
          // console.log("文本被删除");
          //当没有选择文字的时候
          disabledAll(false);
          disabledState(["pauseEnum", "emotionEnum"], true);
        } else {
          // console.log("未删除文本");
        }
      }, 100);
    }
  });
  //这个纯文本，复制函数，有一个浏览器安全保护机制，点击允许才能使用
  // document.addEventListener('keydown', function(event) {
  //   if (event.keyCode === 86 && event.ctrlKey) {
  //     event.preventDefault();
  //     navigator.clipboard.readText().then(function(content) {
  //       var editor = document.querySelector('.jodit-wysiwyg');
  //       var selection = window.getSelection();
  //       var range = selection.getRangeAt(0);
  //       range.deleteContents();
  //       var textNode = document.createTextNode(content);
  //       range.insertNode(textNode);
  //       range.setStartAfter(textNode);
  //       range.setEndAfter(textNode);
  //       selection.removeAllRanges();
  //       selection.addRange(range);
  //     }).catch(function(error) {
  //       console.error(error);
  //     });
  //   }
  // });
}

async function handleMessage(event) {
  // 主应用在加载子应用时发起postMessage，并传送初始化数据
  if (event.data?.payload?.type === "init_props") {
    if (event.data.payload.data.open && event.data.payload.data.data) {
      setProps(event.data.payload.data.data);
      // 发起ssml_init message，在主应用内发起获取初始化数据的接口请求
      window.postMessage(
        {
          payload: {
            type: "ssml_init",
          },
        },
        "*"
      );
    }
  }
  if (event.data?.payload?.type === "ssml_init_callback") {
    // const data = await querySpeaker(propsData.virtualmanKey);
    // const labelData = await voiceEditorData();

    const { labelData } = event.data.payload.data;
    // Object.assign(speakerInfo, speakerData);
    Object.assign(navDataList, labelData[speakerCompany.value]);
    console.log(speakerCompany.value, "speakerCompany.value");
    disabledAll(false);
    disabledState(["emotionEnum"], true);
    editorContentHtml.value = propsData.text;
    setTimeout(() => {
      const el = document.querySelector(".jodit-wysiwyg");
      el.focus();
      moveCursorToEnd(el);
    }, 300);
    function moveCursorToEnd(el) {
      if (
        typeof window.getSelection != "undefined" &&
        typeof document.createRange != "undefined"
      ) {
        var range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } else if (typeof document.body.createTextRange != "undefined") {
        var textRange = document.body.createTextRange();
        textRange.moveToElementText(el);
        textRange.collapse(false);
        textRange.select();
      }
    }
    if (!speakerCompanyAvalibleTags.value.length) {
      tipsFun("当前音色暂不支持语音标签调节设置", 1500);
    }
  }
  if (event.data?.payload?.type === "ssml_get_pinyin_callback") {
    const pinyinText = event.data.payload.data;
    if (pinyinText) {
      const transformedArr = pinyinText.tone[0].map((value, i) => {
        return { value, desc: value, numValue: pinyinText.toneNum[0][i] };
      });
      navDataList.pinyin = transformedArr;
    }
  }
  if (event.data?.payload?.type === "ssml_gen_audio_callback") {
    const url = event.data.payload.data;
    if (url) {
      audioSrc.value = url;
      setTimeout(togglePlayback, 0);
      ssmlHTML.value = htmlToSsml();
    } else {
      tipsFun("生成失败", 1500);
    }
    setTimeout(() => (loaderShow.value = false), 500);
  }
}
async function setProps(props) {
  Object.assign(propsData, props);

  // window.psyaiEditorUrl = props.baseUrl + "/";
  // window.psyaiEditorToken = props.token;
  // window.psyaiEditorUid = props.uid;
  // 标题
  psyaiTextEditorTitles.value = props.title;

  PsyaiLangID.value = props.psyaiLangReplace;
  PsyaiVoiceID.value = props.psyaiVoiceReplace;

  if (props.emotionValue === undefined || props.emotionValue === "") {
    console.log(props);
  } else {
    // 情绪显示
    emotionFun({
      value: props.emotionValue,
      desc: props.emotionText,
    });
  }
}

function init() {
  console.log("mounted");
  const editor = document.querySelector(".jodit-wysiwyg");
  document
    .querySelector(".jodit-toolbar-editor-collection")
    .classList.add("animationTop");
  editor.addEventListener("dragstart", function () {
    editor.setAttribute("contenteditable", "false");
    isClick.value = false;
  });

  editor.addEventListener("dragend", function () {
    editor.setAttribute("contenteditable", "true");
  });
  function checkPreviousBR() {
    var selection = window.getSelection();
    var anchorNode = selection.anchorNode;
    var previousSibling = anchorNode.previousSibling;

    var isPreviousSiblingBR = false;
    if (previousSibling && previousSibling.nodeName === "BR") {
      isPreviousSiblingBR = true;
    }

    var selectedText = selection.toString();
    var documentText = document.documentElement.innerText;
    var textPosition = documentText.indexOf(selectedText);

    if (textPosition !== -1) {
      var previousCharacter = documentText.charAt(textPosition - 1);

      var parentNode = anchorNode.parentNode;
      if (parentNode.nodeType === 1) {
        // console.log('选中文字旁边的元素：', parentNode);
      }
    }
    // console.log('选中的文字旁边上一位的元素是否为 <br> 标签：', isPreviousSiblingBR);
    // console.log('选中文字在当前文档中的位置：', textPosition);
    // console.log('选中文字旁边的字符：', previousCharacter);
  }

  // 监听鼠标松开事件
  //   document.addEventListener('mouseup', checkPreviousBR);

  document.addEventListener("mouseup", function (event) {
    // console.log(event.target.className!='jodit-wysiwyg',window.getSelection().toString(),isClick.value);
    //     if(event.target.className!='jodit-wysiwyg'&&
    //         event.target.parentNode.className !='jodit-wysiwyg'&&
    //         &&window.getSelection().toString()&&isClick.value){
    //       tipsFun('选中标签的时候，鼠标移出编辑器之外，会禁止上面部分的功能')
    //       isClick.value=true;
    //       disabledAll(false)
    //     }else{
    //       isClick.value=true;
    //     }
    let target = event.target;
    let isJoditWysiwyg = false;

    while (target && target.className !== "jodit-wysiwyg") {
      target = target.parentNode;
    }

    if (target && target.className === "jodit-wysiwyg") {
      isJoditWysiwyg = true;
    }

    if (!isJoditWysiwyg && window.getSelection().toString() && isClick.value) {
      tipsFun("选中标签的时候，鼠标移出编辑器之外，会禁止上面部分的功能");
      isClick.value = true;
      disabledAll(false);
    } else {
      isClick.value = true;
    }
  });

  document.addEventListener("mousedown", function (event) {
    if (
      event.target.className != "jodit-wysiwyg" &&
      window.getSelection().toString()
    ) {
      isClick.value = false;
    }
  });

  document
    .querySelector(".jodit-wysiwyg")
    .addEventListener("scroll", function () {
      //滚动隐藏 下拉框
      // const editorTagsOptionBox=document.querySelectorAll('.editorTagsOptionBox')
      // editorTagsOptionBox.forEach(function(element) {
      //   element.className='editorTagsOptionBox';
      // });
      //1.屏幕滑动 下拉框 也跟着动
      // var parentRect = document.querySelector('.jodit-workplace').getBoundingClientRect();
      // const editorTagsOption=document.querySelectorAll('.editorTagsOption')
      // editorTagsOption.forEach(function(element) {
      //   var elementTop = element.offsetTop - document.querySelector('.jodit-wysiwyg').scrollTop;
      //   if(document.querySelector('.editorTagsOptionBox.cur')) {
      //     element.children[1].style.top = 2 + parentRect.top + element.offsetHeight + elementTop + 'px'
      //   }
      // });
    });

  document.addEventListener("mouseover", function (e) {
    if (e.target.className?.includes?.("optionBtn")) {
      if (e.target.parentElement.className.includes("editorTags--disabled")) {
        const { top, left } = e.target.getBoundingClientRect();
        const { top: wrapTop, left: wrapLeft } = document
          .querySelector(".voiceEditorBg")
          .getBoundingClientRect();
        const tipEl = document.querySelector(".global-disabled-tip");
        tipEl.style.display = "block";
        tipEl.style.top = top - wrapTop - 37 + "px";
        tipEl.style.left = left - wrapLeft + "px";
      }
    }
    // if (e.target.className.includes("editorList")) {
    //   e.target.parentElement.previousElementSibling.classList.add("hide");
    // }
  });
  document.addEventListener("mouseout", function (e) {
    if (e.target.className?.includes?.("optionBtn")) {
      if (e.target.parentElement.className.includes("editorTags--disabled")) {
        document.querySelector(".global-disabled-tip").style.display = "none";
      }
    }
    // if (e.target.className.includes("editorList")) {
    //   e.target.parentElement.previousElementSibling.classList.remove("hide");
    // }
  });

  window.addEventListener("message", handleMessage);
}

onMounted(init);
onBeforeUnmount(() => {
  console.log("onBeforeUnmount");
  window.removeEventListener("message", handleMessage);
});
</script>
<style lang="less" scoped>
.middle {
  position: relative;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
}
</style>
