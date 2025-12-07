# AI Task Extractor - Extract Actionable Tasks from Any Page

Chrome extension that uses AI to automatically extract actionable tasks, deadlines, and follow-ups from any webpage content.

## Features

### Free Tier
- **5 extractions per day** - Perfect for trying out the extension
- **Full page extraction** - Analyze entire page content
- **Selected text extraction** - Extract from highlighted text only
- **7 task categories** - Action, Follow-up, Decision, Deadline, Question, Idea, Other
- **3 priority levels** - High, Medium, Low with color coding
- **Smart detection** - Identifies assignees and due dates
- **Export to clipboard** - Copy tasks as plain text
- **Export as Markdown** - Formatted with priority grouping
- **7-day history** - Access recent extractions
- **Dark mode** - Easy on the eyes
- **Inline editing** - Edit tasks before exporting
- **Undo support** - Restore previous state
- **Bulk selection** - Select by priority or category

### Pro Tier ($19 one-time)
- **Unlimited extractions** - No daily limits
- **Unlimited history** - Access all past extractions
- **Export to Notion** - Sync tasks to your Notion database
- **Export to Todoist** - Add tasks directly to Todoist
- **Export to ClickUp** - Push tasks to ClickUp lists
- **Priority support** - Faster response times

## How It Works

1. **Navigate** to any page with content (meeting notes, articles, emails, docs)
2. **Click** the extension icon or right-click to extract
3. **Review** the AI-detected tasks with priorities and categories
4. **Edit** tasks inline if needed (click to edit title/description)
5. **Export** to your favorite task manager

## Use Cases

- **Meeting notes** - Extract action items and follow-ups
- **Email threads** - Pull out tasks from long email chains
- **Articles** - Create reading/action lists from blog posts
- **Documentation** - Identify to-dos from technical docs
- **Project specs** - Extract deliverables and deadlines

## Setup

### Prerequisites

- Node.js 18+
- npm
- Chrome browser
- API key from [OpenAI](https://platform.openai.com/api-keys) or [Anthropic](https://console.anthropic.com/settings/keys)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Load in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `dist` folder from this project

### Configure

1. Click the extension icon
2. Click the settings gear
3. Enter your API key (OpenAI or Anthropic)
4. Configure default export format

## Usage

### Extract from Full Page
1. Navigate to any webpage
2. Click the extension icon
3. Click "Extract Tasks"
4. Review and export tasks

### Extract from Selection
1. Highlight text on any page
2. Right-click and choose "Extract Tasks from Selection"
3. Review extracted tasks
4. Export to your preferred destination

### Edit Tasks
- Click on any task title to edit inline
- Press Enter to save, Escape to cancel
- Use priority dropdown to change priority
- Click X to delete a task

### Bulk Selection
- Click "Select all" / "Deselect all"
- Use quick select buttons: High, Medium, Low, Actions, Follow-ups

### Undo Changes
- Click the undo button (arrow icon) to restore previous state
- Works for edits, deletions, and re-extractions

## Task Categories

| Category | Icon | Description |
|----------|------|-------------|
| Action | ✓ | Something to do |
| Follow-up | ↩ | Needs follow-up with someone |
| Decision | ? | Decision needed |
| Deadline | ⏰ | Has a specific date |
| Question | ❓ | Open question to answer |
| Idea | 💡 | Suggestion or idea |
| Other | • | General task |

## Project Structure

```
src/
├── popup/           # Extension popup UI
│   └── Popup.tsx    # Main popup component with all features
├── options/         # Settings page
│   └── Options.tsx  # Configuration UI
├── content/         # Content scripts
│   └── content-script.ts  # Page content extraction
├── background/      # Service worker
│   └── service-worker.ts  # Context menus & messaging
├── lib/             # Shared utilities
│   ├── ai.ts        # AI provider integrations
│   ├── storage.ts   # Chrome storage wrapper
│   ├── export.ts    # Export formatters
│   └── prompts.ts   # AI prompts
└── types/           # TypeScript types
    └── index.ts
```

## Privacy & Security

- **API keys stored locally** - Never sent to our servers
- **BYOK model** - You control your AI costs
- **No content storage** - Task content stays in your browser
- **Direct API calls** - Your content goes straight to OpenAI/Anthropic
- **Minimal permissions** - Only activeTab, storage, contextMenus

## Keyboard Shortcuts

- **Alt+T** - Open extension popup
- **Enter** - Save inline edit
- **Escape** - Cancel inline edit

## Development

### Hot Reload
The dev server supports hot reload for popup and options pages.

### Debugging
- **Popup**: Right-click extension icon > "Inspect popup"
- **Background**: chrome://extensions > "Inspect views: service worker"
- **Content Script**: Open DevTools on any page, check console

## Support

- Email: support@startvest.ai
- Website: https://startvest.ai/tools/ai-task-extractor

## License

MIT - Startvest LLC
