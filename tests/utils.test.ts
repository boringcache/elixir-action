import { getWorkspace, getCacheTagPrefix, getElixirVersion, getErlangVersion, getMiseBinPath, getMiseDataDir } from '../lib/utils';
import * as core from '@actions/core';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Elixir Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.BORINGCACHE_DEFAULT_WORKSPACE;
    delete process.env.GITHUB_REPOSITORY;
  });

  describe('getWorkspace', () => {
    it('should return input workspace when provided', () => {
      expect(getWorkspace('my-org/my-project')).toBe('my-org/my-project');
    });

    it('should use BORINGCACHE_DEFAULT_WORKSPACE as fallback', () => {
      process.env.BORINGCACHE_DEFAULT_WORKSPACE = 'default-org/default-project';
      expect(getWorkspace('')).toBe('default-org/default-project');
    });

    it('should add default/ prefix when no slash present', () => {
      expect(getWorkspace('my-project')).toBe('default/my-project');
    });

    it('should fail when no workspace available', () => {
      expect(() => getWorkspace('')).toThrow('Workspace required');
    });
  });

  describe('getCacheTagPrefix', () => {
    it('should return input cache tag when provided', () => {
      expect(getCacheTagPrefix('my-cache')).toBe('my-cache');
    });

    it('should use repository name as default', () => {
      process.env.GITHUB_REPOSITORY = 'owner/my-repo';
      expect(getCacheTagPrefix('')).toBe('my-repo');
    });

    it('should return elixir as final fallback', () => {
      expect(getCacheTagPrefix('')).toBe('elixir');
    });
  });

  describe('getElixirVersion', () => {
    it('should return input version when provided', async () => {
      expect(await getElixirVersion('1.16', '/tmp')).toBe('1.16');
    });

    it('should read from .elixir-version file', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'elixir-test-'));
      try {
        await fs.promises.writeFile(path.join(tmpDir, '.elixir-version'), '1.17.0\n');
        expect(await getElixirVersion('', tmpDir)).toBe('1.17.0');
      } finally {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should read from .tool-versions file', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'elixir-test-'));
      try {
        await fs.promises.writeFile(path.join(tmpDir, '.tool-versions'), 'erlang 27.0\nelixir 1.17.2\n');
        expect(await getElixirVersion('', tmpDir)).toBe('1.17.2');
      } finally {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should read from mix.exs elixir requirement', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'elixir-test-'));
      try {
        await fs.promises.writeFile(path.join(tmpDir, 'mix.exs'), `
defmodule MyApp.MixProject do
  use Mix.Project
  def project do
    [app: :my_app, version: "0.1.0", elixir: "~> 1.16"]
  end
end
`);
        expect(await getElixirVersion('', tmpDir)).toBe('1.16');
      } finally {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should fall back to 1.18', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'elixir-test-'));
      try {
        expect(await getElixirVersion('', tmpDir)).toBe('1.18');
      } finally {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('getErlangVersion', () => {
    it('should return input version when provided', async () => {
      expect(await getErlangVersion('26', '/tmp')).toBe('26');
    });

    it('should read from .tool-versions file', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'elixir-test-'));
      try {
        await fs.promises.writeFile(path.join(tmpDir, '.tool-versions'), 'erlang 27.0\nelixir 1.17.2\n');
        expect(await getErlangVersion('', tmpDir)).toBe('27.0');
      } finally {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      }
    });

    it('should fall back to 27', async () => {
      const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'elixir-test-'));
      try {
        expect(await getErlangVersion('', tmpDir)).toBe('27');
      } finally {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe('getMiseBinPath', () => {
    it('should return mise binary path', () => {
      const result = getMiseBinPath();
      expect(result).toContain('mise');
      expect(result).toContain('.local');
    });
  });

  describe('getMiseDataDir', () => {
    it('should return mise data directory', () => {
      const result = getMiseDataDir();
      expect(result).toContain('mise');
    });
  });
});
