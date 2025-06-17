# Project Changes Documentation

This document outlines all the changes made to implement task extraction functionality and enhance the existing voice entry processing system.

## Design Methodology

### Actionable Intent Detection

**Multi-Signal Approach:**
- **Verb + Object Pattern Detection**: We identify actionable tasks by looking for action verbs (e.g., "call," "schedule," "buy") followed by objects (e.g., "doctor," "meeting," "groceries"). This pattern signals clear, actionable intent.

- **Contextual Cues & Indicators**: Additional signals include phrases like "need to," "should," "must," "have to," and "want to". These modal verbs and obligation phrases help distinguish actionable tasks from general statements or observations.

- **Sentence Structure Analysis**: We parse sentences to identify imperative constructions and future-oriented language that indicates planned actions rather than past events or general commentary.

**Implementation Details:**
```typescript
// 25+ action verbs for task detection
const ACTION_VERBS = new Set([
  'call', 'schedule', 'book', 'buy', 'purchase', 'order',
  'send', 'email', 'write', 'submit', 'complete', 'finish',
  'start', 'begin', 'create', 'make', 'prepare', 'organize',
  'plan', 'arrange', 'set', 'fix', 'repair', 'check', 'review',
  'update', 'change', 'modify', 'implement', 'install', 'setup',
  'need', 'should', 'must', 'have to', 'want to'
])

// Algorithm looks for:
// 1. Direct action verbs in sentences
// 2. Modal + infinitive constructions ("need to call")
// 3. Compound sentences with "and" for multiple tasks
```

### **Structured Output Design Rationale:**


- **Clarity and Consistency -**
The output format includes standardized fields (`task_text`, `due_date`, `status`, `category`, `priority`) ensuring clarity and consistency across all extracted tasks. This structure makes it easier to:
  - Process tasks programmatically
  - Display tasks in user interfaces
  - Integrate with external systems
  - Maintain data quality

- **Scalability and Extensibility -**
By defining clear input signals and output formats, the system can easily:
  - Scale to handle thousands of entries
  - Adapt to new types of tasks or categories
  - Add new fields without breaking existing functionality
  - Support multiple languages or domains

- **Integration-Ready Architecture -**
The structured format enables seamless integration with:
  - Task management systems
  - Calendar applications
  - Reminder services
  - Analytics platforms
  - Reporting tools

- **User Experience Optimization -**
A structured format allows users to:
  - Quickly understand and act on their tasks
  - Filter and sort by priority, category, or due date
  - Track completion status and progress
  - Receive relevant notifications

### Integration with Reminders or Summaries

**Reminder System Integration**

- **Calendar Sync:**
  - `due_date` field directly maps to calendar event dates
  - `category` field enables calendar color-coding and grouping
  - `priority` field determines notification urgency and timing

- **Smart Notifications:**
  ```typescript
  // Example integration logic
  if (task.priority === 'high' && task.due_date === 'today') {
    sendImmediateNotification(task)
  } else if (task.due_date === 'tomorrow') {
    scheduleReminderNotification(task, '8:00 AM')
  }
  ```

- **Contextual Reminders:**
  - Location-based reminders using `category` (e.g., "shopping" tasks when near stores)
  - Time-based reminders using `due_date` and `priority`
  - Context-aware reminders using original `transcript` context

**Summary Integration**

- **Daily/Weekly Summaries:**
  ```typescript
  // Aggregate tasks by timeframe and category
  const todayTasks = tasks.filter(t => t.due_date === today)
  const workTasks = tasks.filter(t => t.category === 'work')
  const highPriorityTasks = tasks.filter(t => t.priority === 'high')

  // Generate summary
  const summary = `
  Today: ${todayTasks.length} tasks due
  High Priority: ${highPriorityTasks.length} urgent items
  Work: ${workTasks.length} professional tasks
  `
  ```

- **Progress Tracking:**
  - Task completion rates by category
  - Overdue task identification and escalation
  - Productivity metrics and trend analysis

- **Intelligent Insights:**
  - Pattern recognition in task creation and completion
  - Workload balancing suggestions
  - Category-based productivity recommendations

## File-by-File Changes

### `src/lib/types.ts`

#### **Changes Made:**
- Enhanced `ProcessedResult` interface to support analytics

#### **Before:**
```typescript
export interface ProcessedResult {
  summary: string;
  tagFrequencies: Record<string, number>;
}
```

#### **After:**
```typescript
export interface ProcessedResult {
  summary: string;
  tagFrequencies: Record<string, number>;
  languageDistribution: Record<string, number>;    // NEW
  categoryDistribution: Record<string, number>;    // NEW
  avgEmotionScore: string | number;                // NEW
  entriesWithEmotionScore: number;                 // NEW
}
```

#### **Rationale:**
- **Language Distribution:** Track usage patterns across different languages
- **Category Distribution:** Analyze content categories for insights
- **Emotion Scores:** Provide mood analytics and mental health insights
- **Metadata:** Count of entries with emotion data for data quality assessment

### `src/lib/sampleFunction.ts`

#### **Changes Made:**
- Updated return statement to include all calculated insights 

#### **Key Enhancement:**
```typescript
return {
  summary,
  tagFrequencies,
  languageDistribution,     // NEW: Language usage patterns
  categoryDistribution,     // NEW: Content categorization
  avgEmotionScore,         // NEW: Average mood/emotion
  entriesWithEmotionScore, // NEW: Data quality metric
}
```

#### **Features Now Supported:**
- **Tag Frequency Analysis:** Count user-defined tags
- **Language Distribution:** Track `language_rendered` field
- **Category Analysis:** Analyze content categories (handles null values)
- **Emotion Analytics:** Calculate average emotion scores
- **Rich Summary:** Multi-line insights with top language, category, and emotion stats


### `tests/sampleFunction.test.ts`

#### **Changes Made:**
- **Added 21 comprehensive test cases** covering various scenarios
- **Organized into logical groups** for better maintainability

#### **Test Coverage Breakdown:**

| Test Group | Test Cases | Coverage Focus |
|------------|------------|----------------|
| **Basic Functionality** | 3 | Empty inputs, single entries, return structure |
| **Tag Processing** | 6 | Single/multiple tags, duplicates, special characters |
| **Language Distribution** | 2 | Single/multiple languages, summary generation |
| **Category Distribution** | 3 | Valid categories, null handling, mixed scenarios |
| **Emotion Score Processing** | 4 | Average calculation, null handling, zero scores |
| **Comprehensive Integration** | 3 | Complex mixed data, performance, mock data compatibility |

> **Achieved > 100% coverage** for `sampleFunction.ts`

### `src/lib/taskExtractor.ts`

#### **Stand Out Functions Added:**

- **Enhanced Date Extraction:**
Added support for more natural language patterns:

- **Smart Deduplication:**
Added intelligent task deduplication to prevent overlapping extractions:

### `tests/taskExtractor.test.ts`

#### **Changes Made:**

* **Added 16 task-focused test cases** covering diverse task extraction scenarios
* **Tested NLP heuristics**, date extraction, category classification, and error edge cases
* **Validated structure of output**, including fields like `priority`, `context`, and `due_date`

#### **Test Coverage Breakdown:**

| Test Group                    | Test Cases | Coverage Focus                                                  |
| ----------------------------- | ---------- | --------------------------------------------------------------- |
| **Basic Extraction**          | 3          | Single/multiple task parsing, structured field output           |
| **Date Handling**             | 3          | Keywords like *tomorrow*, *today*, weekdays, and implicit dates |
| **Priority Classification**   | 2          | Heuristic-based detection of *urgent*, *sometime*, etc.         |
| **Category Inference**        | 2          | From tags, task verbs, and fallback to `'other'`                |
| **Edge Cases**                | 4          | No tasks, malformed/incomplete inputs, overlapping phrases      |
| **Advanced Context Handling** | 2          | Field preservation: `context`, `source_entry_id`, `created_at`  |

> **Achieved > 92.08% coverage** for `taskExtractor.ts`


### Data Flow
```
Voice Entry → Task Extractor → Structured Tasks → Integration Systems
     ↓              ↓                ↓               ↓
- transcript   - verb detection   - task_text    - reminders
- metadata     - date parsing     - due_date     - summaries  
- timing       - categorization   - category     - priorities
- context      - priority calc    - priority     - analytics
```

### Linting and Test Validation
![linting](https://github.com/user-attachments/assets/edf889e7-f8c3-4f11-bde6-80be249b80ec)

![tests](https://github.com/user-attachments/assets/479fdb78-3d55-427d-88aa-13faef103d17)

### Future Plan
- **NLP Integration**: Advanced natural language processing for better task detection
- **Machine Learning**: Pattern recognition for task classification
- **Multi-language Support**: Task extraction in multiple languages
- **Custom Categories**: User-defined task categories
- **Calendar Integration**: Direct sync with calendar applications
- **Notification System**: Automated reminders for due tasks
- **Progress Tracking**: Task completion and status updates
- **Analytics Dashboard**: Task completion metrics and insights
