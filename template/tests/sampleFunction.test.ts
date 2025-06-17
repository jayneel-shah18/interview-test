// eslint-disable-next-line import/no-extraneous-dependencies
import { describe, it, expect } from 'vitest'
import { mockVoiceEntries } from '../src/lib/mockData.js'
import processEntries from '../src/lib/sampleFunction.ts'
import { VoiceEntry } from '../src/lib/types.ts'

describe('processEntries', () => {
  // Helper function to create minimal VoiceEntry objects for testing
  const createMockEntry = (
    id: string, 
    tags: string[], 
    language = 'en', 
    category: string | null = null, 
    emotionScore: number | null = null
  ): VoiceEntry => {
    const iso = new Date().toISOString()
    return {
      id,
      user_id: 'test',
      audio_url: null,
      transcript_raw: '',
      transcript_user: '',
      language_detected: language,
      language_rendered: language,
      tags_model: [],
      tags_user: tags,
      category,
      created_at: iso,
      updated_at: iso,
      emotion_score_score: emotionScore,
      embedding: null,
    }
  }

  describe('basic functionality', () => {
    it('should handle empty array input', () => {
      const result = processEntries([])
      expect(result.summary).toContain('Analyzed 0 entries')
      expect(result.tagFrequencies).toEqual({})
      expect(result.languageDistribution).toEqual({})
      expect(result.categoryDistribution).toEqual({})
      expect(result.avgEmotionScore).toBe('N/A')
      expect(result.entriesWithEmotionScore).toBe(0)
    })

    it('should handle single entry with no tags', () => {
      const entries = [createMockEntry('1', [], 'en', 'work', 0.5)]
      const result = processEntries(entries)
      expect(result.summary).toContain('Analyzed 1 entries')
      expect(result.tagFrequencies).toEqual({})
      expect(result.languageDistribution).toEqual({ en: 1 })
      expect(result.categoryDistribution).toEqual({ work: 1 })
      expect(result.avgEmotionScore).toBe('0.50')
      expect(result.entriesWithEmotionScore).toBe(1)
    })

    it('should maintain consistent return structure', () => {
      const entries = [createMockEntry('1', ['test'])]
      const result = processEntries(entries)
      
      // Verify the structure matches ProcessedResult interface
      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('tagFrequencies')
      expect(result).toHaveProperty('languageDistribution')
      expect(result).toHaveProperty('categoryDistribution')
      expect(result).toHaveProperty('avgEmotionScore')
      expect(result).toHaveProperty('entriesWithEmotionScore')
      expect(typeof result.summary).toBe('string')
      expect(typeof result.tagFrequencies).toBe('object')
      expect(typeof result.languageDistribution).toBe('object')
      expect(typeof result.categoryDistribution).toBe('object')
      expect(typeof result.entriesWithEmotionScore).toBe('number')
    })
  })

  describe('tag processing', () => {
    it('should handle single entry with one tag', () => {
      const entries = [createMockEntry('1', ['happy'])]
      const result = processEntries(entries)
      expect(result.tagFrequencies).toEqual({ happy: 1 })
    })

    it('should handle single entry with multiple tags', () => {
      const entries = [createMockEntry('1', ['happy', 'excited', 'grateful'])]
      const result = processEntries(entries)
      expect(result.tagFrequencies).toEqual({
        happy: 1,
        excited: 1,
        grateful: 1
      })
    })

    it('should handle single entry with duplicate tags', () => {
      const entries = [createMockEntry('1', ['happy', 'happy', 'excited'])]
      const result = processEntries(entries)
      expect(result.tagFrequencies).toEqual({
        happy: 2,
        excited: 1
      })
    })

    it('should handle multiple entries with overlapping tags', () => {
      const entries = [
        createMockEntry('1', ['happy', 'excited']),
        createMockEntry('2', ['happy', 'grateful']),
        createMockEntry('3', ['excited', 'peaceful'])
      ]
      const result = processEntries(entries)
      expect(result.tagFrequencies).toEqual({
        happy: 2,
        excited: 2,
        grateful: 1,
        peaceful: 1
      })
    })

    it('should handle entries with special characters in tags', () => {
      const entries = [
        createMockEntry('1', ['tag-with-dash', 'tag_with_underscore']),
        createMockEntry('2', ['tag with space', 'tag123'])
      ]
      const result = processEntries(entries)
      expect(result.tagFrequencies).toEqual({
        'tag-with-dash': 1,
        'tag_with_underscore': 1,
        'tag with space': 1,
        'tag123': 1
      })
    })

    it('should handle entries with empty string tags', () => {
      const entries = [
        createMockEntry('1', ['', 'valid-tag', '']),
        createMockEntry('2', ['another-tag'])
      ]
      const result = processEntries(entries)
      expect(result.tagFrequencies).toEqual({
        '': 2,
        'valid-tag': 1,
        'another-tag': 1
      })
    })
  })

  describe('language distribution', () => {
    it('should count language distribution correctly', () => {
      const entries = [
        createMockEntry('1', ['tag1'], 'en'),
        createMockEntry('2', ['tag2'], 'es'),
        createMockEntry('3', ['tag3'], 'en'),
        createMockEntry('4', ['tag4'], 'fr')
      ]
      const result = processEntries(entries)
      expect(result.languageDistribution).toEqual({
        en: 2,
        es: 1,
        fr: 1
      })
      expect(result.summary).toContain('Most common language: en')
    })

    it('should handle single language', () => {
      const entries = [
        createMockEntry('1', ['tag1'], 'en'),
        createMockEntry('2', ['tag2'], 'en')
      ]
      const result = processEntries(entries)
      expect(result.languageDistribution).toEqual({ en: 2 })
      expect(result.summary).toContain('Most common language: en')
    })
  })

  describe('category distribution', () => {
    it('should count category distribution correctly', () => {
      const entries = [
        createMockEntry('1', ['tag1'], 'en', 'work'),
        createMockEntry('2', ['tag2'], 'en', 'personal'),
        createMockEntry('3', ['tag3'], 'en', 'work'),
        createMockEntry('4', ['tag4'], 'en', null)
      ]
      const result = processEntries(entries)
      expect(result.categoryDistribution).toEqual({
        work: 2,
        personal: 1
      })
      expect(result.summary).toContain('Most common category: work')
    })

    it('should handle entries with null categories', () => {
      const entries = [
        createMockEntry('1', ['tag1'], 'en', null),
        createMockEntry('2', ['tag2'], 'en', null)
      ]
      const result = processEntries(entries)
      expect(result.categoryDistribution).toEqual({})
      expect(result.summary).toContain('Most common category: N/A')
    })

    it('should handle mix of null and valid categories', () => {
      const entries = [
        createMockEntry('1', ['tag1'], 'en', 'work'),
        createMockEntry('2', ['tag2'], 'en', null),
        createMockEntry('3', ['tag3'], 'en', 'personal')
      ]
      const result = processEntries(entries)
      expect(result.categoryDistribution).toEqual({
        work: 1,
        personal: 1
      })
    })
  })

  describe('emotion score processing', () => {
    it('should calculate average emotion score correctly', () => {
      const entries = [
        createMockEntry('1', ['tag1'], 'en', null, 0.8),
        createMockEntry('2', ['tag2'], 'en', null, 0.6),
        createMockEntry('3', ['tag3'], 'en', null, 0.4)
      ]
      const result = processEntries(entries)
      expect(result.avgEmotionScore).toBe('0.60') // (0.8 + 0.6 + 0.4) / 3
      expect(result.entriesWithEmotionScore).toBe(3)
      expect(result.summary).toContain('Average emotion score: 0.60')
      expect(result.summary).toContain('Entries with emotion scores: 3/3')
    })

    it('should handle entries with null emotion scores', () => {
      const entries = [
        createMockEntry('1', ['tag1'], 'en', null, null),
        createMockEntry('2', ['tag2'], 'en', null, null)
      ]
      const result = processEntries(entries)
      expect(result.avgEmotionScore).toBe('N/A')
      expect(result.entriesWithEmotionScore).toBe(0)
      expect(result.summary).toContain('Average emotion score: N/A')
      expect(result.summary).toContain('Entries with emotion scores: 0/2')
    })

    it('should handle mix of null and valid emotion scores', () => {
      const entries = [
        createMockEntry('1', ['tag1'], 'en', null, 0.8),
        createMockEntry('2', ['tag2'], 'en', null, null),
        createMockEntry('3', ['tag3'], 'en', null, 0.4),
        createMockEntry('4', ['tag4'], 'en', null, null)
      ]
      const result = processEntries(entries)
      expect(result.avgEmotionScore).toBe('0.60') // (0.8 + 0.4) / 2
      expect(result.entriesWithEmotionScore).toBe(2)
      expect(result.summary).toContain('Average emotion score: 0.60')
      expect(result.summary).toContain('Entries with emotion scores: 2/4')
    })

    it('should handle zero emotion scores', () => {
      const entries = [
        createMockEntry('1', ['tag1'], 'en', null, 0.0),
        createMockEntry('2', ['tag2'], 'en', null, 0.5)
      ]
      const result = processEntries(entries)
      expect(result.avgEmotionScore).toBe('0.25') // (0.0 + 0.5) / 2
      expect(result.entriesWithEmotionScore).toBe(2)
    })
  })

  describe('comprehensive integration', () => {
    it('should handle complex mixed data correctly', () => {
      const entries = [
        createMockEntry('1', ['happy', 'work'], 'en', 'professional', 0.8),
        createMockEntry('2', ['sad'], 'es', 'personal', null),
        createMockEntry('3', ['excited', 'happy'], 'en', 'professional', 0.6),
        createMockEntry('4', [], 'fr', null, 0.4),
        createMockEntry('5', ['grateful', 'peaceful'], 'en', 'personal', null)
      ]
      const result = processEntries(entries)
      
      // Check all aspects
      expect(result.tagFrequencies).toEqual({
        happy: 2,
        work: 1,
        sad: 1,
        excited: 1,
        grateful: 1,
        peaceful: 1
      })
      expect(result.languageDistribution).toEqual({
        en: 3,
        es: 1,
        fr: 1
      })
      expect(result.categoryDistribution).toEqual({
        professional: 2,
        personal: 2
      })
      expect(result.avgEmotionScore).toBe('0.60') // (0.8 + 0.6 + 0.4) / 3
      expect(result.entriesWithEmotionScore).toBe(3)
      expect(result.summary).toContain('Analyzed 5 entries')
      expect(result.summary).toContain('Most common language: en')
    })

    it('should handle large number of entries efficiently', () => {
      const entries = Array.from({ length: 1000 }, (_, i) => 
        createMockEntry(
          String(i), 
          [`tag${i % 5}`], 
          i % 2 === 0 ? 'en' : 'es',
          i % 3 === 0 ? 'work' : 'personal',
          i % 4 === 0 ? (i % 100) / 100 : null
        )
      )
      const result = processEntries(entries)
      
      expect(result.tagFrequencies).toEqual({
        'tag0': 200,
        'tag1': 200,
        'tag2': 200,
        'tag3': 200,
        'tag4': 200
      })
      expect(result.languageDistribution).toEqual({
        en: 500,
        es: 500
      })
      expect(result.entriesWithEmotionScore).toBe(250) // Every 4th entry
      expect(result.summary).toContain('Analyzed 1000 entries')
    })

    it('counts reflection tag correctly with mock data', () => {
      const result = processEntries(mockVoiceEntries)
      expect(result.tagFrequencies.reflection).toBe(mockVoiceEntries.length)
      expect(result.summary).toContain(`Analyzed ${mockVoiceEntries.length} entries`)
      expect(result.languageDistribution.en).toBe(mockVoiceEntries.length)
    })
  })
}) 