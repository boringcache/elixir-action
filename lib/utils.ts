import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  ensureBoringCache,
  execBoringCache as execBoringCacheCore,
  getWorkspace as getWorkspaceCore,
  getCacheTagPrefix as getCacheTagPrefixCore,
  pathExists,
} from '@boringcache/action-core';

export { ensureBoringCache, pathExists };

const isWindows = process.platform === 'win32';

let lastOutput = '';

export async function execBoringCache(args: string[]): Promise<number> {
  lastOutput = '';
  let output = '';

  const code = await execBoringCacheCore(args, {
    silent: true,
    listeners: {
      stdout: (data: Buffer) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
      },
      stderr: (data: Buffer) => {
        const text = data.toString();
        output += text;
        process.stderr.write(text);
      }
    }
  });

  lastOutput = output;
  return code;
}

export function wasCacheHit(exitCode: number): boolean {
  if (exitCode !== 0) {
    return false;
  }

  if (!lastOutput) {
    return true;
  }

  const missPatterns = [/Cache miss/i, /No cache entries/i, /Found 0\//i];
  return !missPatterns.some(pattern => pattern.test(lastOutput));
}

export function getWorkspace(inputWorkspace: string): string {
  return getWorkspaceCore(inputWorkspace);
}

export function getCacheTagPrefix(inputCacheTag: string): string {
  return getCacheTagPrefixCore(inputCacheTag, 'elixir');
}

export function getMiseBinPath(): string {
  const homedir = os.homedir();
  return isWindows
    ? path.join(homedir, '.local', 'bin', 'mise.exe')
    : path.join(homedir, '.local', 'bin', 'mise');
}

export function getMiseDataDir(): string {
  if (isWindows) {
    return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'mise');
  }
  return path.join(os.homedir(), '.local', 'share', 'mise');
}

export async function installMise(): Promise<void> {
  core.info('Installing mise...');
  if (isWindows) {
    await installMiseWindows();
  } else {
    await exec.exec('sh', ['-c', 'curl https://mise.run | sh']);
  }

  core.addPath(path.dirname(getMiseBinPath()));
  core.addPath(path.join(getMiseDataDir(), 'shims'));
}

async function installMiseWindows(): Promise<void> {
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
    await fs.promises.copyFile(
      path.join(tempDir, 'mise', 'bin', 'mise.exe'),
      getMiseBinPath(),
    );
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

export async function installElixir(version: string): Promise<void> {
  core.info(`Installing Elixir ${version} via mise...`);
  const misePath = getMiseBinPath();

  await exec.exec(misePath, ['install', `elixir@${version}`]);
  await exec.exec(misePath, ['use', '-g', `elixir@${version}`]);
}

export async function activateElixir(version: string): Promise<void> {
  core.info(`Activating Elixir ${version}...`);
  const misePath = getMiseBinPath();

  await exec.exec(misePath, ['use', '-g', `elixir@${version}`]);
}

export async function installErlang(version: string): Promise<void> {
  core.info(`Installing Erlang ${version} via mise...`);
  const misePath = getMiseBinPath();

  await exec.exec(misePath, ['install', `erlang@${version}`]);
  await exec.exec(misePath, ['use', '-g', `erlang@${version}`]);
}

export async function activateErlang(version: string): Promise<void> {
  core.info(`Activating Erlang ${version}...`);
  const misePath = getMiseBinPath();

  await exec.exec(misePath, ['use', '-g', `erlang@${version}`]);
}

export async function getElixirVersion(inputVersion: string, workingDir: string): Promise<string> {
  if (inputVersion) {
    return inputVersion;
  }

  const elixirVersionFile = path.join(workingDir, '.elixir-version');
  try {
    const content = await fs.promises.readFile(elixirVersionFile, 'utf-8');
    const version = content.trim();
    if (version) return version;
  } catch {}

  const toolVersionsFile = path.join(workingDir, '.tool-versions');
  try {
    const content = await fs.promises.readFile(toolVersionsFile, 'utf-8');
    const elixirLine = content.split('\n').find(line => line.startsWith('elixir '));
    if (elixirLine) {
      return elixirLine.split(/\s+/)[1].trim();
    }
  } catch {}

  const mixExs = path.join(workingDir, 'mix.exs');
  try {
    const content = await fs.promises.readFile(mixExs, 'utf-8');
    const match = content.match(/elixir:\s*"~>\s*(\d+\.\d+(?:\.\d+)?)"/);
    if (match) {
      return match[1];
    }
  } catch {}

  return '1.18';
}

export async function getErlangVersion(inputVersion: string, workingDir: string): Promise<string> {
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
  } catch {}

  return '27';
}
