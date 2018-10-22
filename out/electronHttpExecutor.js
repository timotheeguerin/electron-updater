import { configureRequestOptionsFromUrl, HttpExecutor } from "builder-util-runtime";
import { net } from "electron";
import { ensureDir } from "fs-extra-p";
import * as path from "path";
export class ElectronHttpExecutor extends HttpExecutor {
    constructor(proxyLoginCallback) {
        super();
        this.proxyLoginCallback = proxyLoginCallback;
    }
    async download(url, destination, options) {
        if (options == null || !options.skipDirCreation) {
            await ensureDir(path.dirname(destination));
        }
        return await options.cancellationToken.createPromise((resolve, reject, onCancel) => {
            this.doDownload(Object.assign({}, configureRequestOptionsFromUrl(url, {
                headers: options.headers || undefined,
            }), { redirect: "manual" }), destination, 0, options, error => {
                if (error == null) {
                    resolve(destination);
                }
                else {
                    reject(error);
                }
            }, onCancel);
        });
    }
    doRequest(options, callback) {
        const request = net.request(options);
        request.on("response", callback);
        this.addProxyLoginHandler(request);
        return request;
    }
    addProxyLoginHandler(request) {
        if (this.proxyLoginCallback != null) {
            request.on("login", this.proxyLoginCallback);
        }
    }
    addRedirectHandlers(request, options, reject, redirectCount, handler) {
        request.on("redirect", (statusCode, method, redirectUrl) => {
            if (redirectCount > 10) {
                reject(new Error("Too many redirects (> 10)"));
                return;
            }
            handler(HttpExecutor.prepareRedirectUrlOptions(redirectUrl, options));
        });
    }
}
//# sourceMappingURL=electronHttpExecutor.js.map