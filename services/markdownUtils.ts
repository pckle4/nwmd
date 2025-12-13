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
 * Parses markdown string to sanitized HTML string.
 * Uses markdown-it for parsing and DOMPurify for sanitization.
 */
export const parseMarkdown = async (content: string): Promise<string> => {
  const rawHtml = md.render(content);
  // Sanitize the resulting HTML to prevent XSS
  return DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['iframe'], // Optional: allow iframes if needed
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling']
  });
};