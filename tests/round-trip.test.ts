import * as core from '@actions/core';
import * as execModule from '@actions/exec';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('@boringcache/action-core', () => ({
  ensureBoringCache: jest.fn().mockResolvedValue(undefined),
  execBoringCache: jest.fn().mockResolvedValue(0),
  getWorkspace: jest.fn((input: string) => {
    if (!input) throw new Error('Workspace required');
    if (!input.includes('/')) return `default/${input}`;
    return input;
  }),
  getCacheTagPrefix: jest.fn((input: string, fallback: string) => {
    if (input) return input;
    const repo = process.env.GITHUB_REPOSITORY || '';
    if (repo) return repo.split('/')[1] || repo;
    return fallback;
  }),
  pathExists: jest.fn().mockResolvedValue(false),
}));

import {
  ensureBoringCache,
  execBoringCache,
} from '@boringcache/action-core';

describe('Elixir restore/save round-trip', () => {
  const stateStore: Record<string, string> = {};
  const outputs: Record<string, string> = {};
  let tmpDir: string;

  beforeEach(async () => {
    jest.clearAllMocks();
    Object.keys(stateStore).forEach(k => delete stateStore[k]);
    Object.keys(outputs).forEach(k => delete outputs[k]);

    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'elixir-test-'));

    (ensureBoringCache as jest.Mock).mockResolvedValue(undefined);
    (execBoringCache as jest.Mock).mockResolvedValue(0);

    const { getWorkspace, getCacheTagPrefix } = require('@boringcache/action-core');
    (getWorkspace as jest.Mock).mockImplementation((input: string) => {
      if (!input) throw new Error('Workspace required');
      if (!input.includes('/')) return `default/${input}`;
      return input;
    });
    (getCacheTagPrefix as jest.Mock).mockImplementation((input: string, fallback: string) => {
      if (input) return input;
      const repo = process.env.GITHUB_REPOSITORY || '';
      if (repo) return repo.split('/')[1] || repo;
      return fallback;
    });

    (core.saveState as jest.Mock).mockImplementation((key: string, value: string) => {
      stateStore[key] = value;
    });
    (core.getState as jest.Mock).mockImplementation((key: string) => {
      return stateStore[key] || '';
    });
    (core.setOutput as jest.Mock).mockImplementation((key: string, value: string) => {
      outputs[key] = value;
    });
    (execModule.exec as jest.Mock).mockResolvedValue(0);

    process.env.BORINGCACHE_API_TOKEN = 'test-token';
    process.env.GITHUB_REPOSITORY = 'myorg/myrepo';
  });

  afterEach(async () => {
    delete process.env.BORINGCACHE_API_TOKEN;
    delete process.env.GITHUB_REPOSITORY;
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  it('full round-trip: installs Erlang + Elixir, caches runtime + deps + _build', async () => {
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'cli-version': 'v1.8.0',
        'workspace': 'myorg/myproject',
        'cache-tag': '',
        'elixir-version': '1.17',
        'erlang-version': '27',
        'working-directory': tmpDir,
        'cache-elixir': 'true',
        'cache-deps': 'true',
        'cache-build': 'true',
        'verbose': 'false',
      };
      return inputs[name] || '';
    });

    jest.isolateModules(() => {
      require('../lib/restore');
    });
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(ensureBoringCache).toHaveBeenCalledWith({ version: 'v1.8.0' });

    expect(execBoringCache).toHaveBeenCalledWith(
      expect.arrayContaining(['restore', 'myorg/myproject', expect.stringContaining('elixir-1.17-otp-27')]),
      expect.anything(),
    );

    expect(execModule.exec).toHaveBeenCalledWith('sh', ['-c', 'curl https://mise.run | sh']);

    expect(execModule.exec).toHaveBeenCalledWith(
      expect.stringContaining('mise'),
      ['use', '-g', 'erlang@27'],
    );
    expect(execModule.exec).toHaveBeenCalledWith(
      expect.stringContaining('mise'),
      ['use', '-g', 'elixir@1.17'],
    );

    expect(execBoringCache).toHaveBeenCalledWith(
      expect.arrayContaining(['restore', 'myorg/myproject', expect.stringContaining('elixir-deps')]),
      expect.anything(),
    );
    expect(execBoringCache).toHaveBeenCalledWith(
      expect.arrayContaining(['restore', 'myorg/myproject', expect.stringContaining('elixir-build')]),
      expect.anything(),
    );

    expect(stateStore['elixirVersion']).toBe('1.17');
    expect(stateStore['erlangVersion']).toBe('27');
    expect(outputs['elixir-version']).toBe('1.17');
    expect(outputs['erlang-version']).toBe('27');

    (execBoringCache as jest.Mock).mockClear();

    jest.isolateModules(() => {
      const coreMock = require('@actions/core');
      coreMock.getState.mockImplementation((key: string) => stateStore[key] || '');
      coreMock.getInput.mockImplementation((name: string) => {
        if (name === 'workspace') return 'myorg/myproject';
        return '';
      });
      require('../lib/save');
    });
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(execBoringCache).toHaveBeenCalledWith(
      expect.arrayContaining(['save', 'myorg/myproject', expect.stringContaining('elixir-1.17-otp-27')]),
      expect.anything(),
    );
    expect(execBoringCache).toHaveBeenCalledWith(
      expect.arrayContaining(['save', 'myorg/myproject', expect.stringContaining('elixir-deps')]),
      expect.anything(),
    );
    expect(execBoringCache).toHaveBeenCalledWith(
      expect.arrayContaining(['save', 'myorg/myproject', expect.stringContaining('elixir-build')]),
      expect.anything(),
    );
  });

  it('cache-elixir=false skips runtime cache but still installs', async () => {
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'workspace': 'myorg/myproject',
        'elixir-version': '1.17',
        'erlang-version': '27',
        'working-directory': tmpDir,
        'cache-elixir': 'false',
        'cache-deps': 'false',
        'cache-build': 'false',
      };
      return inputs[name] || '';
    });

    jest.isolateModules(() => {
      require('../lib/restore');
    });
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(execBoringCache).not.toHaveBeenCalled();

    expect(execModule.exec).toHaveBeenCalledWith(
      expect.stringContaining('mise'),
      ['install', 'erlang@27'],
    );
    expect(execModule.exec).toHaveBeenCalledWith(
      expect.stringContaining('mise'),
      ['install', 'elixir@1.17'],
    );
  });

  it('skips CLI install when cli-version is "skip"', async () => {
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'workspace': 'myorg/myproject',
        'cli-version': 'skip',
        'elixir-version': '1.17',
        'erlang-version': '27',
        'working-directory': tmpDir,
      };
      return inputs[name] || '';
    });

    jest.isolateModules(() => {
      require('../lib/restore');
    });
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(ensureBoringCache).not.toHaveBeenCalled();
  });

  it('save is a no-op when workspace is missing', async () => {
    (core.getState as jest.Mock).mockImplementation(() => '');
    (core.getInput as jest.Mock).mockImplementation(() => '');

    jest.isolateModules(() => {
      require('../lib/save');
    });
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(execBoringCache).not.toHaveBeenCalled();
  });

  it('custom cache-tag propagates to all cache entries', async () => {
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'workspace': 'myorg/myproject',
        'elixir-version': '1.17',
        'erlang-version': '27',
        'working-directory': tmpDir,
        'cache-tag': 'my-custom-tag',
      };
      return inputs[name] || '';
    });

    jest.isolateModules(() => {
      require('../lib/restore');
    });
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(execBoringCache).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('my-custom-tag-elixir-1.17-otp-27')]),
      expect.anything(),
    );
    expect(execBoringCache).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('my-custom-tag-elixir-deps')]),
      expect.anything(),
    );
  });

  it('cache-deps=false skips deps cache', async () => {
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        'workspace': 'myorg/myproject',
        'elixir-version': '1.17',
        'erlang-version': '27',
        'working-directory': tmpDir,
        'cache-deps': 'false',
        'cache-build': 'false',
      };
      return inputs[name] || '';
    });

    jest.isolateModules(() => {
      require('../lib/restore');
    });
    await new Promise(resolve => setTimeout(resolve, 100));

    const boringcacheCalls = (execBoringCache as jest.Mock).mock.calls;
    const depsCalls = boringcacheCalls.filter((call: any[]) =>
      call[0]?.some?.((arg: string) => arg.includes('deps'))
    );
    expect(depsCalls.length).toBe(0);
  });
});
