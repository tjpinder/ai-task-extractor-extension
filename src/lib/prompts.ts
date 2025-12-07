import type { ExtractionMode, ExtractionRule } from '../types';

const BASE_JSON_FORMAT = `{
  "tasks": [
    {
      "title": "Clear actionable task title",
      "description": "Optional additional details",
      "priority": "high|medium|low",
      "category": "action|follow-up|decision|deadline|question|idea|other",
      "assignee": "Person name or null",
      "dueDate": "YYYY-MM-DD or null",
      "context": "Brief context of where this was found",
      "confidence": 0.85,
      "subTasks": [
        {"title": "Sub-task 1"},
        {"title": "Sub-task 2"}
      ],
      "recurring": {
        "frequency": "daily|weekly|biweekly|monthly|quarterly|yearly",
        "description": "Every Monday at 9am"
      },
      "timeEstimate": "15min|30min|1h|2h|4h|1d|2d|1w"
    }
  ]
}`;

const CONFIDENCE_GUIDELINES = `Confidence guidelines:
- 0.9-1.0: Explicit action item with clear ownership or deadline
- 0.7-0.89: Strong implication of task, mentioned directly
- 0.5-0.69: Implicit task, inferred from context
- 0.3-0.49: Possible task, somewhat ambiguous
- Below 0.3: Weak signal, might not be a real task`;

const TIME_ESTIMATE_GUIDELINES = `Time estimation guidelines:
- 15min: Quick task, simple response or check
- 30min: Short task, single-step action
- 1h: Medium task, requires some focus
- 2h: Substantial task, multiple steps
- 4h: Half-day effort, complex work
- 1d: Full day of work
- 2d: Two days of work
- 1w: Week-long project`;

function buildGeneralPrompt(content: string, title: string): string {
  return `You are an expert at identifying actionable tasks from text content. Analyze the following content and extract all actionable tasks, to-dos, action items, follow-ups, decisions needed, and deadlines.

Page Title: "${title}"

Content:
"""
${content.slice(0, 15000)}
"""

For each task you identify, determine:
1. A clear, actionable title (start with a verb when possible)
2. Any additional context or description
3. Priority level (high, medium, or low)
4. Category: action (something to do), follow-up (needs follow-up with someone), decision (decision needed), deadline (has a specific date), question (open question to answer), idea (suggestion or idea), other
5. Assignee if mentioned (person's name or role)
6. Due date if mentioned (in YYYY-MM-DD format)
7. Context (the surrounding context where this task was found)
8. Confidence (0.0 to 1.0) - how confident you are this is a real actionable task
9. Sub-tasks - if a task has clear sub-items or steps, include them
10. Recurring pattern - if the task mentions recurring ("every week", "daily", "monthly")
11. Time estimate - estimate how long the task might take based on complexity

Look for:
- Explicit action items (e.g., "need to", "should", "will", "must", "action item:")
- Deadlines and dates
- Follow-up mentions
- Questions that need answers
- Decisions that need to be made
- Assignments to specific people
- Recurring patterns ("every Monday", "weekly", "each month")
- Nested items or numbered lists that could be sub-tasks

${CONFIDENCE_GUIDELINES}

${TIME_ESTIMATE_GUIDELINES}

Respond in this exact JSON format:
${BASE_JSON_FORMAT}

Notes:
- subTasks, recurring, and timeEstimate are optional - only include if detected
- If no tasks are found, return: {"tasks": []}
- Return only valid JSON, no other text.`;
}

function buildEmailPrompt(content: string, title: string): string {
  return `You are an expert at extracting actionable tasks from emails. Analyze this email content and identify all action items, requests, follow-ups, and commitments.

Email Subject: "${title}"

Email Content:
"""
${content.slice(0, 15000)}
"""

EMAIL-SPECIFIC EXTRACTION RULES:
1. Identify the email SENDER as a potential assignee for responses
2. Look for requests directed at the reader ("Could you...", "Please...", "Can you...")
3. Detect commitments made by the sender ("I will...", "I'll send you...")
4. Find deadlines mentioned with dates or relative timing ("by Friday", "next week", "ASAP")
5. Identify questions that need answers
6. Look for CC'd people who might need follow-up
7. Detect meeting requests or scheduling needs
8. Find forwarded items that need action

For each task, determine:
1. A clear, actionable title (start with a verb)
2. Description with relevant email context
3. Priority: high (urgent/ASAP/today), medium (this week), low (when possible)
4. Category: action, follow-up, decision, deadline, question, idea, other
5. Assignee (sender for their commitments, "me" for requests to reader)
6. Due date in YYYY-MM-DD format
7. Context from the email
8. Confidence score (0-1)
9. Sub-tasks if the email lists multiple items
10. Recurring pattern if applicable ("weekly status update")
11. Time estimate based on complexity
12. Sender's name if identifiable

${CONFIDENCE_GUIDELINES}

${TIME_ESTIMATE_GUIDELINES}

Respond in this JSON format:
{
  "tasks": [
    {
      "title": "Clear actionable task",
      "description": "Email context",
      "priority": "high|medium|low",
      "category": "action|follow-up|decision|deadline|question|idea|other",
      "assignee": "Person name or null",
      "dueDate": "YYYY-MM-DD or null",
      "context": "From email about...",
      "confidence": 0.85,
      "subTasks": [{"title": "Sub-task"}],
      "recurring": {"frequency": "weekly", "description": "Every Monday"},
      "timeEstimate": "30min",
      "sender": "John Smith"
    }
  ]
}

If no tasks found, return: {"tasks": []}
Return only valid JSON.`;
}

function buildMeetingPrompt(content: string, title: string): string {
  return `You are an expert at extracting action items from meeting notes. Analyze these meeting notes and identify all action items, decisions made, follow-ups needed, and open questions.

Meeting Title: "${title}"

Meeting Notes:
"""
${content.slice(0, 15000)}
"""

MEETING-SPECIFIC EXTRACTION RULES:
1. Look for explicit "Action Item:" or "AI:" markers
2. Identify "Decision:" markers and log the decision
3. Find "Follow-up:" items that need future action
4. Extract items assigned to specific attendees
5. Detect "Next steps" or "To-do" sections
6. Identify agenda items that weren't completed
7. Find questions marked as "Open question" or "TBD"
8. Look for recurring meeting actions ("update in next week's meeting")
9. Detect deadlines mentioned ("complete by end of sprint")
10. Identify blockers that need resolution

For each task, determine:
1. A clear, actionable title (start with a verb)
2. Description with meeting context
3. Priority based on discussion emphasis
4. Category: action, follow-up, decision, deadline, question, idea, other
5. Assignee (meeting attendee responsible)
6. Due date in YYYY-MM-DD format
7. Context from discussion
8. Confidence score (0-1)
9. Sub-tasks for multi-step items
10. Recurring pattern ("review in weekly standup")
11. Time estimate based on scope discussed
12. Attendees mentioned (list of names)

${CONFIDENCE_GUIDELINES}

${TIME_ESTIMATE_GUIDELINES}

Respond in this JSON format:
{
  "tasks": [
    {
      "title": "Clear actionable task",
      "description": "Meeting context",
      "priority": "high|medium|low",
      "category": "action|follow-up|decision|deadline|question|idea|other",
      "assignee": "Person name or null",
      "dueDate": "YYYY-MM-DD or null",
      "context": "Discussed in meeting...",
      "confidence": 0.85,
      "subTasks": [{"title": "Sub-task"}],
      "recurring": {"frequency": "weekly", "description": "Review in standup"},
      "timeEstimate": "2h",
      "attendees": ["John", "Sarah", "Mike"]
    }
  ]
}

If no tasks found, return: {"tasks": []}
Return only valid JSON.`;
}

function buildCustomRulesSection(rules: ExtractionRule[]): string {
  const enabledRules = rules.filter((r) => r.enabled);
  if (enabledRules.length === 0) return '';

  let section = '\n\nCUSTOM EXTRACTION RULES (apply these strictly):\n';

  const keywordRules = enabledRules.filter((r) => r.type === 'keyword');
  const ignoreRules = enabledRules.filter((r) => r.type === 'ignore');

  if (keywordRules.length > 0) {
    section += '\nPriority Keywords:\n';
    for (const rule of keywordRules) {
      const keywords = rule.value.split(',').map((k) => k.trim()).join(', ');
      const actions: string[] = [];
      if (rule.action.priority) actions.push(`mark as ${rule.action.priority} priority`);
      if (rule.action.category) actions.push(`categorize as ${rule.action.category}`);
      section += `- If content contains [${keywords}]: ${actions.join(' and ')}\n`;
    }
  }

  if (ignoreRules.length > 0) {
    section += '\nIgnore Patterns (do NOT extract as tasks):\n';
    for (const rule of ignoreRules) {
      const keywords = rule.value.split(',').map((k) => k.trim()).join(', ');
      section += `- Skip items containing: ${keywords}\n`;
    }
  }

  return section;
}

export function buildExtractionPrompt(
  content: string,
  title: string,
  mode: ExtractionMode = 'general',
  customRules: ExtractionRule[] = []
): string {
  let basePrompt: string;
  switch (mode) {
    case 'email':
      basePrompt = buildEmailPrompt(content, title);
      break;
    case 'meeting':
      basePrompt = buildMeetingPrompt(content, title);
      break;
    default:
      basePrompt = buildGeneralPrompt(content, title);
  }

  // Insert custom rules before the JSON format section
  if (customRules.length > 0) {
    const rulesSection = buildCustomRulesSection(customRules);
    // Insert before "Respond in this" or "Return only"
    const insertPoint = basePrompt.lastIndexOf('Respond in');
    if (insertPoint > 0) {
      basePrompt = basePrompt.slice(0, insertPoint) + rulesSection + '\n\n' + basePrompt.slice(insertPoint);
    }
  }

  return basePrompt;
}

export function getExtractionTips(mode: ExtractionMode = 'general'): string[] {
  const baseTips = [
    'You can edit tasks before exporting them',
    'Pro users get advanced modes and more integrations',
  ];

  switch (mode) {
    case 'email':
      return [
        'Email mode detects sender and recipient action items',
        'Works best on Gmail and Outlook web',
        'Identifies requests, commitments, and follow-ups',
        ...baseTips,
      ];
    case 'meeting':
      return [
        'Meeting mode finds action items and decisions',
        'Works on Google Docs, Notion, and meeting summaries',
        'Identifies assignees from attendee mentions',
        ...baseTips,
      ];
    default:
      return [
        'Works best on meeting notes, emails, articles, and documents',
        'The AI looks for action verbs and assignment patterns',
        'Deadlines are automatically detected when dates are mentioned',
        ...baseTips,
      ];
  }
}
