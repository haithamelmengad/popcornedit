import { describe, it, expect } from 'vitest'
import { formatTime, formatTimecode, parseTimecode } from '../time'

describe('formatTime', () => {
  it('formats 0 seconds', () => {
    expect(formatTime(0)).toBe('0:00')
  })

  it('formats seconds under a minute', () => {
    expect(formatTime(5)).toBe('0:05')
    expect(formatTime(30)).toBe('0:30')
    expect(formatTime(59)).toBe('0:59')
  })

  it('formats minutes and seconds', () => {
    expect(formatTime(60)).toBe('1:00')
    expect(formatTime(90)).toBe('1:30')
    expect(formatTime(125)).toBe('2:05')
    expect(formatTime(3599)).toBe('59:59')
  })

  it('formats hours', () => {
    expect(formatTime(3600)).toBe('1:00:00')
    expect(formatTime(3661)).toBe('1:01:01')
    expect(formatTime(7200)).toBe('2:00:00')
  })

  it('handles fractional seconds by flooring', () => {
    expect(formatTime(1.7)).toBe('0:01')
    expect(formatTime(59.9)).toBe('0:59')
  })

  it('handles negative values', () => {
    expect(formatTime(-5)).toBe('0:00')
  })

  it('handles NaN and Infinity', () => {
    expect(formatTime(NaN)).toBe('0:00')
    expect(formatTime(Infinity)).toBe('0:00')
  })
})

describe('formatTimecode', () => {
  it('formats zero', () => {
    expect(formatTimecode(0)).toBe('00:00:00:00')
  })

  it('formats with default 30fps', () => {
    expect(formatTimecode(1)).toBe('00:00:01:00')
    expect(formatTimecode(61)).toBe('00:01:01:00')
    expect(formatTimecode(3661)).toBe('01:01:01:00')
  })

  it('formats fractional seconds as frames', () => {
    expect(formatTimecode(1.5, 30)).toBe('00:00:01:15')
    expect(formatTimecode(0.1, 30)).toBe('00:00:00:03')
  })

  it('handles edge cases', () => {
    expect(formatTimecode(-1)).toBe('00:00:00:00')
    expect(formatTimecode(NaN)).toBe('00:00:00:00')
  })
})

describe('parseTimecode', () => {
  it('parses HH:MM:SS:FF', () => {
    expect(parseTimecode('01:02:03:15', 30)).toBe(3600 + 120 + 3 + 15 / 30)
  })

  it('parses HH:MM:SS', () => {
    expect(parseTimecode('01:02:03')).toBe(3723)
  })

  it('parses MM:SS', () => {
    expect(parseTimecode('02:30')).toBe(150)
  })

  it('parses single number as seconds', () => {
    expect(parseTimecode('45')).toBe(45)
  })

  it('returns 0 for empty string', () => {
    expect(parseTimecode('')).toBe(0)
  })
})
