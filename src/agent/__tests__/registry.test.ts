import { describe, it, expect, beforeEach } from 'vitest'
import { toolRegistry, registerAllTools } from '../tools'

describe('ToolRegistry', () => {
  beforeEach(() => {
    toolRegistry.clear()
  })

  it('starts empty', () => {
    expect(toolRegistry.getNames()).toHaveLength(0)
  })

  it('registerAllTools registers all built-in tools', () => {
    registerAllTools()
    const names = toolRegistry.getNames()
    expect(names).toContain('get_timeline')
    expect(names).toContain('cut')
    expect(names).toContain('trim')
    expect(names).toContain('split')
    expect(names).toContain('speed')
    expect(names).toContain('volume')
    expect(names).toContain('delete_clip')
    expect(names.length).toBe(7)
  })

  it('has() returns true for registered tools', () => {
    registerAllTools()
    expect(toolRegistry.has('cut')).toBe(true)
    expect(toolRegistry.has('nonexistent')).toBe(false)
  })

  it('get() returns the tool', () => {
    registerAllTools()
    const tool = toolRegistry.get('cut')
    expect(tool).toBeDefined()
    expect(tool!.name).toBe('cut')
  })

  it('getDefinitions() returns LLM-compatible definitions', () => {
    registerAllTools()
    const defs = toolRegistry.getDefinitions()
    expect(defs.length).toBe(7)
    for (const def of defs) {
      expect(def.name).toBeTruthy()
      expect(def.description).toBeTruthy()
      expect(def.parameters).toBeDefined()
    }
  })

  it('execute() returns error for unknown tool', () => {
    const result = toolRegistry.execute('bogus', {})
    expect(result.success).toBe(false)
    expect(result.message).toContain('Unknown tool')
  })

  it('clear() removes all tools', () => {
    registerAllTools()
    expect(toolRegistry.getNames().length).toBeGreaterThan(0)
    toolRegistry.clear()
    expect(toolRegistry.getNames()).toHaveLength(0)
  })
})
