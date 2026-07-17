import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { App } from "./app/App";
import { AppUpdateNotice } from "./shared/components/AppUpdateNotice";
import "./styles/global.css";

const Router = import.meta.env.MODE === "github-pages" ? HashRouter : BrowserRouter;

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Router>
      <App />
      <AppUpdateNotice />
      <ToastContainer
        position="bottom-right"
        autoClose={3200}
        hideProgressBar
        newestOnTop
        closeButton
        pauseOnFocusLoss={false}
        pauseOnHover
        draggable={false}
        theme="light"
      />
    </Router>
  </React.StrictMode>
);
