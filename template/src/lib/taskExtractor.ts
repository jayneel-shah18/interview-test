import { VoiceEntry } from './types.ts'

// Common action verbs that indicate tasks
const ACTION_VERBS = new Set([
  'call', 'schedule', 'book', 'buy', 'purchase', 'order',
  'send', 'email', 'write', 'submit', 'complete', 'finish',
  'start', 'begin', 'create', 'make', 'prepare', 'organize',
  'plan', 'arrange', 'set', 'fix', 'repair', 'check', 'review',
  'update', 'change', 'modify', 'implement', 'install', 'setup',
  'need', 'should', 'must', 'have to', 'want to'
])

// Common task categories
const TASK_CATEGORIES = {
  WORK: 'work',
  PERSONAL: 'personal',
  HEALTH: 'health',
  SHOPPING: 'shopping',
  HOME: 'home',
  OTHER: 'other'
} as const

export interface ExtractedTask {
  task_text: string
  due_date: string | null
  status: 'pending' | 'completed' | 'cancelled'
  category: typeof TASK_CATEGORIES[keyof typeof TASK_CATEGORIES]
  source_entry_id: string
  created_at: string
  priority?: 'high' | 'medium' | 'low'
  context?: string
}

export class TaskExtractor {
  private static extractDate(text: string): string | null {
    // Date patterns for extraction
    const datePatterns = [
      // Relative dates
      { pattern: /\b(tomorrow|next week|next month|next year|today|tonight)\b/i, 
        transform: (match: RegExpMatchArray) => {
          const date = new Date()
          switch(match[0].toLowerCase()) {
            case 'today':
            case 'tonight': return date.toISOString().split('T')[0]
            case 'tomorrow': date.setDate(date.getDate() + 1); break
            case 'next week': date.setDate(date.getDate() + 7); break
            case 'next month': date.setMonth(date.getMonth() + 1); break
            case 'next year': date.setFullYear(date.getFullYear() + 1); break
          }
          return date.toISOString().split('T')[0]
        }
      },
      // Days of the week
      { pattern: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
        transform: (match: RegExpMatchArray) => {
          const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          const targetDay = daysOfWeek.indexOf(match[0].toLowerCase())
          const today = new Date()
          const currentDay = today.getDay()
          let daysToAdd = targetDay - currentDay
          if (daysToAdd <= 0) daysToAdd += 7 // Next occurrence
          today.setDate(today.getDate() + daysToAdd)
          return today.toISOString().split('T')[0]
        }
      },
      // Specific dates with prepositions
      { pattern: /(?:in|on|by)\s+(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})/i,
        transform: (match: RegExpMatchArray) => {
          try {
            const dateStr = match[1].replace(/(\d{1,2})(st|nd|rd|th)/i, '$1')
            const parsedDate = new Date(dateStr)
            return parsedDate.toISOString().split('T')[0]
          } catch {
            return null
          }
        }
      },
      // Numeric dates
      { pattern: /(?:in|on|by)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i,
        transform: (match: RegExpMatchArray) => {
          try {
            const parsedDate = new Date(match[1])
            return parsedDate.toISOString().split('T')[0]
          } catch {
            return null
          }
        }
      }
    ]

    for (const { pattern, transform } of datePatterns) {
      const match = text.match(pattern)
      if (match) {
        const result = transform(match)
        if (result) return result
      }
    }
    return null
  }

  private static determineCategory(text: string): typeof TASK_CATEGORIES[keyof typeof TASK_CATEGORIES] {
    const lowerText = text.toLowerCase()
    
    if (lowerText.match(/\b(work|meeting|project|deadline|report|presentation|interview|conference)\b/)) {
      return TASK_CATEGORIES.WORK
    }
    if (lowerText.match(/\b(doctor|appointment|health|exercise|diet|medication|checkup|therapy)\b/)) {
      return TASK_CATEGORIES.HEALTH
    }
    if (lowerText.match(/\b(buy|purchase|shop|grocery|store|order|get|pick up)\b/)) {
      return TASK_CATEGORIES.SHOPPING
    }
    if (lowerText.match(/\b(home|house|apartment|clean|repair|maintenance|fix|install)\b/)) {
      return TASK_CATEGORIES.HOME
    }
    if (lowerText.match(/\b(family|friend|personal|hobby|leisure|vacation|travel|trip)\b/)) {
      return TASK_CATEGORIES.PERSONAL
    }
    
    return TASK_CATEGORIES.OTHER
  }

  private static determinePriority(text: string): 'high' | 'medium' | 'low' {
    const lowerText = text.toLowerCase()
    
    if (lowerText.match(/\b(urgent|asap|immediately|right away|today|tonight)\b/)) {
      return 'high'
    }
    if (lowerText.match(/\b(soon|later|next|upcoming|sometime)\b/)) {
      return 'low'
    }
    return 'medium'
  }

  private static extractTasksFromText(text: string): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const tasks: string[] = []

    for (const sentence of sentences) {
      const words = sentence.trim().split(/\s+/)
      
      // Look for action verbs or task indicators
      for (let i = 0; i < words.length; i++) {
        const word = words[i].toLowerCase()
        const nextWord = words[i + 1]?.toLowerCase() || ''
        const twoWordPhrase = `${word} ${nextWord}`
        
        if (ACTION_VERBS.has(word) || ACTION_VERBS.has(twoWordPhrase)) {
          // Find the start of the actual action verb
          let startIndex = i
          if (ACTION_VERBS.has(twoWordPhrase) && !ACTION_VERBS.has(word)) {
            startIndex = i + 1
          }
          
          // Extract from the action verb to the end of sentence
          const taskWords = words.slice(startIndex)
          const taskText = taskWords.join(' ').trim()
          
          if (taskText.length > 0) {
            tasks.push(taskText)
          }
          break
        }
      }
      
      // Look for "and" to split multiple tasks in the same sentence
      if (sentence.includes(' and ')) {
        const parts = sentence.split(' and ')
        for (let j = 1; j < parts.length; j++) {
          const part = parts[j].trim()
          const partWords = part.split(/\s+/)
          
          for (let k = 0; k < partWords.length; k++) {
            const word = partWords[k].toLowerCase()
            if (ACTION_VERBS.has(word)) {
              const additionalTask = partWords.slice(k).join(' ').trim()
              if (additionalTask.length > 0 && !tasks.includes(additionalTask)) {
                tasks.push(additionalTask)
              }
              break
            }
          }
        }
      }
    }

    return tasks
  }

  public static extractTasks(entry: VoiceEntry): ExtractedTask[] {
    const tasks: ExtractedTask[] = []
    const extractedTaskTexts = this.extractTasksFromText(entry.transcript_user)
    
    // Remove overlapping tasks
    const deduplicatedTexts = this.deduplicateTaskTexts(extractedTaskTexts)

    for (const taskText of deduplicatedTexts) {
      tasks.push({
        task_text: taskText,
        due_date: this.extractDate(taskText),
        status: 'pending',
        category: this.determineCategory(taskText),
        priority: this.determinePriority(taskText),
        source_entry_id: entry.id,
        created_at: new Date().toISOString(),
        context: entry.transcript_user
      })
    }

    return tasks
  }

  private static deduplicateTaskTexts(taskTexts: string[]): string[] {
    // Remove tasks which are very similar or exact substrings
    const filtered: string[] = []
    
    for (const task of taskTexts) {
      const normalizedTask = task.toLowerCase().trim()
      
      // Only remove if an exact duplicate or very short fragment
      const isDuplicate = filtered.some(existing => {
        const normalizedExisting = existing.toLowerCase().trim()
        
        // Exact match
        if (normalizedTask === normalizedExisting) return true
        
        // Very short task in long sentence
        if (normalizedTask.length < 15 && normalizedExisting.includes(normalizedTask)) return true
        
        return false
      })
      
      if (!isDuplicate) {
        filtered.push(task)
      }
    }
    
    return filtered
  }
} 