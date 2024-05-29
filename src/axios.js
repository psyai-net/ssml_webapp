import axios from "axios";

const Host =
  location.host === "dev.psyai.net"
    ? "https://dev.api.psyai.net"
    : location.host === "psyai.com" || location.host === "www.psyai.com"
    ? "https://api.psyai.net"
    : ""; // build

const Axios = axios.create({
  validateStatus: (s) => s === 200,
  baseURL: Host,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

Axios.interceptors.request.use(
  function (config) {
    config.headers.token = window.psyaiEditorToken;
    config.headers.uid = window.psyaiEditorUid;
    return config;
  },
  function (error) {
    return Promise.reject(error);
  }
);
Axios.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = (error && error.response && error.response.status) || 500;
    switch (status) {
      case 500:
        return (
          (error.response && error.response.data) || {
            code: "NONE_DATA",
            msg: "问服务端为什么没有返回code",
          }
        );
    }
    return Promise.reject(error);
  }
);

export default Axios;
