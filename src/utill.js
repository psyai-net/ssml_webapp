import errorCode from "./errorCode";

// sleep
export const sleep = (time) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

export function debounce(fn, delay) {
  let time = null;
  return function (...args) {
    if (time != null) {
      clearTimeout(time);
    }
    time = setTimeout(() => {
      fn.call(this, ...args);
    }, delay || 300);
  };
}

export function throttle(fn, delay) {
  let flag = true;
  return function (...args) {
    if (flag) {
      setTimeout(() => {
        fn.call(this, ...args);
        flag = true;
      }, delay || 300);
    }
    flag = false;
  };
}

/*
 *针对错误码表进行检查
 *@request : request body
 */
export function checkResult(request) {
  const { data, code } = request;
  if (code !== -1 && errorCode[code]) {
    return {
      ...errorCode[code],
      code,
    };
  } else if (code !== -1 && !errorCode[code]) {
    return {
      code,
      msg: "系统错误，请稍后再试",
      type: "systemError",
    };
  }
  return data;
}

/**
 * 特殊字符转义
 */
export function escapeSpecialCharacters(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&apos;")
    .replace(/"/g, "&quot;")
    .replace(/\(/g, "&#40;")
    .replace(/\)/g, "&#41;");
}
export function unescapeSpecialCharacters(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#40;/g, "(")
    .replace(/&#41;/g, ")");
}
