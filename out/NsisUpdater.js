import { newError, CURRENT_APP_PACKAGE_FILE_NAME, CURRENT_APP_INSTALLER_FILE_NAME } from "builder-util-runtime";
import { spawn } from "child_process";
import * as path from "path";
import "source-map-support/register";
import { BaseUpdater } from "./BaseUpdater";
import { FileWithEmbeddedBlockMapDifferentialDownloader } from "./differentialDownloader/FileWithEmbeddedBlockMapDifferentialDownloader";
import { GenericDifferentialDownloader } from "./differentialDownloader/GenericDifferentialDownloader";
import { newUrlFromBase } from "./main";
import { configureRequestOptionsFromUrl, findFile } from "./providers/Provider";
import { unlink } from "fs-extra-p";
import { verifySignature } from "./windowsExecutableCodeSignatureVerifier";
export class NsisUpdater extends BaseUpdater {
    constructor(options, app) {
        super(options, app);
    }
    /*** @private */
    async doDownloadUpdate(downloadUpdateOptions) {
        const provider = await this.provider;
        const fileInfo = findFile(provider.resolveFiles(downloadUpdateOptions.updateInfo), "exe");
        return await this.executeDownload({
            fileExtension: "exe",
            downloadUpdateOptions,
            fileInfo,
            task: async (destinationFile, downloadOptions, packageFile, removeTempDirIfAny) => {
                const packageInfo = fileInfo.packageInfo;
                const isWebInstaller = packageInfo != null && packageFile != null;
                if (isWebInstaller || await this.differentialDownloadInstaller(fileInfo, downloadUpdateOptions, destinationFile, downloadUpdateOptions.requestHeaders, provider)) {
                    await this.httpExecutor.download(fileInfo.url.href, destinationFile, downloadOptions);
                }
                const signatureVerificationStatus = await this.verifySignature(destinationFile);
                if (signatureVerificationStatus != null) {
                    await removeTempDirIfAny();
                    // noinspection ThrowInsideFinallyBlockJS
                    throw newError(`New version ${downloadUpdateOptions.updateInfo.version} is not signed by the application owner: ${signatureVerificationStatus}`, "ERR_UPDATER_INVALID_SIGNATURE");
                }
                if (isWebInstaller) {
                    if (await this.differentialDownloadWebPackage(packageInfo, packageFile, provider)) {
                        try {
                            await this.httpExecutor.download(packageInfo.path, packageFile, {
                                skipDirCreation: true,
                                headers: downloadUpdateOptions.requestHeaders,
                                cancellationToken: downloadUpdateOptions.cancellationToken,
                                sha512: packageInfo.sha512,
                            });
                        }
                        catch (e) {
                            try {
                                await unlink(packageFile);
                            }
                            catch (ignored) {
                                // ignore
                            }
                            throw e;
                        }
                    }
                }
            },
        });
    }
    // $certificateInfo = (Get-AuthenticodeSignature 'xxx\yyy.exe'
    // | where {$_.Status.Equals([System.Management.Automation.SignatureStatus]::Valid) -and $_.SignerCertificate.Subject.Contains("CN=siemens.com")})
    // | Out-String ; if ($certificateInfo) { exit 0 } else { exit 1 }
    async verifySignature(tempUpdateFile) {
        let publisherName;
        try {
            publisherName = (await this.configOnDisk.value).publisherName;
            if (publisherName == null) {
                return null;
            }
        }
        catch (e) {
            if (e.code === "ENOENT") {
                // no app-update.yml
                return null;
            }
            throw e;
        }
        return await verifySignature(Array.isArray(publisherName) ? publisherName : [publisherName], tempUpdateFile, this._logger);
    }
    async doInstall(installerPath, isSilent, isForceRunAfter) {
        const args = ["--updated"];
        if (isSilent) {
            args.push("/S");
        }
        if (isForceRunAfter) {
            args.push("--force-run");
        }
        const packagePath = this.downloadedUpdateHelper.packageFile;
        if (packagePath != null) {
            // only = form is supported
            args.push(`--package-file="${packagePath}"`);
        }
        const spawnOptions = {
            detached: true,
            stdio: "ignore",
        };
        try {
            await this._spawn(installerPath, args, spawnOptions);
        }
        catch (e) {
            // yes, such errors dispatched not as error event
            // https://github.com/electron-userland/electron-builder/issues/1129
            if (e.code === "UNKNOWN" || e.code === "EACCES") { // Node 8 sends errors: https://nodejs.org/dist/latest-v8.x/docs/api/errors.html#errors_common_system_errors
                this._logger.info("Access denied or UNKNOWN error code on spawn, will be executed again using elevate");
                try {
                    await this._spawn(path.join(process.resourcesPath, "elevate.exe"), [installerPath].concat(args), spawnOptions);
                }
                catch (e) {
                    this.dispatchError(e);
                }
            }
            else {
                this.dispatchError(e);
            }
        }
        return true;
    }
    /**
     * This handles both node 8 and node 10 way of emitting error when spawing a process
     *   - node 8: Throws the error
     *   - node 10: Emit the error(Need to listen with on)
     */
    async _spawn(exe, args, options) {
        return new Promise((resolve, reject) => {
            try {
                const process = spawn(exe, args, options);
                process.on("error", error => {
                    reject(error);
                });
                process.unref();
                if (process.pid !== undefined) {
                    resolve(true);
                }
            }
            catch (error) {
                reject(error);
            }
        });
    }
    // private downloadBlockMap(provider: Provider<any>) {
    //   await provider.getBytes(newBlockMapUrl, cancellationToken)
    // }
    async differentialDownloadInstaller(fileInfo, downloadUpdateOptions, installerPath, requestHeaders, provider) {
        try {
            const newBlockMapUrl = newUrlFromBase(`${fileInfo.url.pathname}.blockmap`, fileInfo.url);
            const oldBlockMapUrl = newUrlFromBase(`${fileInfo.url.pathname.replace(new RegExp(downloadUpdateOptions.updateInfo.version, "g"), this.currentVersion.version)}.blockmap`, fileInfo.url);
            this._logger.info(`Download block maps (old: "${oldBlockMapUrl.href}", new: ${newBlockMapUrl.href})`);
            const downloadBlockMap = async (url) => {
                const requestOptions = configureRequestOptionsFromUrl(url, { headers: downloadUpdateOptions.requestHeaders });
                requestOptions.gzip = true;
                const data = await this.httpExecutor.request(requestOptions, downloadUpdateOptions.cancellationToken);
                if (data == null) {
                    throw new Error(`Blockmap "${url.href}" is empty`);
                }
                try {
                    return JSON.parse(data);
                }
                catch (e) {
                    throw new Error(`Cannot parse blockmap "${url.href}", error: ${e}, raw data: ${data}`);
                }
            };
            const blockMapData = await downloadBlockMap(newBlockMapUrl);
            const oldBlockMapData = await downloadBlockMap(oldBlockMapUrl);
            await new GenericDifferentialDownloader(fileInfo.info, this.httpExecutor, {
                newUrl: fileInfo.url.href,
                oldFile: path.join(this.app.getPath("userData"), CURRENT_APP_INSTALLER_FILE_NAME),
                logger: this._logger,
                newFile: installerPath,
                useMultipleRangeRequest: provider.useMultipleRangeRequest,
                requestHeaders,
            })
                .download(oldBlockMapData, blockMapData);
        }
        catch (e) {
            this._logger.error(`Cannot download differentially, fallback to full download: ${e.stack || e}`);
            return true;
        }
        return false;
    }
    async differentialDownloadWebPackage(packageInfo, packagePath, provider) {
        if (packageInfo.blockMapSize == null) {
            return true;
        }
        try {
            await new FileWithEmbeddedBlockMapDifferentialDownloader(packageInfo, this.httpExecutor, {
                newUrl: packageInfo.path,
                oldFile: path.join(this.app.getPath("userData"), CURRENT_APP_PACKAGE_FILE_NAME),
                logger: this._logger,
                newFile: packagePath,
                requestHeaders: this.requestHeaders,
                useMultipleRangeRequest: provider.useMultipleRangeRequest,
            })
                .download();
        }
        catch (e) {
            this._logger.error(`Cannot download differentially, fallback to full download: ${e.stack || e}`);
            // during test (developer machine mac or linux) we must throw error
            return process.platform === "win32";
        }
        return false;
    }
}
//# sourceMappingURL=NsisUpdater.js.map