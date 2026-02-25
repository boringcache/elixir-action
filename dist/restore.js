"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const path = __importStar(require("path"));
const utils_1 = require("./utils");
async function run() {
    try {
        const workspace = (0, utils_1.getWorkspace)(core.getInput('workspace'));
        const cacheTagPrefix = (0, utils_1.getCacheTagPrefix)(core.getInput('cache-tag'));
        const inputElixirVersion = core.getInput('elixir-version');
        const inputErlangVersion = core.getInput('erlang-version');
        const workingDir = core.getInput('working-directory') || process.cwd();
        const cacheElixir = core.getInput('cache-elixir') !== 'false';
        const cacheDeps = core.getInput('cache-deps') !== 'false';
        const cacheBuild = core.getInput('cache-build') !== 'false';
        const verbose = core.getInput('verbose') === 'true';
        const cliVersion = core.getInput('cli-version');
        const elixirVersion = await (0, utils_1.getElixirVersion)(inputElixirVersion, workingDir);
        const erlangVersion = await (0, utils_1.getErlangVersion)(inputErlangVersion, workingDir);
        core.saveState('workspace', workspace);
        core.saveState('cacheTagPrefix', cacheTagPrefix);
        core.saveState('elixirVersion', elixirVersion);
        core.saveState('erlangVersion', erlangVersion);
        core.saveState('workingDir', workingDir);
        core.saveState('cacheElixir', cacheElixir.toString());
        core.saveState('cacheDeps', cacheDeps.toString());
        core.saveState('cacheBuild', cacheBuild.toString());
        core.saveState('verbose', verbose.toString());
        if (cliVersion.toLowerCase() !== 'skip') {
            await (0, utils_1.ensureBoringCache)({ version: cliVersion });
        }
        const miseDataDir = (0, utils_1.getMiseDataDir)();
        const runtimeTag = `${cacheTagPrefix}-elixir-${elixirVersion}-otp-${erlangVersion}`;
        let runtimeCacheHit = false;
        if (cacheElixir) {
            core.info(`Restoring Elixir ${elixirVersion} + Erlang ${erlangVersion}...`);
            const args = ['restore', workspace, `${runtimeTag}:${miseDataDir}`];
            if (verbose)
                args.push('--verbose');
            const result = await (0, utils_1.execBoringCache)(args);
            runtimeCacheHit = (0, utils_1.wasCacheHit)(result);
            core.setOutput('elixir-cache-hit', runtimeCacheHit.toString());
        }
        await (0, utils_1.installMise)();
        if (runtimeCacheHit) {
            await (0, utils_1.activateErlang)(erlangVersion);
            await (0, utils_1.activateElixir)(elixirVersion);
        }
        else {
            await (0, utils_1.installErlang)(erlangVersion);
            await (0, utils_1.installElixir)(elixirVersion);
        }
        const depsTag = `${cacheTagPrefix}-elixir-deps`;
        const buildTag = `${cacheTagPrefix}-elixir-build-${elixirVersion}-otp-${erlangVersion}`;
        const depsDir = path.join(workingDir, 'deps');
        const buildDir = path.join(workingDir, '_build');
        let depsRestored = false;
        if (cacheDeps) {
            core.info('Restoring Mix deps...');
            const args = ['restore', workspace, `${depsTag}:${depsDir}`];
            if (verbose)
                args.push('--verbose');
            const result = await (0, utils_1.execBoringCache)(args);
            depsRestored = (0, utils_1.wasCacheHit)(result);
            core.info(depsRestored ? 'Mix deps restored' : 'Mix deps not in cache');
            core.saveState('depsTag', depsTag);
            core.saveState('depsDir', depsDir);
        }
        let buildRestored = false;
        if (cacheBuild) {
            core.info('Restoring Mix _build...');
            const args = ['restore', workspace, `${buildTag}:${buildDir}`];
            if (verbose)
                args.push('--verbose');
            const result = await (0, utils_1.execBoringCache)(args);
            buildRestored = (0, utils_1.wasCacheHit)(result);
            core.info(buildRestored ? 'Mix _build restored' : 'Mix _build not in cache');
            core.saveState('buildTag', buildTag);
            core.saveState('buildDir', buildDir);
        }
        core.setOutput('workspace', workspace);
        core.setOutput('elixir-version', elixirVersion);
        core.setOutput('erlang-version', erlangVersion);
        core.setOutput('cache-tag', cacheTagPrefix);
        core.setOutput('cache-hit', (depsRestored || buildRestored).toString());
        core.info(`Elixir ${elixirVersion} + Erlang ${erlangVersion} setup complete`);
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}
run();
