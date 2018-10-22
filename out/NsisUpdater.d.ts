import { AllPublishOptions } from "builder-util-runtime";
import "source-map-support/register";
import { DownloadUpdateOptions } from "./AppUpdater";
import { BaseUpdater } from "./BaseUpdater";
export declare class NsisUpdater extends BaseUpdater {
    constructor(options?: AllPublishOptions | null, app?: any);
    /*** @private */
    protected doDownloadUpdate(downloadUpdateOptions: DownloadUpdateOptions): Promise<Array<string>>;
    private verifySignature;
    protected doInstall(installerPath: string, isSilent: boolean, isForceRunAfter: boolean): Promise<boolean>;
    /**
     * This handles both node 8 and node 10 way of emitting error when spawing a process
     *   - node 8: Throws the error
     *   - node 10: Emit the error(Need to listen with on)
     */
    private _spawn;
    private differentialDownloadInstaller;
    private differentialDownloadWebPackage;
}
