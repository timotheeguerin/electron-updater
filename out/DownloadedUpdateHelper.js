"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.DownloadedUpdateHelper = void 0;

function _crypto() {
  const data = require("crypto");

  _crypto = function () {
    return data;
  };

  return data;
}

function _fs() {
  const data = require("fs");

  _fs = function () {
    return data;
  };

  return data;
}

function _lodash() {
  const data = _interopRequireDefault(require("lodash.isequal"));

  _lodash = function () {
    return data;
  };

  return data;
}

function _fsExtraP() {
  const data = require("fs-extra-p");

  _fsExtraP = function () {
    return data;
  };

  return data;
}

var path = _interopRequireWildcard(require("path"));

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = Object.defineProperty && Object.getOwnPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : {}; if (desc.get || desc.set) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/** @private **/
class DownloadedUpdateHelper {
  constructor(cacheDir) {
    this.cacheDir = cacheDir;
    this._file = null;
    this._packageFile = null;
    this.versionInfo = null;
    this.fileInfo = null;
  }

  get file() {
    return this._file;
  }

  get packageFile() {
    return this._packageFile;
  }

  async validateDownloadedPath(updateFile, versionInfo, fileInfo, logger) {
    if (this.versionInfo != null && this.file === updateFile && this.fileInfo != null) {
      // update has already been downloaded from this running instance
      // check here only existence, not checksum
      if ((0, _lodash().default)(this.versionInfo, versionInfo) && (0, _lodash().default)(this.fileInfo.info, fileInfo.info) && (await (0, _fsExtraP().pathExists)(updateFile))) {
        return updateFile;
      } else {
        return null;
      }
    } // update has already been downloaded from some previous app launch


    const cachedUpdateFile = await this.getValidCachedUpdateFile(fileInfo, logger);

    if (cachedUpdateFile == null) {
      return null;
    }

    logger.info(`Update has already been downloaded to ${updateFile}).`);
    return cachedUpdateFile;
  }

  setDownloadedFile(downloadedFile, packageFile, versionInfo, fileInfo) {
    this._file = downloadedFile;
    this._packageFile = packageFile;
    this.versionInfo = versionInfo;
    this.fileInfo = fileInfo;
  }

  async cacheUpdateInfo(updateFileName) {
    const data = {
      fileName: updateFileName,
      sha512: this.fileInfo.info.sha512
    };
    await (0, _fsExtraP().outputJson)(path.join(this.cacheDir, "update-info.json"), data);
  }

  async clear() {
    this._file = null;
    this._packageFile = null;
    this.versionInfo = null;
    this.fileInfo = null;
    await this.cleanCacheDir();
  }

  async cleanCacheDir() {
    try {
      // remove stale data
      await (0, _fsExtraP().emptyDir)(this.cacheDir);
    } catch (ignore) {// ignore
    }
  }

  async getValidCachedUpdateFile(fileInfo, logger) {
    let cachedInfo;
    const updateInfoFile = path.join(this.cacheDir, "update-info.json");

    try {
      cachedInfo = await (0, _fsExtraP().readJson)(updateInfoFile);
    } catch (e) {
      let message = `No cached update info available`;

      if (e.code !== "ENOENT") {
        await this.cleanCacheDir();
        message += ` (error on read: ${e.message})`;
      }

      logger.info(message);
      return null;
    }

    if (cachedInfo.fileName == null) {
      logger.warn(`Cached update info is corrupted: no fileName, directory for cached update will be cleaned`);
      await this.cleanCacheDir();
      return null;
    }

    if (fileInfo.info.sha512 !== cachedInfo.sha512) {
      logger.info(`Cached update sha512 checksum doesn't match the latest available update. New update must be downloaded. Cached: ${cachedInfo.sha512}, expected: ${fileInfo.info.sha512}. Directory for cached update will be cleaned`);
      await this.cleanCacheDir();
      return null;
    }

    const updateFile = path.join(this.cacheDir, cachedInfo.fileName);

    if (!(await (0, _fsExtraP().pathExists)(updateFile))) {
      logger.info("Cached update file doesn't exist, directory for cached update will be cleaned");
      await this.cleanCacheDir();
      return null;
    }

    const sha512 = await hashFile(updateFile);

    if (fileInfo.info.sha512 !== sha512) {
      logger.warn(`Sha512 checksum doesn't match the latest available update. New update must be downloaded. Cached: ${sha512}, expected: ${fileInfo.info.sha512}`);
      await this.cleanCacheDir();
      return null;
    }

    return updateFile;
  }

}

exports.DownloadedUpdateHelper = DownloadedUpdateHelper;

function hashFile(file, algorithm = "sha512", encoding = "base64", options) {
  return new Promise((resolve, reject) => {
    const hash = (0, _crypto().createHash)(algorithm);
    hash.on("error", reject).setEncoding(encoding);
    (0, _fs().createReadStream)(file, Object.assign({}, options, {
      highWaterMark: 1024 * 1024
      /* better to use more memory but hash faster */

    })).on("error", reject).on("end", () => {
      hash.end();
      resolve(hash.read());
    }).pipe(hash, {
      end: false
    });
  });
} 
//# sourceMappingURL=DownloadedUpdateHelper.js.map