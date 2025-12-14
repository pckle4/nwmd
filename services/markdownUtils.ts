import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';

// Initialize markdown-it with configuration
const md = new MarkdownIt({
  html: true,        // Enable HTML tags in source
  xhtmlOut: false,   // Use '/' to close single tags (<br />).
  breaks: true,      // Convert '\n' in paragraphs to <br>
  langPrefix: 'hljs language-',  // CSS language prefix for fenced blocks
  linkify: true,     // Autoconvert URL-like text to links
  typographer: true,
  quotes: '“”‘’',
  
  // Custom highlight function using highlight.js
  highlight: function (str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`;
      } catch (__) {}
    }
    // Default fallback
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  }
});

/**
 * Pre-processes markdown to convert GFM Alert syntax to HTML div blocks
 * Syntax: > [!NOTE] content
 */
const processAlerts = (content: string): string => {
  const alertRegex = /^>\s+\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s?(.*)$/gim;
  
  // We need to handle multi-line blockquotes that are alerts. 
  // This is a simplified regex replacement for the first line of the alert.
  // A robust full-parser plugin would be better but this covers 95% of use cases.
  
  return content.replace(alertRegex, (match, type, text) => {
    const lowerType = type.toLowerCase();
    // Map IMPORTANT to Warning style or keep separate
    const styleClass = lowerType === 'important' ? 'warning' : lowerType; 
    
    return `<div class="markdown-alert markdown-alert-${styleClass}">
<div class="markdown-alert-title">${type}</div>
${text}
</div>`; 
  });
};

/**
 * Parses markdown string to sanitized HTML string.
 * Uses markdown-it for parsing and DOMPurify for sanitization.
 */
export const parseMarkdown = async (content: string): Promise<string> => {
  // Pre-process for GFM alerts
  const processedContent = processAlerts(content);
  
  const rawHtml = md.render(processedContent);
  // Sanitize the resulting HTML to prevent XSS
  return DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['iframe', 'details', 'summary', 'kbd', 'sub', 'sup', 'u'], // Allow interactive/formatting tags
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'class', 'open', 'align', 'style']
  });
};
