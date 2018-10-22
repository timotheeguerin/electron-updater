import { URL } from "url";
export { AppUpdater, NoOpLogger } from "./AppUpdater";
export { CancellationToken } from "builder-util-runtime";
export { Provider } from "./providers/Provider";
// autoUpdater to mimic electron bundled autoUpdater
let _autoUpdater;
function _load_autoUpdater() {
    // tslint:disable:prefer-conditional-expression
    if (process.platform === "win32") {
        _autoUpdater = new (require("./NsisUpdater").NsisUpdater)();
    }
    else if (process.platform === "darwin") {
        _autoUpdater = new (require("./MacUpdater").MacUpdater)();
    }
    else {
        _autoUpdater = new (require("./AppImageUpdater").AppImageUpdater)();
    }
    return _autoUpdater;
}
Object.defineProperty(exports, "autoUpdater", {
    enumerable: true,
    get: () => {
        return _autoUpdater || _load_autoUpdater();
    }
});
// due to historical reasons for windows we use channel name without platform specifier
export function getDefaultChannelName() {
    return `latest${getChannelFilePrefix()}`;
}
function getChannelFilePrefix() {
    const currentPlatform = getCurrentPlatform();
    if (currentPlatform === "linux") {
        const arch = process.env.TEST_UPDATER_ARCH || process.arch;
        const archSuffix = arch === "x64" ? "" : `-${arch}`;
        return "-linux" + archSuffix;
    }
    else {
        return currentPlatform === "darwin" ? "-mac" : "";
    }
}
export function getCustomChannelName(channel) {
    return `${channel}${getChannelFilePrefix()}`;
}
export function getCurrentPlatform() {
    return process.env.TEST_UPDATER_PLATFORM || process.platform;
}
export function isUseOldMacProvider() {
    // getCurrentPlatform() === "darwin"
    return false;
}
export function getChannelFilename(channel) {
    return `${channel}.yml`;
}
export const DOWNLOAD_PROGRESS = "download-progress";
export const UPDATE_DOWNLOADED = "update-downloaded";
export class UpdaterSignal {
    constructor(emitter) {
        this.emitter = emitter;
    }
    /**
     * Emitted when an authenticating proxy is [asking for user credentials](https://github.com/electron/electron/blob/master/docs/api/client-request.md#event-login).
     */
    login(handler) {
        addHandler(this.emitter, "login", handler);
    }
    progress(handler) {
        addHandler(this.emitter, DOWNLOAD_PROGRESS, handler);
    }
    updateDownloaded(handler) {
        addHandler(this.emitter, UPDATE_DOWNLOADED, handler);
    }
    updateCancelled(handler) {
        addHandler(this.emitter, "update-cancelled", handler);
    }
}
const isLogEvent = false;
function addHandler(emitter, event, handler) {
    if (isLogEvent) {
        emitter.on(event, (...args) => {
            console.log("%s %s", event, args);
            handler.apply(null, args);
        });
    }
    else {
        emitter.on(event, handler);
    }
}
// if baseUrl path doesn't ends with /, this path will be not prepended to passed pathname for new URL(input, base)
/** @internal */
export function newBaseUrl(url) {
    const result = new URL(url);
    if (!result.pathname.endsWith("/")) {
        result.pathname += "/";
    }
    return result;
}
// addRandomQueryToAvoidCaching is false by default because in most cases URL already contains version number,
// so, it makes sense only for Generic Provider for channel files
export function newUrlFromBase(pathname, baseUrl, addRandomQueryToAvoidCaching = false) {
    const result = new URL(pathname, baseUrl);
    // search is not propagated (search is an empty string if not specified)
    const search = baseUrl.search;
    if (search != null && search.length !== 0) {
        result.search = search;
    }
    else if (addRandomQueryToAvoidCaching) {
        result.search = `noCache=${Date.now().toString(32)}`;
    }
    return result;
}
//# sourceMappingURL=main.js.map