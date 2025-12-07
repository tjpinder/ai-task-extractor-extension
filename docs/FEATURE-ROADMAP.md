# AI Task Extractor - Feature Roadmap

> **Version:** 1.0.0 (Current)
> **Last Updated:** 2025-12-06
> **Pricing:** Free (5/day) | Pro ($19 one-time)

---

## Current Features (v1.0)

### Free Tier
- [x] AI extraction (OpenAI/Anthropic - BYOK)
- [x] 7 task categories (action, follow-up, decision, deadline, question, idea, other)
- [x] 3 priority levels (high, medium, low)
- [x] Assignee detection
- [x] Due date detection
- [x] Export to clipboard
- [x] Export as Markdown
- [x] Context menu integration
- [x] 5 extractions per day
- [x] 7-day history
- [x] Basic keyboard shortcut

### Pro Tier (Existing)
- [x] Unlimited extractions
- [x] Unlimited history
- [x] Export to Notion
- [x] Export to Todoist
- [x] Export to ClickUp
- [x] License validation with device binding

---

## Planned Features

### Phase 1: Quick Wins (Priority: HIGH)

| Feature | Tier | Description | Effort |
|---------|------|-------------|--------|
| Dark mode | Free | Toggle in popup, follows system | Small |
| Selected text extraction | Free | Extract from highlighted text only | Small |
| Edit tasks inline | Free | Click to edit title/priority before export | Medium |
| Undo button | Free | Restore previous extraction | Small |
| Bulk category actions | Free | "Select all high priority" | Small |

### Phase 2: Core Pro Features (Priority: HIGH)

| Feature | Tier | Description | Effort |
|---------|------|-------------|--------|
| CSV export | Pro | Download tasks as CSV | Small |
| JSON export | Pro | Download tasks as JSON | Small |
| Filter & search | Pro | Search within extracted tasks | Medium |
| Confidence scores | Pro | Show AI certainty per task | Medium |
| Asana integration | Pro | Export to Asana | Medium |
| Linear integration | Pro | Export to Linear | Medium |

### Phase 3: Advanced Extraction (Priority: MEDIUM)

| Feature | Tier | Description | Effort |
|---------|------|-------------|--------|
| Email mode | Pro | Optimized for Gmail/Outlook | Medium |
| Meeting notes mode | Pro | Smart detection for agendas | Medium |
| Sub-task detection | Pro | Identify nested tasks | Medium |
| Recurring detection | Pro | "Every week", "daily" patterns | Medium |
| Time estimation | Pro | AI suggests effort per task | Medium |

### Phase 4: Platform Features (Priority: MEDIUM)

| Feature | Tier | Description | Effort |
|---------|------|-------------|--------|
| Custom extraction rules | Pro | Define keywords to prioritize | Large |
| Task templates | Pro | Pre-configured presets | Medium |
| Custom keyboard shortcuts | Pro | Personalize key bindings | Medium |
| Cloud sync | Pro | Sync settings across devices | Large |
| Analytics dashboard | Pro | Track extraction patterns | Large |

### Phase 5: Additional Integrations (Priority: LOW)

| Feature | Tier | Description | Effort |
|---------|------|-------------|--------|
| Trello integration | Pro | Export to Trello boards | Medium |
| Google Tasks | Pro | Export to Google Tasks | Medium |
| Jira integration | Pro | Export to Jira (enterprise) | Large |
| Calendar preview | Pro | Mini calendar with due dates | Medium |
| Slack notification | Pro | Send tasks to Slack channel | Medium |

---

## Feature Details

### Dark Mode
```typescript
// Storage
interface Settings {
  // ... existing
  theme: 'light' | 'dark' | 'system';
}

// Popup.tsx
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const isDark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark);
```

### Selected Text Extraction
```typescript
// service-worker.ts - new context menu
chrome.contextMenus.create({
  id: 'extract-from-selection',
  title: 'Extract Tasks from Selection',
  contexts: ['selection'],
});

// Handle selection extraction
if (info.menuItemId === 'extract-from-selection' && info.selectionText) {
  // Extract from selectionText instead of full page
}
```

### Email Mode
Enhanced prompt for email patterns:
- Detect sender as potential assignee
- Recognize "Please do X", "Can you Y", "Need Z by date"
- Handle email thread structure
- Works on: Gmail, Outlook web, Yahoo Mail

### Meeting Notes Mode
Enhanced prompt for meeting patterns:
- Detect agenda items
- Recognize "Action item:", "Decision:", "Follow-up:"
- Extract attendees as assignees
- Works on: Google Docs, Notion, Confluence, meeting summaries

### Confidence Scores
```typescript
interface ExtractedTask {
  // ... existing
  confidence: number;  // 0-1, how certain AI is
}

// Display in UI
<span className="text-xs text-gray-400">
  {Math.round(task.confidence * 100)}% confident
</span>
```

---

## Pricing Summary

| Tier | Price | Limits | Key Features |
|------|-------|--------|--------------|
| Free | $0 | 5/day, 7-day history | Basic extraction, clipboard/markdown export |
| Pro | $19 one-time | Unlimited | All integrations, modes, templates, analytics |

---

## Competitive Positioning

### What Makes Us Different
1. **Works on ANY page** - Not just meetings or specific apps
2. **Standalone extension** - No platform lock-in
3. **BYOK model** - User controls AI costs
4. **One-time Pro** - No subscription fatigue
5. **7 categories** - More nuanced than competitors

### Target Users
- **Primary:** Knowledge workers, project managers, executives
- **Secondary:** Freelancers, students, researchers
- **Use cases:** Meeting notes, email processing, article reading, documentation

---

## Technical Debt to Address

- [ ] Add error boundary components
- [ ] Improve content script performance on large pages
- [ ] Add retry logic for AI API failures
- [ ] Implement request caching for repeated extractions
- [ ] Add telemetry (opt-in) for usage analytics

---

## Success Metrics

| Metric | Current | Target | By When |
|--------|---------|--------|---------|
| Chrome Web Store rating | N/A | 4.5+ stars | 3 months |
| Weekly active users | N/A | 1,000 | 3 months |
| Pro conversion rate | N/A | 5% | 3 months |
| Avg tasks per extraction | N/A | 5+ | 1 month |

---

*See also: [ROADMAP-BUNDLES-ANALYTICS.md](./ROADMAP-BUNDLES-ANALYTICS.md) for cross-extension strategy*
