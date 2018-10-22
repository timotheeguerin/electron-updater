"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.BaseUpdater = void 0;

function _AppUpdater() {
  const data = require("./AppUpdater");

  _AppUpdater = function () {
    return data;
  };

  return data;
}

class BaseUpdater extends _AppUpdater().AppUpdater {
  constructor(options, app) {
    super(options, app);
    this.quitAndInstallCalled = false;
    this.quitHandlerAdded = false;
  }

  async quitAndInstall(isSilent = false, isForceRunAfter = false) {
    this._logger.info(`Install on explicit quitAndInstall`);

    const isInstalled = await this.install(isSilent, isSilent ? isForceRunAfter : true);

    if (isInstalled) {
      setImmediate(() => {
        if (this.app.quit !== undefined) {
          this.app.quit();
        }
      });
    } else {
      this.quitAndInstallCalled = false;
    }
  }

  executeDownload(taskOptions) {
    return super.executeDownload(Object.assign({}, taskOptions, {
      done: async () => {
        this.addQuitHandler();
      }
    }));
  }

  async install(isSilent, isRunAfter) {
    if (this.quitAndInstallCalled) {
      this._logger.warn("install call ignored: quitAndInstallCalled is set to true");

      return false;
    }

    const installerPath = this.downloadedUpdateHelper.file; // todo check (for now it is ok to no check as before, cached (from previous launch) update file checked in any case)
    // const isValid = await this.isUpdateValid(installerPath)

    if (installerPath == null) {
      this.dispatchError(new Error("No valid update available, can't quit and install"));
      return false;
    } // prevent calling several times


    this.quitAndInstallCalled = true;

    try {
      this._logger.info(`Install: isSilent: ${isSilent}, isRunAfter: ${isRunAfter}`);

      return await this.doInstall(installerPath, isSilent, isRunAfter);
    } catch (e) {
      this.dispatchError(e);
      return false;
    }
  }

  addQuitHandler() {
    if (this.quitHandlerAdded || !this.autoInstallOnAppQuit) {
      return;
    }

    this.quitHandlerAdded = true;
    this.app.once("quit", async () => {
      if (!this.quitAndInstallCalled) {
        this._logger.info("Auto install update on quit");

        await this.install(true, false);
      } else {
        this._logger.info("Update installer has already been triggered. Quitting application.");
      }
    });
  }

} exports.BaseUpdater = BaseUpdater;
//# sourceMappingURL=BaseUpdater.js.map