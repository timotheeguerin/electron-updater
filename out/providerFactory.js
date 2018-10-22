import { getS3LikeProviderBaseUrl, newError } from "builder-util-runtime";
import { BintrayProvider } from "./providers/BintrayProvider";
import { GenericProvider } from "./providers/GenericProvider";
import { GitHubProvider } from "./providers/GitHubProvider";
import { PrivateGitHubProvider } from "./providers/PrivateGitHubProvider";
export function isUrlProbablySupportMultiRangeRequests(url) {
    return !url.includes("s3.amazonaws.com");
}
export function createClient(data, updater) {
    // noinspection SuspiciousTypeOfGuard
    if (typeof data === "string") {
        throw newError("Please pass PublishConfiguration object", "ERR_UPDATER_INVALID_PROVIDER_CONFIGURATION");
    }
    const httpExecutor = updater.httpExecutor;
    const provider = data.provider;
    switch (provider) {
        case "github":
            const githubOptions = data;
            const token = (githubOptions.private ? process.env.GH_TOKEN || process.env.GITHUB_TOKEN : null) || githubOptions.token;
            if (token == null) {
                return new GitHubProvider(githubOptions, updater, httpExecutor);
            }
            else {
                return new PrivateGitHubProvider(githubOptions, updater, token, httpExecutor);
            }
        case "s3":
        case "spaces":
            return new GenericProvider({
                provider: "generic",
                url: getS3LikeProviderBaseUrl(data),
                channel: data.channel || null
            }, updater, provider === "spaces" /* https://github.com/minio/minio/issues/5285#issuecomment-350428955 */);
        case "generic":
            const options = data;
            return new GenericProvider(options, updater, options.useMultipleRangeRequest !== false && isUrlProbablySupportMultiRangeRequests(options.url));
        case "bintray":
            return new BintrayProvider(data, httpExecutor);
        default:
            throw newError(`Unsupported provider: ${provider}`, "ERR_UPDATER_UNSUPPORTED_PROVIDER");
    }
}
//# sourceMappingURL=providerFactory.js.map