import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isElectron, runFFmpeg, runFFprobe } from '../platform'

describe('Platform', () => {
  beforeEach(() => {
    // Ensure clean state
    delete (window as any).electronAPI
  })

  it('isElectron returns false when no electronAPI', () => {
    expect(isElectron()).toBe(false)
  })

  it('isElectron returns true when electronAPI exists', () => {
    ;(window as any).electronAPI = {
      openFile: vi.fn(),
      ffmpegRun: vi.fn(),
      ffprobeRun: vi.fn(),
      onFfmpegProgress: vi.fn(),
    }
    expect(isElectron()).toBe(true)
  })

  it('runFFmpeg throws in browser mode', async () => {
    await expect(runFFmpeg(['-version'])).rejects.toThrow('not available in browser')
  })

  it('runFFprobe throws in browser mode', async () => {
    await expect(runFFprobe(['-version'])).rejects.toThrow('not available in browser')
  })

  it('runFFmpeg calls electronAPI when available', async () => {
    const mockRun = vi.fn().mockResolvedValue({ stdout: 'ok', stderr: '' })
    ;(window as any).electronAPI = {
      openFile: vi.fn(),
      ffmpegRun: mockRun,
      ffprobeRun: vi.fn(),
      onFfmpegProgress: vi.fn(),
    }
    const result = await runFFmpeg(['-version'])
    expect(mockRun).toHaveBeenCalledWith(['-version'])
    expect(result.stdout).toBe('ok')
  })
})
