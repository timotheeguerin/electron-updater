import { DifferentialDownloader } from "./DifferentialDownloader";
export class GenericDifferentialDownloader extends DifferentialDownloader {
    async download(oldBlockMap, newBlockMap) {
        await this.doDownload(oldBlockMap, newBlockMap);
    }
}
//# sourceMappingURL=GenericDifferentialDownloader.js.map