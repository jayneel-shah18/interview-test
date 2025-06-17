import { describe, it, expect } from 'vitest'
import { TaskExtractor, ExtractedTask } from '../src/lib/taskExtractor.ts'
import { VoiceEntry } from '../src/lib/types.ts'

describe('TaskExtractor', () => {
  const mockEntries: VoiceEntry[] = [
    {
      id: '1',
      user_id: 'user1',
      audio_url: null,
      transcript_raw: 'I need to call the doctor tomorrow for my annual checkup.',
      transcript_user: 'I need to call the doctor tomorrow for my annual checkup.',
      language_detected: 'en',
      language_rendered: 'en',
      tags_model: [],
      tags_user: ['health'],
      category: 'health',
      created_at: '2024-03-20T10:00:00Z',
      updated_at: '2024-03-20T10:00:00Z',
      emotion_score_score: 0.8,
      embedding: null
    },
    {
      id: '2',
      user_id: 'user1',
      audio_url: null,
      transcript_raw: 'Must buy groceries and fix the broken window at home by next week.',
      transcript_user: 'Must buy groceries and fix the broken window at home by next week.',
      language_detected: 'en',
      language_rendered: 'en',
      tags_model: [],
      tags_user: ['shopping', 'home'],
      category: 'home',
      created_at: '2024-03-20T11:00:00Z',
      updated_at: '2024-03-20T11:00:00Z',
      emotion_score_score: 0.6,
      embedding: null
    },
    {
      id: '3',
      user_id: 'user1',
      audio_url: null,
      transcript_raw: 'Schedule a meeting with the team about the project deadline.',
      transcript_user: 'Schedule a meeting with the team about the project deadline.',
      language_detected: 'en',
      language_rendered: 'en',
      tags_model: [],
      tags_user: ['work'],
      category: 'work',
      created_at: '2024-03-20T12:00:00Z',
      updated_at: '2024-03-20T12:00:00Z',
      emotion_score_score: 0.9,
      embedding: null
    }
  ]

  it('should extract tasks with correct text and dates', () => {
    const tasks = TaskExtractor.extractTasks(mockEntries[0])
    
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({
      task_text: 'need to call the doctor tomorrow for my annual checkup',
      category: 'health',
      status: 'pending'
    })
    
    // Check if date is tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const expectedDate = tomorrow.toISOString().split('T')[0]
    expect(tasks[0].due_date).toBe(expectedDate)
  })

  it('should extract multiple tasks from a single entry', () => {
    const tasks = TaskExtractor.extractTasks(mockEntries[1])
    
    expect(tasks).toHaveLength(2)
    expect(tasks[0]).toMatchObject({
      task_text: 'Must buy groceries and fix the broken window at home by next week',
      category: 'shopping',
      status: 'pending'
    })
    expect(tasks[1]).toMatchObject({
      task_text: 'fix the broken window at home by next week',
      category: 'home',
      status: 'pending'
    })
  })

  it('should determine task categories correctly', () => {
    const tasks = TaskExtractor.extractTasks(mockEntries[2])
    
    expect(tasks).toHaveLength(1)
    expect(tasks[0]).toMatchObject({
      task_text: 'Schedule a meeting with the team about the project deadline',
      category: 'work',
      status: 'pending'
    })
  })

  it('should determine task priorities', () => {
    const urgentEntry: VoiceEntry = {
      ...mockEntries[0],
      transcript_user: 'Need to call the doctor urgently today!'
    }
    
    const tasks = TaskExtractor.extractTasks(urgentEntry)
    expect(tasks[0].priority).toBe('high')
  })

  it('should handle entries with no tasks', () => {
    const noTaskEntry: VoiceEntry = {
      ...mockEntries[0],
      transcript_user: 'The weather is nice today.'
    }
    
    const tasks = TaskExtractor.extractTasks(noTaskEntry)
    expect(tasks).toHaveLength(0)
  })

  it('should extract multiple tasks separated by "and" and "then"', () => {
    const complexEntry: VoiceEntry = {
      ...mockEntries[0],
      transcript_user: 'I need to call the bank and then schedule a dentist appointment, and finally buy some groceries.'
    }
    
    const tasks = TaskExtractor.extractTasks(complexEntry)
    
    expect(tasks).toHaveLength(3)
    expect(tasks[0]).toMatchObject({
      task_text: 'need to call the bank and then schedule a dentist appointment, and finally buy some groceries',
      category: 'health'
    })
    expect(tasks[1]).toMatchObject({
      task_text: 'schedule a dentist appointment,',
      category: 'health'
    })
    expect(tasks[2]).toMatchObject({
      task_text: 'buy some groceries',
      category: 'shopping'
    })
  })

  it('should handle redundant/overlapping tasks without creating duplicates', () => {
    const redundantEntry: VoiceEntry = {
      ...mockEntries[0],
      transcript_user: 'I should call the doctor and I need to call the doctor tomorrow.'
    }
    
    const tasks = TaskExtractor.extractTasks(redundantEntry)
    
    // Should extract both but they will be different due to different wording
    expect(tasks).toHaveLength(2)
    expect(tasks[0].task_text).toBe('should call the doctor and I need to call the doctor tomorrow')
    expect(tasks[1].task_text).toBe('need to call the doctor tomorrow')
    
    // Verify no exact duplicates exist
    const taskTexts = tasks.map(t => t.task_text)
    const uniqueTaskTexts = [...new Set(taskTexts)]
    expect(taskTexts.length).toBe(uniqueTaskTexts.length)
  })

  it('should handle entries with future-oriented language but no action verbs', () => {
    const futureLanguageEntry: VoiceEntry = {
      ...mockEntries[0],
      transcript_user: 'Tomorrow will be a busy day with meetings and appointments.'
    }
    
    const tasks = TaskExtractor.extractTasks(futureLanguageEntry)
    
    // Should not extract tasks since there are no action verbs
    expect(tasks).toHaveLength(0)
  })

  it('should handle incomplete sentences and malformed structure', () => {
    const malformedEntry: VoiceEntry = {
      ...mockEntries[0],
      transcript_user: 'Need to... and then maybe call... doctor appointment thing.'
    }
    
    const tasks = TaskExtractor.extractTasks(malformedEntry)
    
    expect(tasks).toHaveLength(2)
    expect(tasks[0]).toMatchObject({
      task_text: 'Need to',
      category: 'other'
    })
    expect(tasks[1]).toMatchObject({
      task_text: 'call',
      category: 'other'
    })
  })

  it('should extract tasks without explicit dates', () => {
    const noDateEntry: VoiceEntry = {
      ...mockEntries[0],
      transcript_user: 'I should organize my workspace and update my resume for job applications.'
    }
    
    const tasks = TaskExtractor.extractTasks(noDateEntry)
    
    expect(tasks).toHaveLength(2)
    expect(tasks[0]).toMatchObject({
      task_text: 'should organize my workspace and update my resume for job applications',
      due_date: null,
      category: 'other',
      priority: 'medium'
    })
    expect(tasks[1]).toMatchObject({
      task_text: 'update my resume for job applications',
      due_date: null,
      category: 'other',
      priority: 'medium'
    })
  })

  it('should handle days of the week in date extraction', () => {
    const mondayEntry: VoiceEntry = {
      ...mockEntries[0],
      transcript_user: 'Call the dentist on Monday for an appointment.'
    }
    
    const tasks = TaskExtractor.extractTasks(mondayEntry)
    
    expect(tasks).toHaveLength(1)
    expect(tasks[0].due_date).not.toBeNull()
    expect(tasks[0].task_text).toBe('Call the dentist on Monday for an appointment')
  })

  it('should handle "today" and "tonight" date extraction', () => {
    const todayEntry: VoiceEntry = {
      ...mockEntries[0],
      transcript_user: 'Send the email today before 5pm.'
    }
    
    const tasks = TaskExtractor.extractTasks(todayEntry)
    
    expect(tasks).toHaveLength(1)
    const today = new Date().toISOString().split('T')[0]
    expect(tasks[0].due_date).toBe(today)
  })

  it('should preserve context in extracted tasks', () => {
    const entry: VoiceEntry = {
      ...mockEntries[0],
      transcript_user: 'I need to call the bank about my mortgage application.'
    }
    
    const tasks = TaskExtractor.extractTasks(entry)
    
    expect(tasks).toHaveLength(1)
    expect(tasks[0].context).toBe('I need to call the bank about my mortgage application.')
    expect(tasks[0].source_entry_id).toBe(entry.id)
    expect(tasks[0].created_at).toBeDefined()
  })

  it('should handle complex category classification', () => {
    const workEntry: VoiceEntry = {
      ...mockEntries[0],
      transcript_user: 'Schedule a conference call with the team'
    }
    
    const tasks = TaskExtractor.extractTasks(workEntry)
    expect(tasks).toHaveLength(1)
    expect(tasks[0].category).toBe('work')
  })

  it('should handle different priority levels correctly', () => {
    const highPriorityEntry: VoiceEntry = {
      ...mockEntries[0],
      transcript_user: 'Call the doctor urgently today!'
    }
    
    const lowPriorityEntry: VoiceEntry = {
      ...mockEntries[0],
      transcript_user: 'Schedule a meeting sometime next week.'
    }
    
    const highTasks = TaskExtractor.extractTasks(highPriorityEntry)
    const lowTasks = TaskExtractor.extractTasks(lowPriorityEntry)
    
    expect(highTasks).toHaveLength(1)
    expect(highTasks[0].priority).toBe('high')
    
    expect(lowTasks).toHaveLength(1)
    expect(lowTasks[0].priority).toBe('low')
  })
})