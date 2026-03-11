import * as core from '@actions/core';
import * as path from 'path';
import {
  ensureBoringCache,
  execBoringCache,
  getWorkspace,
  getCacheTagPrefix,
  getElixirVersion,
  getErlangVersion,
  getMiseDataDir,
  installMise,
  installElixir,
  activateElixir,
  installErlang,
  activateErlang,
  installHex,
  installRebar3,
  configureHexMirror,
  wasCacheHit,
} from './utils';

async function run(): Promise<void> {
  try {
    const workspace = getWorkspace(core.getInput('workspace'));
    const cacheTagPrefix = getCacheTagPrefix(core.getInput('cache-tag'));
    const inputElixirVersion = core.getInput('elixir-version');
    const inputErlangVersion = core.getInput('erlang-version');
    const workingDir = core.getInput('working-directory') || process.cwd();
    const cacheElixir = core.getInput('cache-elixir') !== 'false';
    const cacheDeps = core.getInput('cache-deps') !== 'false';
    const cacheBuild = core.getInput('cache-build') !== 'false';
    const verbose = core.getInput('verbose') === 'true';
    const installHexInput = core.getInput('install-hex') !== 'false';
    const installRebarInput = core.getInput('install-rebar') !== 'false';
    const hexpmMirrors = core.getInput('hexpm-mirrors') || '';
    const cliVersion = core.getInput('cli-version');

    const elixirVersion = await getElixirVersion(inputElixirVersion, workingDir);
    const erlangVersion = await getErlangVersion(inputErlangVersion, workingDir);

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
      await ensureBoringCache({ version: cliVersion });
    }

    const miseDataDir = getMiseDataDir();
    const runtimeTag = `${cacheTagPrefix}-elixir-${elixirVersion}-otp-${erlangVersion}`;

    let runtimeCacheHit = false;
    if (cacheElixir) {
      core.info(`Restoring Elixir ${elixirVersion} + Erlang ${erlangVersion}...`);
      const args = ['restore', workspace, `${runtimeTag}:${miseDataDir}`];
      if (verbose) args.push('--verbose');
      const result = await execBoringCache(args);
      runtimeCacheHit = wasCacheHit(result);
      core.setOutput('elixir-cache-hit', runtimeCacheHit.toString());
    }

    await installMise();

    if (runtimeCacheHit) {
      await activateErlang(erlangVersion);
      await activateElixir(elixirVersion);
    } else {
      await installErlang(erlangVersion);
      await installElixir(elixirVersion);
    }

    if (hexpmMirrors) {
      await configureHexMirror(hexpmMirrors);
    }
    if (installHexInput) {
      await installHex();
    }
    if (installRebarInput) {
      await installRebar3();
    }

    const depsTag = `${cacheTagPrefix}-elixir-deps`;
    const buildTag = `${cacheTagPrefix}-elixir-build-${elixirVersion}-otp-${erlangVersion}`;
    const depsDir = path.join(workingDir, 'deps');
    const buildDir = path.join(workingDir, '_build');

    let depsRestored = false;
    if (cacheDeps) {
      core.info('Restoring Mix deps...');
      const args = ['restore', workspace, `${depsTag}:${depsDir}`];
      if (verbose) args.push('--verbose');
      const result = await execBoringCache(args);
      depsRestored = wasCacheHit(result);
      core.info(depsRestored ? 'Mix deps restored' : 'Mix deps not in cache');

      core.saveState('depsTag', depsTag);
      core.saveState('depsDir', depsDir);
    }

    let buildRestored = false;
    if (cacheBuild) {
      core.info('Restoring Mix _build...');
      const args = ['restore', workspace, `${buildTag}:${buildDir}`];
      if (verbose) args.push('--verbose');
      const result = await execBoringCache(args);
      buildRestored = wasCacheHit(result);
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
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();
