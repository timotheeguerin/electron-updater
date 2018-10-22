import { HttpError, newError } from "builder-util-runtime";
import { getChannelFilename, getCustomChannelName, getDefaultChannelName, isUseOldMacProvider, newBaseUrl, newUrlFromBase, Provider } from "../main";
import { parseUpdateInfo, resolveFiles } from "./Provider";
export class GenericProvider extends Provider {
    constructor(configuration, updater, useMultipleRangeRequest = true) {
        super(updater.httpExecutor, useMultipleRangeRequest);
        this.configuration = configuration;
        this.updater = updater;
        this.baseUrl = newBaseUrl(this.configuration.url);
    }
    get channel() {
        const result = this.updater.channel || this.configuration.channel;
        return result == null ? getDefaultChannelName() : getCustomChannelName(result);
    }
    async getLatestVersion() {
        let result;
        const channelFile = getChannelFilename(this.channel);
        const channelUrl = newUrlFromBase(channelFile, this.baseUrl, this.updater.isAddNoCacheQuery);
        for (let attemptNumber = 0;; attemptNumber++) {
            try {
                result = parseUpdateInfo(await this.httpRequest(channelUrl), channelFile, channelUrl);
                break;
            }
            catch (e) {
                if (e instanceof HttpError && e.statusCode === 404) {
                    throw newError(`Cannot find channel "${channelFile}" update info: ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
                }
                else if (e.code === "ECONNREFUSED") {
                    if (attemptNumber < 3) {
                        await new Promise((resolve, reject) => {
                            try {
                                setTimeout(resolve, 1000 * attemptNumber);
                            }
                            catch (e) {
                                reject(e);
                            }
                        });
                        continue;
                    }
                }
                throw e;
            }
        }
        if (isUseOldMacProvider()) {
            result.releaseJsonUrl = channelUrl.href;
        }
        return result;
    }
    resolveFiles(updateInfo) {
        return resolveFiles(updateInfo, this.baseUrl);
    }
}
//# sourceMappingURL=GenericProvider.js.map