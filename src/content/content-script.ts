// Content script for extracting page content

interface PageContent {
  content: string;
  title: string;
  url: string;
}

// Extract meaningful text content from the page
function extractPageContent(): PageContent {
  const title = document.title;
  const url = window.location.href;

  // Get main content
  let content = '';

  // Try to find main content areas first
  const mainSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.content',
    '.post-content',
    '.article-content',
    '.entry-content',
    '#content',
    '#main',
    '.main-content',
  ];

  let mainElement: Element | null = null;
  for (const selector of mainSelectors) {
    mainElement = document.querySelector(selector);
    if (mainElement) break;
  }

  // If no main content area found, use body
  const targetElement = mainElement || document.body;

  // Extract text content with structure
  content = extractStructuredText(targetElement);

  // Clean up the content
  content = cleanContent(content);

  // Limit content length to avoid API limits
  const maxLength = 15000;
  if (content.length > maxLength) {
    content = content.substring(0, maxLength) + '\n\n[Content truncated...]';
  }

  return { content, title, url };
}

// Extract text while preserving some structure
function extractStructuredText(element: Element): string {
  const parts: string[] = [];

  // Skip hidden elements and non-content elements
  const skipTags = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'PATH',
    'NAV', 'HEADER', 'FOOTER', 'ASIDE', 'FORM', 'BUTTON',
    'INPUT', 'SELECT', 'TEXTAREA', 'META', 'LINK', 'HEAD',
  ]);

  function processNode(node: Node, depth: number = 0): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text && text.length > 1) {
        parts.push(text);
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as Element;
    const tagName = el.tagName;

    // Skip non-content elements
    if (skipTags.has(tagName)) return;

    // Check if element is hidden
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    // Add structure markers for headings
    if (/^H[1-6]$/.test(tagName)) {
      const level = parseInt(tagName[1]);
      const text = el.textContent?.trim();
      if (text) {
        parts.push('\n' + '#'.repeat(level) + ' ' + text + '\n');
      }
      return;
    }

    // Handle list items
    if (tagName === 'LI') {
      const text = el.textContent?.trim();
      if (text) {
        parts.push('• ' + text);
      }
      return;
    }

    // Handle paragraphs
    if (tagName === 'P' || tagName === 'DIV') {
      const text = el.textContent?.trim();
      if (text && text.length > 10) {
        parts.push(text);
        parts.push('\n');
      }
      return;
    }

    // Handle tables
    if (tagName === 'TR') {
      const cells = Array.from(el.querySelectorAll('th, td'));
      const rowText = cells.map(c => c.textContent?.trim()).filter(Boolean).join(' | ');
      if (rowText) {
        parts.push(rowText);
      }
      return;
    }

    // Process children for other elements
    for (const child of el.childNodes) {
      processNode(child, depth + 1);
    }
  }

  processNode(element);
  return parts.join('\n');
}

// Clean up extracted content
function cleanContent(content: string): string {
  return content
    // Remove excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    // Remove common boilerplate patterns
    .replace(/cookie[s]?\s*(policy|consent|notice)/gi, '')
    .replace(/subscribe\s*(to\s*our)?\s*newsletter/gi, '')
    .replace(/sign\s*up\s*for\s*(our)?\s*(free)?\s*newsletter/gi, '')
    .replace(/follow\s*us\s*(on)?\s*(social\s*media)?/gi, '')
    // Clean up
    .trim();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PAGE_CONTENT') {
    try {
      const pageContent = extractPageContent();
      sendResponse(pageContent);
    } catch (error) {
      sendResponse({
        error: error instanceof Error ? error.message : 'Failed to extract page content',
      });
    }
    return true;
  }
});

// Log that content script is loaded
console.log('[AI Task Extractor] Content script loaded');
