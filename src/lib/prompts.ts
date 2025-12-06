export function buildExtractionPrompt(content: string, title: string): string {
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

Look for:
- Explicit action items (e.g., "need to", "should", "will", "must", "action item:")
- Deadlines and dates
- Follow-up mentions
- Questions that need answers
- Decisions that need to be made
- Assignments to specific people

Respond in this exact JSON format:
{
  "tasks": [
    {
      "title": "Clear actionable task title",
      "description": "Optional additional details",
      "priority": "high|medium|low",
      "category": "action|follow-up|decision|deadline|question|idea|other",
      "assignee": "Person name or null",
      "dueDate": "YYYY-MM-DD or null",
      "context": "Brief context of where this was found"
    }
  ]
}

If no tasks are found, return: {"tasks": []}

Return only valid JSON, no other text.`;
}

export function getExtractionTips(): string[] {
  return [
    'Works best on meeting notes, emails, articles, and documents',
    'The AI looks for action verbs and assignment patterns',
    'Deadlines are automatically detected when dates are mentioned',
    'You can edit tasks before exporting them',
    'Pro users can export directly to Notion, Todoist, and ClickUp',
  ];
}
