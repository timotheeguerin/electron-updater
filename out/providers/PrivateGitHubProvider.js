import { CancellationToken, HttpError, newError } from "builder-util-runtime";
import { safeLoad } from "js-yaml";
import * as path from "path";
import { URL } from "url";
import { BaseGitHubProvider } from "./GitHubProvider";
import { getChannelFilename, getDefaultChannelName, newUrlFromBase } from "../main";
import { getFileList } from "./Provider";
export class PrivateGitHubProvider extends BaseGitHubProvider {
    constructor(options, updater, token, executor) {
        super(options, "api.github.com", executor);
        this.updater = updater;
        this.token = token;
    }
    createRequestOptions(url, headers) {
        const result = super.createRequestOptions(url, headers);
        result.redirect = "manual";
        return result;
    }
    async getLatestVersion() {
        const cancellationToken = new CancellationToken();
        const channelFile = getChannelFilename(getDefaultChannelName());
        const releaseInfo = await this.getLatestVersionInfo(cancellationToken);
        const asset = releaseInfo.assets.find(it => it.name === channelFile);
        if (asset == null) {
            // html_url must be always, but just to be sure
            throw newError(`Cannot find ${channelFile} in the release ${releaseInfo.html_url || releaseInfo.name}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
        }
        const url = new URL(asset.url);
        let result;
        try {
            result = safeLoad((await this.httpRequest(url, this.configureHeaders("application/octet-stream"), cancellationToken)));
        }
        catch (e) {
            if (e instanceof HttpError && e.statusCode === 404) {
                throw newError(`Cannot find ${channelFile} in the latest release artifacts (${url}): ${e.stack || e.message}`, "ERR_UPDATER_CHANNEL_FILE_NOT_FOUND");
            }
            throw e;
        }
        result.assets = releaseInfo.assets;
        return result;
    }
    get fileExtraDownloadHeaders() {
        return this.configureHeaders("application/octet-stream");
    }
    configureHeaders(accept) {
        return {
            accept,
            authorization: `token ${this.token}`,
        };
    }
    async getLatestVersionInfo(cancellationToken) {
        let basePath = this.basePath;
        const allowPrerelease = this.updater.allowPrerelease;
        if (!allowPrerelease) {
            basePath = `${basePath}/latest`;
        }
        const url = newUrlFromBase(basePath, this.baseUrl);
        try {
            let version = (JSON.parse((await this.httpRequest(url, this.configureHeaders("application/vnd.github.v3+json"), cancellationToken))));
            if (allowPrerelease) {
                version = version.find((v) => v.prerelease);
            }
            return version;
        }
        catch (e) {
            throw newError(`Unable to find latest version on GitHub (${url}), please ensure a production release exists: ${e.stack || e.message}`, "ERR_UPDATER_LATEST_VERSION_NOT_FOUND");
        }
    }
    get basePath() {
        return this.computeGithubBasePath(`/repos/${this.options.owner}/${this.options.repo}/releases`);
    }
    resolveFiles(updateInfo) {
        return getFileList(updateInfo).map(it => {
            const name = path.posix.basename(it.url).replace(/ /g, "-");
            const asset = updateInfo.assets.find(it => it != null && it.name === name);
            if (asset == null) {
                throw newError(`Cannot find asset "${name}" in: ${JSON.stringify(updateInfo.assets, null, 2)}`, "ERR_UPDATER_ASSET_NOT_FOUND");
            }
            return {
                url: new URL(asset.url),
                info: it,
            };
        });
    }
}
//# sourceMappingURL=PrivateGitHubProvider.js.map