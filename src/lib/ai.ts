import type { AIProvider, ExtractedTask, ExtractionMode, Settings, SubTask, RecurringPattern, TimeEstimate, ExtractionRule } from '../types';
import { buildExtractionPrompt } from './prompts';
import { generateId } from './storage';

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface AnthropicResponse {
  content: Array<{
    text: string;
  }>;
}

async function callOpenAI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data: OpenAIResponse = await response.json();
  return data.choices[0].message.content;
}

async function callAnthropic(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-latest',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }

  const data: AnthropicResponse = await response.json();
  return data.content[0].text;
}

async function callAI(
  provider: AIProvider,
  apiKey: string,
  prompt: string
): Promise<string> {
  if (provider === 'openai') {
    return callOpenAI(apiKey, prompt);
  } else {
    return callAnthropic(apiKey, prompt);
  }
}

function extractJSON(text: string): string {
  // Try to extract JSON from markdown code blocks
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }

  // Try to find JSON object directly
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return objectMatch[0];
  }

  return text.trim();
}

// Valid time estimate values
const VALID_TIME_ESTIMATES: TimeEstimate[] = ['15min', '30min', '1h', '2h', '4h', '1d', '2d', '1w'];

// Valid recurring frequencies
const VALID_FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];

export async function extractTasks(
  content: string,
  title: string,
  settings: Settings,
  mode: ExtractionMode = 'general',
  customRules?: ExtractionRule[]
): Promise<ExtractedTask[]> {
  const apiKey = settings.aiProvider === 'openai'
    ? settings.openaiApiKey
    : settings.anthropicApiKey;

  if (!apiKey) {
    throw new Error(`Please configure your ${settings.aiProvider === 'openai' ? 'OpenAI' : 'Anthropic'} API key in settings`);
  }

  // Use custom rules if provided, otherwise use settings rules
  const rules = customRules || settings.extractionRules || [];
  const prompt = buildExtractionPrompt(content, title, mode, rules);
  const response = await callAI(settings.aiProvider, apiKey, prompt);

  try {
    const jsonStr = extractJSON(response);
    const parsed = JSON.parse(jsonStr) as { tasks: Array<{
      title: string;
      description?: string;
      priority: 'high' | 'medium' | 'low';
      category: string;
      assignee?: string;
      dueDate?: string;
      context?: string;
      confidence?: number;
      subTasks?: Array<{ title: string }>;
      recurring?: { frequency: string; description?: string; dayOfWeek?: number; dayOfMonth?: number };
      timeEstimate?: string;
      sender?: string;
      attendees?: string[];
    }> };

    return parsed.tasks.map((task) => {
      // Parse sub-tasks
      let subTasks: SubTask[] | undefined;
      if (task.subTasks && Array.isArray(task.subTasks) && task.subTasks.length > 0) {
        subTasks = task.subTasks.map((st) => ({
          id: generateId(),
          title: st.title,
          completed: false,
        }));
      }

      // Parse recurring pattern
      let recurring: RecurringPattern | undefined;
      if (task.recurring && task.recurring.frequency && VALID_FREQUENCIES.includes(task.recurring.frequency)) {
        recurring = {
          frequency: task.recurring.frequency as RecurringPattern['frequency'],
          description: task.recurring.description || `Repeats ${task.recurring.frequency}`,
          dayOfWeek: task.recurring.dayOfWeek,
          dayOfMonth: task.recurring.dayOfMonth,
        };
      }

      // Parse time estimate
      let timeEstimate: TimeEstimate | undefined;
      if (task.timeEstimate && VALID_TIME_ESTIMATES.includes(task.timeEstimate as TimeEstimate)) {
        timeEstimate = task.timeEstimate as TimeEstimate;
      }

      return {
        id: generateId(),
        title: task.title,
        description: task.description,
        priority: task.priority || 'medium',
        category: (task.category as ExtractedTask['category']) || 'action',
        assignee: task.assignee || undefined,
        dueDate: task.dueDate || undefined,
        context: task.context,
        confidence: typeof task.confidence === 'number' ? task.confidence : 0.7,
        selected: true,
        subTasks,
        recurring,
        timeEstimate,
        sender: task.sender || undefined,
        attendees: task.attendees && task.attendees.length > 0 ? task.attendees : undefined,
      };
    });
  } catch {
    throw new Error('Failed to parse AI response. Please try again.');
  }
}
