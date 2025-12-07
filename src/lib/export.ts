import type { ExtractedTask, Settings } from '../types';
import { PRIORITY_LABELS, CATEGORY_LABELS, CATEGORY_ICONS } from '../types';

// Format tasks as plain text
export function formatAsPlainText(tasks: ExtractedTask[]): string {
  return tasks
    .filter((t) => t.selected)
    .map((task) => {
      let line = `${CATEGORY_ICONS[task.category]} ${task.title}`;
      if (task.assignee) line += ` (@${task.assignee})`;
      if (task.dueDate) line += ` [Due: ${task.dueDate}]`;
      if (task.priority === 'high') line += ' ⚡';
      return line;
    })
    .join('\n');
}

// Format tasks as markdown
export function formatAsMarkdown(tasks: ExtractedTask[], sourceTitle: string): string {
  const selectedTasks = tasks.filter((t) => t.selected);

  let md = `# Tasks from "${sourceTitle}"\n\n`;
  md += `_Extracted ${selectedTasks.length} task(s)_\n\n`;

  // Group by priority
  const highPriority = selectedTasks.filter((t) => t.priority === 'high');
  const mediumPriority = selectedTasks.filter((t) => t.priority === 'medium');
  const lowPriority = selectedTasks.filter((t) => t.priority === 'low');

  if (highPriority.length > 0) {
    md += `## 🔴 High Priority\n\n`;
    highPriority.forEach((task) => {
      md += formatTaskAsMarkdown(task);
    });
    md += '\n';
  }

  if (mediumPriority.length > 0) {
    md += `## 🟡 Medium Priority\n\n`;
    mediumPriority.forEach((task) => {
      md += formatTaskAsMarkdown(task);
    });
    md += '\n';
  }

  if (lowPriority.length > 0) {
    md += `## 🟢 Low Priority\n\n`;
    lowPriority.forEach((task) => {
      md += formatTaskAsMarkdown(task);
    });
  }

  return md;
}

function formatTaskAsMarkdown(task: ExtractedTask): string {
  let md = `- [ ] **${task.title}**`;

  const meta: string[] = [];
  if (task.assignee) meta.push(`👤 ${task.assignee}`);
  if (task.dueDate) meta.push(`📅 ${task.dueDate}`);
  if (meta.length > 0) {
    md += ` (${meta.join(' | ')})`;
  }

  md += '\n';

  if (task.description) {
    md += `  - ${task.description}\n`;
  }

  return md;
}

// Export to Notion
export async function exportToNotion(
  tasks: ExtractedTask[],
  settings: Settings,
  sourceTitle: string
): Promise<void> {
  if (!settings.notionApiKey || !settings.notionDatabaseId) {
    throw new Error('Please configure Notion API key and Database ID in settings');
  }

  const selectedTasks = tasks.filter((t) => t.selected);

  for (const task of selectedTasks) {
    const properties: Record<string, unknown> = {
      Name: {
        title: [{ text: { content: task.title } }],
      },
      Priority: {
        select: { name: PRIORITY_LABELS[task.priority] },
      },
      Category: {
        select: { name: CATEGORY_LABELS[task.category] },
      },
      Source: {
        rich_text: [{ text: { content: sourceTitle } }],
      },
    };

    if (task.assignee) {
      properties['Assignee'] = {
        rich_text: [{ text: { content: task.assignee } }],
      };
    }

    if (task.dueDate) {
      properties['Due Date'] = {
        date: { start: task.dueDate },
      };
    }

    if (task.description) {
      properties['Description'] = {
        rich_text: [{ text: { content: task.description } }],
      };
    }

    await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.notionApiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: settings.notionDatabaseId },
        properties,
      }),
    });
  }
}

// Export to Todoist
export async function exportToTodoist(
  tasks: ExtractedTask[],
  settings: Settings
): Promise<void> {
  if (!settings.todoistApiKey) {
    throw new Error('Please configure Todoist API key in settings');
  }

  const selectedTasks = tasks.filter((t) => t.selected);
  const priorityMap: Record<string, number> = {
    high: 4,
    medium: 3,
    low: 2,
  };

  for (const task of selectedTasks) {
    const body: Record<string, unknown> = {
      content: task.title,
      priority: priorityMap[task.priority],
    };

    if (settings.todoistProjectId) {
      body.project_id = settings.todoistProjectId;
    }

    if (task.dueDate) {
      body.due_date = task.dueDate;
    }

    if (task.description) {
      body.description = task.description;
    }

    await fetch('https://api.todoist.com/rest/v2/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.todoistApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }
}

// Export to ClickUp
export async function exportToClickUp(
  tasks: ExtractedTask[],
  settings: Settings
): Promise<void> {
  if (!settings.clickupApiKey || !settings.clickupListId) {
    throw new Error('Please configure ClickUp API key and List ID in settings');
  }

  const selectedTasks = tasks.filter((t) => t.selected);
  const priorityMap: Record<string, number> = {
    high: 1,
    medium: 2,
    low: 3,
  };

  for (const task of selectedTasks) {
    const body: Record<string, unknown> = {
      name: task.title,
      priority: priorityMap[task.priority],
    };

    if (task.description) {
      body.description = task.description;
    }

    if (task.dueDate) {
      body.due_date = new Date(task.dueDate).getTime();
    }

    await fetch(`https://api.clickup.com/api/v2/list/${settings.clickupListId}/task`, {
      method: 'POST',
      headers: {
        'Authorization': settings.clickupApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

// Format tasks as CSV
export function formatAsCSV(tasks: ExtractedTask[], sourceTitle: string): string {
  const selectedTasks = tasks.filter((t) => t.selected);

  // CSV header
  const headers = ['Title', 'Description', 'Priority', 'Category', 'Assignee', 'Due Date', 'Confidence', 'Source'];

  // Escape CSV field
  const escapeCSV = (field: string | undefined): string => {
    if (!field) return '';
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const rows = selectedTasks.map((task) => [
    escapeCSV(task.title),
    escapeCSV(task.description),
    task.priority,
    CATEGORY_LABELS[task.category],
    escapeCSV(task.assignee),
    task.dueDate || '',
    task.confidence ? `${Math.round(task.confidence * 100)}%` : '',
    escapeCSV(sourceTitle),
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

// Format tasks as JSON
export function formatAsJSON(tasks: ExtractedTask[], sourceTitle: string): string {
  const selectedTasks = tasks.filter((t) => t.selected);

  const exportData = {
    source: sourceTitle,
    exportedAt: new Date().toISOString(),
    taskCount: selectedTasks.length,
    tasks: selectedTasks.map((task) => ({
      title: task.title,
      description: task.description || null,
      priority: task.priority,
      category: task.category,
      categoryLabel: CATEGORY_LABELS[task.category],
      assignee: task.assignee || null,
      dueDate: task.dueDate || null,
      confidence: task.confidence || null,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

// Download file helper
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export to Asana
export async function exportToAsana(
  tasks: ExtractedTask[],
  settings: Settings
): Promise<void> {
  if (!settings.asanaApiKey || !settings.asanaProjectId) {
    throw new Error('Please configure Asana API key and Project ID in settings');
  }

  const selectedTasks = tasks.filter((t) => t.selected);

  for (const task of selectedTasks) {
    const body: Record<string, unknown> = {
      data: {
        name: task.title,
        projects: [settings.asanaProjectId],
        notes: task.description || '',
      },
    };

    if (task.dueDate) {
      (body.data as Record<string, unknown>).due_on = task.dueDate;
    }

    const response = await fetch('https://app.asana.com/api/1.0/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.asanaApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Asana API error: ${error}`);
    }
  }
}

// Export to Linear
export async function exportToLinear(
  tasks: ExtractedTask[],
  settings: Settings
): Promise<void> {
  if (!settings.linearApiKey || !settings.linearTeamId) {
    throw new Error('Please configure Linear API key and Team ID in settings');
  }

  const selectedTasks = tasks.filter((t) => t.selected);

  // Linear priority mapping (0 = no priority, 1 = urgent, 2 = high, 3 = normal, 4 = low)
  const priorityMap: Record<string, number> = {
    high: 2,
    medium: 3,
    low: 4,
  };

  for (const task of selectedTasks) {
    const mutation = `
      mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            title
          }
        }
      }
    `;

    const variables = {
      input: {
        teamId: settings.linearTeamId,
        title: task.title,
        description: task.description || '',
        priority: priorityMap[task.priority],
        ...(task.dueDate && { dueDate: task.dueDate }),
      },
    };

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': settings.linearApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Linear API error: ${error}`);
    }

    const result = await response.json();
    if (result.errors) {
      throw new Error(`Linear API error: ${result.errors[0].message}`);
    }
  }
}
