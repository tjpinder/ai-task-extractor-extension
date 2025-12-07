// Task priority levels
export type TaskPriority = 'high' | 'medium' | 'low';

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
};

// Task category
export type TaskCategory =
  | 'action'
  | 'follow-up'
  | 'decision'
  | 'deadline'
  | 'question'
  | 'idea'
  | 'other';

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  action: 'Action Item',
  'follow-up': 'Follow-up',
  decision: 'Decision Needed',
  deadline: 'Deadline',
  question: 'Open Question',
  idea: 'Idea/Suggestion',
  other: 'Other',
};

export const CATEGORY_ICONS: Record<TaskCategory, string> = {
  action: '✓',
  'follow-up': '↩',
  decision: '?',
  deadline: '⏰',
  question: '❓',
  idea: '💡',
  other: '•',
};

// AI Provider
export type AIProvider = 'openai' | 'anthropic';

// Extraction mode
export type ExtractionMode = 'general' | 'email' | 'meeting';

export const EXTRACTION_MODE_LABELS: Record<ExtractionMode, string> = {
  general: 'General',
  email: 'Email',
  meeting: 'Meeting Notes',
};

export const EXTRACTION_MODE_DESCRIPTIONS: Record<ExtractionMode, string> = {
  general: 'Works on any web page content',
  email: 'Optimized for Gmail, Outlook, and email threads',
  meeting: 'Smart detection for agendas, action items, and decisions',
};

// Recurring pattern
export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringPattern {
  frequency: RecurringFrequency;
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  description: string; // e.g., "Every Monday", "First of each month"
}

export const RECURRING_LABELS: Record<RecurringFrequency, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
};

// Time estimate
export type TimeEstimate = '15min' | '30min' | '1h' | '2h' | '4h' | '1d' | '2d' | '1w';

export const TIME_ESTIMATE_LABELS: Record<TimeEstimate, string> = {
  '15min': '15 minutes',
  '30min': '30 minutes',
  '1h': '1 hour',
  '2h': '2 hours',
  '4h': 'Half day',
  '1d': '1 day',
  '2d': '2 days',
  '1w': '1 week',
};

// Sub-task
export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

// Export destination
export type ExportDestination = 'clipboard' | 'notion' | 'todoist' | 'clickup' | 'markdown' | 'csv' | 'json' | 'asana' | 'linear';

export const EXPORT_LABELS: Record<ExportDestination, string> = {
  clipboard: 'Copy to Clipboard',
  notion: 'Export to Notion',
  todoist: 'Export to Todoist',
  clickup: 'Export to ClickUp',
  markdown: 'Copy as Markdown',
  csv: 'Download CSV',
  json: 'Download JSON',
  asana: 'Export to Asana',
  linear: 'Export to Linear',
};

// Extracted task
export interface ExtractedTask {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  category: TaskCategory;
  assignee?: string;
  dueDate?: string;
  context?: string;
  selected: boolean;
  confidence?: number; // 0-1 confidence score from AI
  subTasks?: SubTask[]; // Nested sub-tasks
  recurring?: RecurringPattern; // Recurring pattern if detected
  timeEstimate?: TimeEstimate; // Estimated effort
  sender?: string; // Email sender (for email mode)
  attendees?: string[]; // Meeting attendees (for meeting mode)
}

// Extraction result
export interface ExtractionResult {
  id: string;
  sourceUrl: string;
  sourceTitle: string;
  tasks: ExtractedTask[];
  extractedAt: number;
}

// History entry
export interface HistoryEntry {
  id: string;
  sourceUrl: string;
  sourceTitle: string;
  taskCount: number;
  extractedAt: number;
}

// Theme preference
export type ThemePreference = 'light' | 'dark' | 'system';

// Settings
export interface Settings {
  aiProvider: AIProvider;
  openaiApiKey: string;
  anthropicApiKey: string;
  defaultExport: ExportDestination;
  defaultExtractionMode: ExtractionMode;
  notionApiKey: string;
  notionDatabaseId: string;
  todoistApiKey: string;
  todoistProjectId: string;
  clickupApiKey: string;
  clickupListId: string;
  asanaApiKey: string;
  asanaProjectId: string;
  linearApiKey: string;
  linearTeamId: string;
  licenseKey: string;
  isPro: boolean;
  theme: ThemePreference;
  autoSelectAll: boolean;
  showConfidence: boolean;
  showTimeEstimates: boolean;
  showRecurring: boolean;
}

// Tier limits
export interface TierLimits {
  extractionsPerDay: number;
  historyDays: number;
  exportIntegrations: boolean;
}

export const FREE_TIER_LIMITS: TierLimits = {
  extractionsPerDay: 5,
  historyDays: 7,
  exportIntegrations: false,
};

export const PRO_TIER_LIMITS: TierLimits = {
  extractionsPerDay: -1, // unlimited
  historyDays: -1, // unlimited
  exportIntegrations: true,
};

// Usage tracking
export interface UsageData {
  date: string;
  extractionsCount: number;
}

// Message types for communication
export interface ExtractTasksMessage {
  type: 'EXTRACT_TASKS';
}

export interface GetPageContentMessage {
  type: 'GET_PAGE_CONTENT';
}

export interface PageContentResponse {
  title: string;
  url: string;
  content: string;
}

export type ExtensionMessage =
  | ExtractTasksMessage
  | GetPageContentMessage;
