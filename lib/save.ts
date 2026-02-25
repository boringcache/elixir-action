import * as core from '@actions/core';
import { execBoringCache, getMiseDataDir } from './utils';

async function run(): Promise<void> {
  try {
    const workspace = core.getInput('workspace') || core.getState('workspace');
    const cacheElixir = core.getInput('cache-elixir') !== 'false' && core.getState('cacheElixir') !== 'false';
    const cacheDeps = core.getInput('cache-deps') !== 'false' && core.getState('cacheDeps') !== 'false';
    const cacheBuild = core.getInput('cache-build') !== 'false' && core.getState('cacheBuild') !== 'false';
    const verbose = core.getState('verbose') === 'true';
    const exclude = core.getInput('exclude');
    const elixirVersion = core.getState('elixirVersion');
    const erlangVersion = core.getState('erlangVersion');
    const cacheTagPrefix = core.getState('cacheTagPrefix');

    if (!workspace) {
      core.info('No workspace found, skipping save');
      return;
    }

    core.info('Saving to BoringCache...');

    if (cacheElixir && elixirVersion && erlangVersion && cacheTagPrefix) {
      const miseDataDir = getMiseDataDir();
      const runtimeTag = `${cacheTagPrefix}-elixir-${elixirVersion}-otp-${erlangVersion}`;
      core.info(`Saving Elixir + Erlang installation [${runtimeTag}]...`);
      const args = ['save', workspace, `${runtimeTag}:${miseDataDir}`];
      if (verbose) args.push('--verbose');
      await execBoringCache(args);
    }

    if (cacheDeps) {
      const depsTag = core.getState('depsTag');
      const depsDir = core.getState('depsDir');
      if (depsTag && depsDir) {
        core.info(`Saving Mix deps [${depsTag}]...`);
        const args = ['save', workspace, `${depsTag}:${depsDir}`];
        if (verbose) args.push('--verbose');
        if (exclude) args.push('--exclude', exclude);
        await execBoringCache(args);
      }
    }

    if (cacheBuild) {
      const buildTag = core.getState('buildTag');
      const buildDir = core.getState('buildDir');
      if (buildTag && buildDir) {
        core.info(`Saving Mix _build [${buildTag}]...`);
        const args = ['save', workspace, `${buildTag}:${buildDir}`];
        if (verbose) args.push('--verbose');
        if (exclude) args.push('--exclude', exclude);
        await execBoringCache(args);
      }
    }

    core.info('Save complete');
  } catch (error) {
    if (error instanceof Error) {
      core.warning(`Save failed: ${error.message}`);
    }
  }
}

run();
