import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import axios from "axios";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getRetryDelay = (error) => {
  const retryAfter = error?.response?.headers?.["retry-after"];
  const retryAfterSeconds = Number(retryAfter);

  if (Number.isFinite(retryAfterSeconds)) {
    return Math.max(0, retryAfterSeconds * 1000);
  }

  return 1500;
};

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const canRetry = response?.status === 429 || response?.status === 503;

    if (canRetry && config && !config.__rateLimitRetry) {
      config.__rateLimitRetry = true;
      await wait(getRetryDelay(error));
      return axios(config);
    }

    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
