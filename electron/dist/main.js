var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var import_child_process = require("child_process");
var path = __toESM(require("path"));
var net = __toESM(require("net"));
var mainWindow = null;
var backendProcess = null;
import_electron.app.name = "PMS Application";
import_electron.app.setName("PMS Application");
function createWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, "../../build/icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js")
    },
    title: "PMS Application",
    autoHideMenuBar: true
  });
  const checkServer = () => {
    const socket = new net.Socket();
    socket.setTimeout(1e3);
    socket.on("connect", () => {
      socket.destroy();
      mainWindow == null ? void 0 : mainWindow.loadURL("http://localhost:4500");
    });
    socket.on("error", () => {
      socket.destroy();
      setTimeout(checkServer, 500);
    });
    socket.on("timeout", () => {
      socket.destroy();
      setTimeout(checkServer, 500);
    });
    socket.connect(4500, "127.0.0.1");
  };
  checkServer();
}
import_electron.app.whenReady().then(() => {
  if (process.platform === "darwin") {
    import_electron.app.dock.setIcon(path.join(__dirname, "../../build/icon.png"));
  }
  backendProcess = (0, import_child_process.fork)(path.join(__dirname, "../../server/dist/app.js"), [], {
    env: { ...process.env, PORT: "4500" },
    stdio: "inherit"
  });
  createWindow();
  import_electron.app.on("activate", function() {
    if (import_electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
import_electron.app.on("window-all-closed", function() {
  if (process.platform !== "darwin") import_electron.app.quit();
});
import_electron.app.on("before-quit", () => {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
});
