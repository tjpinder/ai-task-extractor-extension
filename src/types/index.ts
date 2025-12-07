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
