"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.GenericDifferentialDownloader = void 0;

function _DifferentialDownloader() {
  const data = require("./DifferentialDownloader");

  _DifferentialDownloader = function () {
    return data;
  };

  return data;
}

class GenericDifferentialDownloader extends _DifferentialDownloader().DifferentialDownloader {
  async download(oldBlockMap, newBlockMap) {
    await this.doDownload(oldBlockMap, newBlockMap);
  }

} exports.GenericDifferentialDownloader = GenericDifferentialDownloader;
//# sourceMappingURL=GenericDifferentialDownloader.js.map