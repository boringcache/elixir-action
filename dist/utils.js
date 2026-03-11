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
exports.pathExists = exports.ensureBoringCache = void 0;
exports.execBoringCache = execBoringCache;
exports.wasCacheHit = wasCacheHit;
exports.getWorkspace = getWorkspace;
exports.getCacheTagPrefix = getCacheTagPrefix;
exports.getMiseBinPath = getMiseBinPath;
exports.getMiseDataDir = getMiseDataDir;
exports.installMise = installMise;
exports.installElixir = installElixir;
exports.activateElixir = activateElixir;
exports.installErlang = installErlang;
exports.activateErlang = activateErlang;
exports.installHex = installHex;
exports.installRebar3 = installRebar3;
exports.configureHexMirror = configureHexMirror;
exports.getElixirVersion = getElixirVersion;
exports.getErlangVersion = getErlangVersion;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const action_core_1 = require("@boringcache/action-core");
Object.defineProperty(exports, "ensureBoringCache", { enumerable: true, get: function () { return action_core_1.ensureBoringCache; } });
Object.defineProperty(exports, "pathExists", { enumerable: true, get: function () { return action_core_1.pathExists; } });
const isWindows = process.platform === 'win32';
let lastOutput = '';
async function execBoringCache(args) {
    lastOutput = '';
    let output = '';
    const code = await (0, action_core_1.execBoringCache)(args, {
        silent: true,
        listeners: {
            stdout: (data) => {
                const text = data.toString();
                output += text;
                process.stdout.write(text);
            },
            stderr: (data) => {
                const text = data.toString();
                output += text;
                process.stderr.write(text);
            }
        }
    });
    lastOutput = output;
    return code;
}
function wasCacheHit(exitCode) {
    if (exitCode !== 0) {
        return false;
    }
    if (!lastOutput) {
        return true;
    }
    const missPatterns = [/Cache miss/i, /No cache entries/i, /Found 0\//i];
    return !missPatterns.some(pattern => pattern.test(lastOutput));
}
function getWorkspace(inputWorkspace) {
    return (0, action_core_1.getWorkspace)(inputWorkspace);
}
function getCacheTagPrefix(inputCacheTag) {
    return (0, action_core_1.getCacheTagPrefix)(inputCacheTag, 'elixir');
}
function getMiseBinPath() {
    const homedir = os.homedir();
    return isWindows
        ? path.join(homedir, '.local', 'bin', 'mise.exe')
        : path.join(homedir, '.local', 'bin', 'mise');
}
function getMiseDataDir() {
    if (isWindows) {
        return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'mise');
    }
    return path.join(os.homedir(), '.local', 'share', 'mise');
}
async function installMise() {
    core.info('Installing mise...');
    if (isWindows) {
        await installMiseWindows();
    }
    else {
        await exec.exec('sh', ['-c', 'curl https://mise.run | sh']);
    }
    core.addPath(path.dirname(getMiseBinPath()));
    core.addPath(path.join(getMiseDataDir(), 'shims'));
}
async function installMiseWindows() {
    const arch = os.arch() === 'arm64' ? 'arm64' : 'x64';
    const miseVersion = process.env.MISE_VERSION || 'v2026.2.8';
    const url = `https://github.com/jdx/mise/releases/download/${miseVersion}/mise-${miseVersion}-windows-${arch}.zip`;
    const binDir = path.dirname(getMiseBinPath());
    await fs.promises.mkdir(binDir, { recursive: true });
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'mise-'));
    try {
        const zipPath = path.join(tempDir, 'mise.zip');
        await exec.exec('curl', ['-fsSL', '-o', zipPath, url]);
        await exec.exec('tar', ['-xf', zipPath, '-C', tempDir]);
        await fs.promises.copyFile(path.join(tempDir, 'mise', 'bin', 'mise.exe'), getMiseBinPath());
    }
    finally {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
}
async function installElixir(version) {
    core.info(`Installing Elixir ${version} via mise...`);
    const misePath = getMiseBinPath();
    await exec.exec(misePath, ['install', `elixir@${version}`]);
    await exec.exec(misePath, ['use', '-g', `elixir@${version}`]);
}
async function activateElixir(version) {
    core.info(`Activating Elixir ${version}...`);
    const misePath = getMiseBinPath();
    await exec.exec(misePath, ['use', '-g', `elixir@${version}`]);
}
async function installErlang(version) {
    core.info(`Installing Erlang ${version} via mise...`);
    const misePath = getMiseBinPath();
    await exec.exec(misePath, ['install', `erlang@${version}`]);
    await exec.exec(misePath, ['use', '-g', `erlang@${version}`]);
}
async function activateErlang(version) {
    core.info(`Activating Erlang ${version}...`);
    const misePath = getMiseBinPath();
    await exec.exec(misePath, ['use', '-g', `erlang@${version}`]);
}
async function installHex() {
    core.info('Installing Hex...');
    await exec.exec('mix', ['local.hex', '--force']);
}
async function installRebar3() {
    core.info('Installing rebar3...');
    await exec.exec('mix', ['local.rebar', '--force']);
}
async function configureHexMirror(mirror) {
    if (!mirror)
        return;
    core.exportVariable('HEX_MIRROR_URL', mirror.trim());
    core.info(`Hex mirror: ${mirror.trim()}`);
}
async function readMiseTomlVersion(workingDir, toolName) {
    const miseToml = path.join(workingDir, 'mise.toml');
    try {
        const content = await fs.promises.readFile(miseToml, 'utf-8');
        const toolsMatch = content.match(/\[tools\]([\s\S]*?)(?:\n\[|$)/);
        if (toolsMatch) {
            const versionMatch = toolsMatch[1].match(new RegExp(`^\\s*${toolName}\\s*=\\s*["']([^"']+)["']`, 'm'));
            if (versionMatch)
                return versionMatch[1];
        }
    }
    catch { }
    return null;
}
async function getElixirVersion(inputVersion, workingDir) {
    if (inputVersion) {
        return inputVersion;
    }
    const elixirVersionFile = path.join(workingDir, '.elixir-version');
    try {
        const content = await fs.promises.readFile(elixirVersionFile, 'utf-8');
        const version = content.trim();
        if (version)
            return version;
    }
    catch { }
    const toolVersionsFile = path.join(workingDir, '.tool-versions');
    try {
        const content = await fs.promises.readFile(toolVersionsFile, 'utf-8');
        const elixirLine = content.split('\n').find(line => line.startsWith('elixir '));
        if (elixirLine) {
            return elixirLine.split(/\s+/)[1].trim();
        }
    }
    catch { }
    const miseVersion = await readMiseTomlVersion(workingDir, 'elixir');
    if (miseVersion)
        return miseVersion;
    const mixExs = path.join(workingDir, 'mix.exs');
    try {
        const content = await fs.promises.readFile(mixExs, 'utf-8');
        const match = content.match(/elixir:\s*"~>\s*(\d+\.\d+(?:\.\d+)?)"/);
        if (match) {
            return match[1];
        }
    }
    catch { }
    return '1.18';
}
async function getErlangVersion(inputVersion, workingDir) {
    if (inputVersion) {
        return inputVersion;
    }
    const toolVersionsFile = path.join(workingDir, '.tool-versions');
    try {
        const content = await fs.promises.readFile(toolVersionsFile, 'utf-8');
        const erlangLine = content.split('\n').find(line => line.startsWith('erlang '));
        if (erlangLine) {
            return erlangLine.split(/\s+/)[1].trim();
        }
    }
    catch { }
    const miseVersion = await readMiseTomlVersion(workingDir, 'erlang');
    if (miseVersion)
        return miseVersion;
    return '27';
}
