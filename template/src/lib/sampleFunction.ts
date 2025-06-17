import { VoiceEntry, ProcessedResult } from './types.ts'

/**
 * processEntries
 * --------------
 * PURE function — no IO, no mutation, deterministic.
 *  Analyze voice entries to provide insights about:
 * - Tag frequencies
 * - Language distribution
 * - Emotion score statistics
 * - Category distribution
 */
export function processEntries(entries: VoiceEntry[]): ProcessedResult {
  const tagFrequencies: Record<string, number> = {}
    const languageDistribution: Record<string, number> = {}
  const categoryDistribution: Record<string, number> = {}
  let totalEmotionScore = 0
  let entriesWithEmotionScore = 0

  for (const e of entries) {
    // Process tags
    for (const tag of e.tags_user) {
      tagFrequencies[tag] = (tagFrequencies[tag] || 0) + 1
    }

    // Process language
    const lang = e.language_rendered
    languageDistribution[lang] = (languageDistribution[lang] || 0) + 1

    // Process category
    if (e.category) {
      categoryDistribution[e.category] = (categoryDistribution[e.category] || 0) + 1
    }

    // Process emotion score
    if (e.emotion_score_score !== null) {
      totalEmotionScore += e.emotion_score_score
      entriesWithEmotionScore++
    }
  }

    // Calculate average emotion score
  const avgEmotionScore = entriesWithEmotionScore > 0 
    ? (totalEmotionScore / entriesWithEmotionScore).toFixed(2)
    : 'N/A'

  // Generate summary
  const topLanguage = Object.entries(languageDistribution)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'
  
  const topCategory = Object.entries(categoryDistribution)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A'

  const summary = [
    `Analyzed ${entries.length} entries`,
    `Most common language: ${topLanguage}`,
    `Most common category: ${topCategory}`,
    `Average emotion score: ${avgEmotionScore}`,
    `Entries with emotion scores: ${entriesWithEmotionScore}/${entries.length}`
  ].join('\n')

  return {
    summary,
    tagFrequencies,
    languageDistribution,
    categoryDistribution,
    avgEmotionScore,
    entriesWithEmotionScore,
  }
}

export default processEntries