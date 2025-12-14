import React, { useState, useEffect, useRef } from 'react';
import { SAMPLE_MARKDOWN, TEMPLATES } from './constants';
import { parseMarkdown } from './services/markdownUtils';
import { EditorView, Theme, FontFamily, FontSize, PaperSize } from './types';
import { Icons } from './components/Icons';

export default function App() {
  // History State
  const [history, setHistory] = useState<string[]>([SAMPLE_MARKDOWN]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [markdown, setMarkdown] = useState<string>(SAMPLE_MARKDOWN);
  const [html, setHtml] = useState<string>('');
  const [customCss, setCustomCss] = useState<string>('');
  const [docName, setDocName] = useState<string>('Untitled Document');
  
  // Modals & Tools state
  const [activeModal, setActiveModal] = useState<'none' | 'link' | 'table' | 'css' | 'blocks'>('none');
  const [linkData, setLinkData] = useState({ text: '', url: '' });
  const [tableData, setTableData] = useState({ rows: 3, cols: 3 });
  
  // New Features State
  const [zoomLevel, setZoomLevel] = useState(1);
  const [targetWordCount, setTargetWordCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<EditorView>(EditorView.SPLIT);
  const [theme, setTheme] = useState<Theme>('light');
  const [fontFamily, setFontFamily] = useState<FontFamily>('sans');
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Smooth Loading State
  const [isParsing, setIsParsing] = useState(false);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Live Clock Update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Update Page Title
  useEffect(() => {
    document.title = docName || 'NoWhile Editor';
  }, [docName]);

  // Parsing & History Management with Smooth Loading State
  useEffect(() => {
    // Indicate loading immediately when markdown changes
    setIsParsing(true);
    
    const timer = setTimeout(async () => {
      try {
        const parsed = await parseMarkdown(markdown);
        setHtml(parsed);
        
        // Stats
        const text = markdown.trim();
        const words = text ? text.split(/\s+/).length : 0;
        setWordCount(words);
        setReadingTime(Math.ceil(words / 200)); 
      } catch (e) {
        console.error("Parse error", e);
      } finally {
        // Stop loading after render
        setIsParsing(false);
      }
    }, 300); // Increased debounce to 300ms for smoother feel on large docs
    return () => clearTimeout(timer);
  }, [markdown]);

  // Viewport Handler
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setView(EditorView.SPLIT);
      } else if (view === EditorView.SPLIT) {
        setView(EditorView.EDIT);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, []); 

  // --- Scroll Sync ---
  const handleEditorScroll = () => {
    if (!textAreaRef.current || !previewRef.current) return;
    const editor = textAreaRef.current;
    const preview = previewRef.current;
    const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
    preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
  };

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- History Actions ---
  const updateMarkdown = (newMarkdown: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newMarkdown);
    if (newHistory.length > 50) newHistory.shift(); // Limit history
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setMarkdown(newMarkdown);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setMarkdown(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setMarkdown(history[historyIndex + 1]);
    }
  };

  // --- Main Actions ---
  const handlePrint = () => window.print();

  const handleDownloadMD = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(docName || 'doc').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Markdown downloaded");
  };
  
  const handleDownloadHTML = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(docName || 'doc').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification("HTML downloaded");
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        updateMarkdown(content);
        showNotification("File imported");
      }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      showNotification("Copied to clipboard");
    } catch (err) {
      showNotification("Failed to copy", 'error');
    }
  };

  const handleReset = () => {
    if (window.confirm("Reset everything?")) {
      updateMarkdown(SAMPLE_MARKDOWN);
      setDocName("Untitled Document");
      setCustomCss("");
      setTargetWordCount(0);
      setZoomLevel(1);
    }
  };
  
  const handleLoadTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateName = e.target.value;
    if (!templateName) return;
    // @ts-ignore
    const tmpl = TEMPLATES[templateName];
    if (tmpl) updateMarkdown(tmpl);
    e.target.value = "";
  };

  // --- Insert Logic ---
  const insertText = (before: string, after: string = "") => {
    const textarea = textAreaRef.current;
    if (!textarea) return;
    const scrollTop = textarea.scrollTop;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.substring(start, end);
    const newText = markdown.substring(0, start) + before + selectedText + after + markdown.substring(end);
    
    updateMarkdown(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
      textarea.scrollTop = scrollTop;
    }, 0);
  };
  
  // --- New Tools ---
  const transformCase = (type: 'upper' | 'lower' | 'capitalize') => {
    const textarea = textAreaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) return;
    
    const selectedText = markdown.substring(start, end);
    let newText = selectedText;
    
    if (type === 'upper') newText = selectedText.toUpperCase();
    if (type === 'lower') newText = selectedText.toLowerCase();
    if (type === 'capitalize') newText = selectedText.replace(/\b\w/g, l => l.toUpperCase());
    
    const final = markdown.substring(0, start) + newText + markdown.substring(end);
    updateMarkdown(final);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + newText.length);
    }, 0);
  };

  // --- Insert Helpers ---
  const insertDateTime = () => insertText(new Date().toLocaleString());
  const insertColor = (color: string) => insertText(`<span style="color:${color}">`, `</span>`);
  const insertBadge = (color: string) => insertText(`<span class="badge badge-${color}">`, `</span>`);
  const insertHighlight = () => insertText('<mark>', '</mark>');
  const insertAlign = (align: 'left' | 'center' | 'right') => insertText(`<div align="${align}">\n`, '\n</div>');
  const insertHorizontalRule = () => insertText('\n---\n');
  const insertLineBreak = () => insertText('<br />');

  // --- Readymade Blocks ---
  const insertBlock = (type: string) => {
    let block = "";
    switch(type) {
      // Basic
      case 'note': block = '\n> [!NOTE]\n> This is a note alert.\n'; break;
      case 'tip': block = '\n> [!TIP]\n> This is a helpful tip.\n'; break;
      case 'warning': block = '\n> [!WARNING]\n> This is a warning!\n'; break;
      case 'caution': block = '\n> [!CAUTION]\n> Use with caution.\n'; break;
      case 'details': block = '\n<details>\n<summary>Click to expand</summary>\n\nHidden content goes here.\n\n</details>\n'; break;
      // Advanced
      case 'pricing': block = '\n| Plan | Price | Features |\n| :--- | :---: | :--- |\n| Basic | $10 | ✅ Support |\n| Pro | $29 | ✅ All Features |\n'; break;
      case 'features': block = '\n- ✅ **Feature A**: Description\n- ✅ **Feature B**: Description\n- ⚠️ **Feature C**: Beta\n'; break;
      case 'footnote': insertText('[^1]', '\n\n[^1]: This is the footnote text.'); return;
      case 'deflist': block = '\nTerm 1\n:   Definition 1\n\nTerm 2\n:   Definition 2\n'; break;
      case 'image': block = '![Alt Text](https://placehold.co/600x400 "Image Title")'; break;
      case 'math': block = '\n$$\nE = mc^2\n$$\n'; break;
      case 'timeline': block = '\n<div class="timeline">\n<div class="timeline-item">\n<strong>2023</strong>: Started Project\n</div>\n<div class="timeline-item">\n<strong>2024</strong>: Launched Beta\n</div>\n</div>\n'; break;
      case 'button': block = '<a href="#" class="btn">Click Me</a>'; break;
      case 'progress': block = '\n<div class="progress-wrap"><div class="progress-bar" style="width: 60%"></div></div>\n'; break;
      case 'filetree': block = '\n<div class="file-tree">\n<ul>\n<li class="folder">src\n<ul>\n<li>index.html</li>\n<li>app.tsx</li>\n</ul>\n</li>\n<li>package.json</li>\n</ul>\n</div>\n'; break;
      
      // New Options (12+)
      case 'kanban': block = '\n<div class="kanban-board">\n<div class="kanban-col"><h4>To Do</h4><div class="kanban-card">Task 1</div></div>\n<div class="kanban-col"><h4>Doing</h4><div class="kanban-card">Task 2</div></div>\n<div class="kanban-col"><h4>Done</h4><div class="kanban-card">Task 3</div></div>\n</div>\n'; break;
      case 'swot': block = '\n<div class="swot-grid">\n<div class="swot-item swot-s"><strong>Strengths</strong><ul><li>Item 1</li></ul></div>\n<div class="swot-item swot-w"><strong>Weaknesses</strong><ul><li>Item 1</li></ul></div>\n<div class="swot-item swot-o"><strong>Opportunities</strong><ul><li>Item 1</li></ul></div>\n<div class="swot-item swot-t"><strong>Threats</strong><ul><li>Item 1</li></ul></div>\n</div>\n'; break;
      case 'persona': block = '\n<div class="persona-card">\n<div class="persona-avatar">👤</div>\n<div>\n<h3>User Persona</h3>\n<p><strong>Role:</strong> Manager</p>\n<p><strong>Goal:</strong> Improve efficiency</p>\n</div>\n</div>\n'; break;
      case 'steps': block = '\n<ul class="step-process">\n<li class="step-item"><strong>Step 1</strong>: Planning</li>\n<li class="step-item"><strong>Step 2</strong>: Execution</li>\n<li class="step-item"><strong>Step 3</strong>: Review</li>\n</ul>\n'; break;
      case 'kpi': block = '\n<div class="kpi-grid">\n<div class="kpi-card"><div class="kpi-value">250%</div><div class="kpi-label">Growth</div></div>\n<div class="kpi-card"><div class="kpi-value">$12k</div><div class="kpi-label">Revenue</div></div>\n</div>\n'; break;
      case 'social': block = '\n<div style="border:1px solid #ddd; padding:15px; border-radius:8px; max-width:400px;">\n<div style="font-weight:bold; margin-bottom:5px;">@username</div>\n<p>Just launched a new feature! 🚀 #coding</p>\n<div style="font-size:12px; color:#888; margin-top:10px;">10:30 AM • Oct 24, 2023</div>\n</div>\n'; break;
      case 'comparison': block = '\n| Feature | Basic | Pro |\n|---|---|---|\n| Users | 1 | Unlimited |\n| Storage | 5GB | 1TB |\n| Support | Email | 24/7 |\n'; break;
      case 'faq': block = '\n### Frequently Asked Questions\n<details><summary>Question 1?</summary>Answer 1.</details>\n<details><summary>Question 2?</summary>Answer 2.</details>\n'; break;
      case 'sheetmusic': block = '\n```\n| C D E F | G A B C |\n```\n'; break;
      case 'terminal': block = '\n<div style="background:#1e1e1e; color:#0f0; padding:15px; border-radius:6px; font-family:monospace;">\n$ npm install package<br/>> added 54 packages in 2s\n</div>\n'; break;
      case 'recipe': block = '\n### 🍪 Recipe Name\n**Prep:** 10m | **Cook:** 20m\n- [ ] Ingredient 1\n- [ ] Ingredient 2\n\n1. Step one\n2. Step two\n'; break;
      case 'review': block = '\n> ⭐⭐⭐⭐⭐\n> "Absolutely amazing service! Highly recommended."\n> — *Happy Customer*\n'; break;
    }
    insertText(block);
    setActiveModal('none');
  };

  // --- Footer Component (Print PDF) ---
  const DocFooter = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return (
      <div className="doc-footer flex flex-col items-center justify-center gap-3 mt-12 pt-6 border-t border-dashed border-gray-300 print:flex">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 flex items-center gap-1.5 shadow-sm">
            <Icons.Globe />
            <span className="font-bold text-xs uppercase tracking-wider">NoWhile</span>
          </div>
          <div className="px-3 py-1 bg-white text-gray-700 rounded-full border border-gray-200 flex items-center gap-1.5 shadow-sm">
            <Icons.User />
            <span className="font-semibold text-xs max-w-[150px] truncate">{docName || 'Untitled'}</span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-[10px] text-gray-400 font-mono uppercase tracking-tight">
          <span className="flex items-center gap-1"><Icons.Calendar /> {dateStr}</span>
          <span className="flex items-center gap-1"><Icons.Clock /> {timeStr}</span>
          <span className="flex items-center gap-1"><Icons.Hash /> {wordCount} words</span>
        </div>
      </div>
    );
  };

  // --- Site Footer (Web App) ---
  const SiteFooter = () => (
    <div className={`site-footer mt-auto py-3 px-4 border-t text-[11px] flex flex-col sm:flex-row justify-between items-center z-20 no-print gap-2 ${theme === 'light' ? 'bg-white border-gray-200 text-gray-500' : 'bg-gray-900 border-gray-700 text-gray-400'}`}>
       <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-4 text-center sm:text-left">
          <div>
            <span className="font-bold text-indigo-500">NoWhile</span>
            <span className="mx-1 text-gray-300">|</span>
            <span className="text-pink-500 font-medium">All rights reserved © {currentTime.getFullYear()}</span>
          </div>
          <div className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full"></div>
          <div className="flex items-center gap-1">
             <span className="opacity-70">Powered by</span>
             <span className="font-semibold text-orange-500">Browser Native Print</span>
             <span className="opacity-70"> - Thank you!</span>
          </div>
       </div>
       <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {currentTime.toLocaleTimeString()}
          </div>
       </div>
    </div>
  );

  return (
    <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : theme === 'midnight' ? 'bg-slate-900 text-slate-100' : 'bg-white text-gray-900'} transition-colors duration-300 overflow-hidden`}>
      <style dangerouslySetInnerHTML={{ __html: customCss }} />
      <input type="file" ref={fileInputRef} className="hidden" accept=".md,.txt" onChange={handleImportFile} />

      {/* --- HEADER --- */}
      {!isFocused && (
      <header className={`flex items-center justify-between px-4 py-3 border-b shrink-0 z-20 no-print ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-700'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-lg shadow-indigo-500/30">
            <Icons.Globe />
          </div>
          <div className="flex flex-col">
            <input type="text" value={docName} onChange={(e) => setDocName(e.target.value)} className={`text-lg font-bold tracking-tight leading-none focus:outline-none focus:border-b border-transparent transition-all w-32 sm:w-64 bg-transparent p-0.5 ${theme === 'light' ? 'focus:border-indigo-500 hover:border-gray-300' : 'focus:border-indigo-400 hover:border-gray-600'}`} placeholder="Document Name" />
            <p className={`text-xs font-medium mt-1 uppercase tracking-wider ${theme === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>NoWhile Editor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Theme & Actions */}
          <div className={`hidden lg:flex rounded-lg border p-1 ${theme === 'light' ? 'bg-gray-100 border-gray-200' : 'bg-gray-800 border-gray-700'}`}>
             <button onClick={() => setTheme('light')} className={`p-1.5 rounded-md text-xs font-medium ${theme === 'light' ? 'bg-white shadow text-gray-900' : 'text-gray-400'}`}>Light</button>
             <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-md text-xs font-medium ${theme === 'dark' ? 'bg-gray-600 shadow text-white' : 'text-gray-500'}`}>Dark</button>
             <button onClick={() => setTheme('midnight')} className={`p-1.5 rounded-md text-xs font-medium ${theme === 'midnight' ? 'bg-slate-600 shadow text-white' : 'text-gray-500'}`}>Blue</button>
          </div>
          <div className="w-px h-6 bg-gray-300 mx-2 hidden lg:block"></div>
          <button onClick={() => setIsFocused(true)} className="p-2 text-gray-500 hover:text-indigo-500 hidden md:block"><Icons.Maximize /></button>
          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-indigo-500"><Icons.Upload /></button>
          <button onClick={handleDownloadHTML} className="p-2 text-gray-500 hover:text-indigo-500 hidden sm:block"><Icons.Html /></button>
          <button onClick={handleCopyMarkdown} className="p-2 text-gray-500 hover:text-indigo-500 hidden sm:block"><Icons.Copy /></button>
          <button onClick={handleDownloadMD} className="p-2 text-gray-500 hover:text-green-500"><Icons.Download /></button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-md transition-all active:scale-95 ml-2"><Icons.Print /> <span className="hidden sm:inline">Print</span></button>
        </div>
      </header>
      )}

      {/* --- EXTENDED TOOLBAR --- */}
      {!isFocused && (
      <div className={`flex flex-wrap items-center px-4 py-2 border-b text-sm shrink-0 no-print gap-y-2 overflow-x-auto ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-gray-800 border-gray-700'}`}>
        <div className="flex items-center gap-1 min-w-max">
          {/* Group 1: History */}
          <div className="flex gap-0.5 mr-2">
            <button onClick={undo} disabled={historyIndex <= 0} className="p-1.5 rounded hover:bg-black/5 disabled:opacity-30"><Icons.Undo /></button>
            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-1.5 rounded hover:bg-black/5 disabled:opacity-30"><Icons.Redo /></button>
            <button onClick={() => insertText("")} className="p-1.5 rounded hover:bg-black/5 text-red-400" title="Clear Formatting (Partial)"><Icons.Eraser /></button>
          </div>
          <div className="w-px h-4 bg-gray-300 mx-1"></div>
          
          {/* Group 2: Text Basics */}
          <button onClick={() => insertText('# ')} className="p-1.5 rounded hover:bg-black/5 font-bold text-xs w-7">H1</button>
          <button onClick={() => insertText('## ')} className="p-1.5 rounded hover:bg-black/5 font-bold text-xs w-7">H2</button>
          <button onClick={() => insertText('### ')} className="p-1.5 rounded hover:bg-black/5 font-bold text-xs w-7">H3</button>
          <button onClick={() => insertText('**', '**')} className="p-1.5 rounded hover:bg-black/5 font-bold w-7">B</button>
          <button onClick={() => insertText('*', '*')} className="p-1.5 rounded hover:bg-black/5 italic w-7">I</button>
          <button onClick={() => insertText('~~', '~~')} className="p-1.5 rounded hover:bg-black/5 line-through w-7">S</button>
          <button onClick={() => insertText('<u>', '</u>')} className="p-1.5 rounded hover:bg-black/5 underline w-7">U</button>
          
          <div className="w-px h-4 bg-gray-300 mx-1"></div>
          
          {/* Group 3: Colors & Highlights */}
          <button onClick={() => transformCase('upper')} className="p-1.5 rounded hover:bg-black/5 text-xs font-bold w-7" title="UPPERCASE">AA</button>
          <button onClick={() => transformCase('lower')} className="p-1.5 rounded hover:bg-black/5 text-xs font-bold w-7" title="lowercase">aa</button>
          <button onClick={insertHighlight} className="p-1.5 rounded hover:bg-black/5"><Icons.Highlight /></button>
          <button onClick={() => insertColor('red')} className="p-1.5 rounded hover:bg-black/5 text-red-500"><Icons.Color /></button>
          <button onClick={() => insertColor('blue')} className="p-1.5 rounded hover:bg-black/5 text-blue-500"><Icons.Color /></button>
          
          <div className="w-px h-4 bg-gray-300 mx-1"></div>

          {/* Group 4: Layout & Lists */}
          <button onClick={() => insertAlign('left')} className="p-1.5 rounded hover:bg-black/5"><Icons.AlignLeft /></button>
          <button onClick={() => insertAlign('center')} className="p-1.5 rounded hover:bg-black/5"><Icons.Center /></button>
          <button onClick={() => insertAlign('right')} className="p-1.5 rounded hover:bg-black/5"><Icons.AlignRight /></button>
          <button onClick={() => insertText('\n- [ ] ')} className="p-1.5 rounded hover:bg-black/5"><Icons.List /></button>
          <button onClick={() => insertText('> ')} className="p-1.5 rounded hover:bg-black/5"><Icons.Quote /></button>
          <button onClick={() => insertText('\n```javascript\n', '\n```\n')} className="p-1.5 rounded hover:bg-black/5"><Icons.Code /></button>
          
          <div className="w-px h-4 bg-gray-300 mx-1"></div>

          {/* Group 5: Inserts */}
          <button onClick={() => setActiveModal('link')} className="p-1.5 rounded hover:bg-black/5"><Icons.Link /></button>
          <button onClick={() => setActiveModal('table')} className="p-1.5 rounded hover:bg-black/5"><Icons.Table /></button>
          <button onClick={insertHorizontalRule} className="p-1.5 rounded hover:bg-black/5" title="Horizontal Line"><Icons.Minus /></button>
          <button onClick={insertLineBreak} className="p-1.5 rounded hover:bg-black/5 font-mono text-xs" title="Line Break">BR</button>
          <button onClick={() => insertText('✅ ')} className="p-1.5 rounded hover:bg-black/5">✅</button>
          <button onClick={() => insertText('<kbd>', '</kbd>')} className="p-1.5 rounded hover:bg-black/5 text-xs font-mono border">Kbd</button>

          {/* Group 6: Advanced Blocks */}
          <button 
            onClick={() => setActiveModal('blocks')} 
            className={`px-3 py-1 rounded bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors ml-2 shadow-sm flex items-center gap-1`}
          >
             <Icons.Blocks /> Add Block
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto min-w-max">
          <select onChange={handleLoadTemplate} className={`text-xs p-1.5 rounded border max-w-[100px] ${theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600 text-white'}`}>
            <option value="">Templates</option>
            <option value="resume">Resume</option>
            <option value="letter">Letter</option>
            <option value="invoice">Invoice</option>
          </select>
          
          <div className="w-px h-4 bg-gray-300 mx-1"></div>
          
          {/* Configs */}
          <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value as FontFamily)} className={`text-xs p-1 rounded border ${theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600 text-white'}`}>
            <option value="sans">Sans</option>
            <option value="serif">Serif</option>
            <option value="mono">Mono</option>
          </select>
          <select value={fontSize} onChange={(e) => setFontSize(e.target.value as FontSize)} className={`text-xs p-1 rounded border ${theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600 text-white'}`}>
            <option value="sm">Small</option>
            <option value="base">Medium</option>
            <option value="lg">Large</option>
          </select>
          <button onClick={() => setActiveModal('css')} className="p-1.5 rounded border"><Icons.CodeBrackets /></button>
          <button onClick={handleReset} className="text-red-500 hover:text-red-600 p-1 rounded hover:bg-red-50"><Icons.Refresh /></button>
        </div>
      </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Editor */}
        <div className={`flex-1 flex flex-col border-r relative z-10 transition-all duration-300 no-print ${view === EditorView.PREVIEW ? 'hidden lg:flex' : 'flex'} ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : theme === 'midnight' ? 'bg-slate-800 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
          <textarea
            ref={textAreaRef}
            onScroll={handleEditorScroll}
            value={markdown}
            onChange={(e) => updateMarkdown(e.target.value)}
            className={`flex-1 w-full p-6 resize-none focus:outline-none bg-transparent font-mono text-sm leading-relaxed ${theme === 'light' ? 'text-gray-800' : 'text-gray-200'}`}
            placeholder="Type your markdown here..."
            spellCheck={false}
          />
          {/* Stats Bar */}
          {!isFocused && (
          <div className={`px-4 py-2 border-t text-xs flex justify-between items-center ${theme === 'light' ? 'border-gray-200 text-gray-500' : 'border-gray-700 text-gray-400'}`}>
             <span className="flex gap-4 items-center">
               <span>{wordCount} words</span>
               <div className="h-4 w-px bg-current opacity-20"></div>
               <div className="flex items-center gap-2">
                 <Icons.Target />
                 <input type="number" value={targetWordCount} onChange={e => setTargetWordCount(Number(e.target.value))} className="w-16 bg-transparent border-b border-gray-300 focus:border-indigo-500 outline-none text-center" placeholder="Target" />
                 {targetWordCount > 0 && <span className="text-[10px] font-bold">{Math.min(100, Math.round((wordCount / targetWordCount) * 100))}%</span>}
               </div>
             </span>
             <span>~{readingTime} min read</span>
          </div>
          )}
        </div>

        {/* Preview */}
        <div ref={previewRef} className={`preview-container flex-1 bg-gray-200 overflow-auto relative transition-all duration-300 p-4 lg:p-8 pb-20 ${view === EditorView.EDIT ? 'hidden lg:block' : 'block'}`}>
           <div className="zoom-controls absolute top-4 right-8 flex gap-2 z-10 opacity-0 hover:opacity-100 transition-opacity">
              <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} className="p-1 bg-white rounded shadow text-gray-600 hover:text-indigo-600"><Icons.ZoomOut /></button>
              <span className="bg-white px-2 py-1 rounded shadow text-xs font-mono">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => setZoomLevel(z => Math.min(1.5, z + 0.1))} className="p-1 bg-white rounded shadow text-gray-600 hover:text-indigo-600"><Icons.ZoomIn /></button>
           </div>
           
           <div 
             className={`paper-preview ${paperSize === 'a4' ? 'paper-a4' : 'paper-letter'} ${fontFamily === 'serif' ? 'font-serif' : fontFamily === 'mono' ? 'font-mono' : 'font-sans'} ${fontSize === 'sm' ? 'text-size-sm' : fontSize === 'lg' ? 'text-size-lg' : 'text-size-base'} transition-opacity duration-200`} 
             style={{ transform: `scale(${zoomLevel})`, opacity: isParsing ? 0.7 : 1 }}
           >
              {isParsing && (
                 <div className="absolute top-4 right-4 text-gray-300 animate-pulse z-20">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                 </div>
              )}
              <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
              <DocFooter />
           </div>
        </div>

        {/* Overlays */}
        {isFocused && <button onClick={() => setIsFocused(false)} className="focus-mode-toggle absolute top-4 right-4 p-2 bg-gray-800 text-white rounded-full opacity-50 hover:opacity-100 z-50 shadow-lg"><Icons.Minimize /></button>}
        
        {/* Mobile View Toggle */}
        <div className="lg:hidden absolute bottom-24 right-6 flex gap-2 no-print z-40">
          <button onClick={() => setView(view === EditorView.EDIT ? EditorView.PREVIEW : EditorView.EDIT)} className="p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-transform">{view === EditorView.EDIT ? <Icons.Eye /> : <Icons.Edit />}</button>
        </div>
      </main>

      {/* --- SITE FOOTER --- */}
      {!isFocused && <SiteFooter />}

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-32 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-xl text-sm font-medium animate-bounce-in z-50 flex items-center gap-2 no-print ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
           {notification.type === 'success' ? <span>✓</span> : <span>!</span>} {notification.msg}
        </div>
      )}

      {/* --- UNIFIED MODALS --- */}
      {activeModal !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:hidden">
          <div className={`w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${theme === 'light' ? 'bg-white' : 'bg-gray-800 text-white'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${theme === 'light' ? 'border-gray-200' : 'border-gray-700'}`}>
               <h3 className="font-bold capitalize">{activeModal === 'blocks' ? 'Insert Advanced Block' : `Insert ${activeModal}`}</h3>
               <button onClick={() => setActiveModal('none')} className="hover:opacity-70"><Icons.X /></button>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
               {activeModal === 'link' && (
                 <>
                   <input type="text" value={linkData.text} onChange={e => setLinkData({...linkData, text: e.target.value})} className={`w-full p-2 rounded border text-sm ${theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-900 border-gray-600'}`} placeholder="Link Text" />
                   <input type="text" value={linkData.url} onChange={e => setLinkData({...linkData, url: e.target.value})} className={`w-full p-2 rounded border text-sm ${theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-900 border-gray-600'}`} placeholder="URL" />
                   <button onClick={() => { insertText(`[${linkData.text || 'Link'}]`, `(${linkData.url || '#'})`); setActiveModal('none'); }} className="px-4 py-2 bg-indigo-600 text-white rounded mt-2">Insert Link</button>
                 </>
               )}
               {activeModal === 'table' && (
                 <div className="grid grid-cols-2 gap-4">
                   <div><label className="text-xs">Rows</label><input type="number" min="1" max="20" value={tableData.rows} onChange={e => setTableData({...tableData, rows: parseInt(e.target.value) || 1})} className="w-full p-2 border rounded" /></div>
                   <div><label className="text-xs">Cols</label><input type="number" min="1" max="10" value={tableData.cols} onChange={e => setTableData({...tableData, cols: parseInt(e.target.value) || 1})} className="w-full p-2 border rounded" /></div>
                   <button onClick={() => { 
                      let h="|",d="|",b="";
                      for(let i=1;i<=tableData.cols;i++){h+=` H${i} |`;d+=`---|`;}
                      for(let r=0;r<tableData.rows;r++){b+="\n|";for(let c=0;c<tableData.cols;c++)b+=" |";}
                      insertText(`\n${h}\n${d}${b}\n`); setActiveModal('none'); 
                   }} className="col-span-2 px-4 py-2 bg-indigo-600 text-white rounded">Insert Table</button>
                 </div>
               )}
               {activeModal === 'css' && (
                 <div className="flex flex-col h-full">
                   <textarea value={customCss} onChange={(e) => setCustomCss(e.target.value)} className="flex-1 w-full p-3 font-mono text-xs border rounded-md resize-none h-64" placeholder=".markdown-body h1 { color: red; }" />
                   <button onClick={() => setActiveModal('none')} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded self-end">Save CSS</button>
                 </div>
               )}
               {activeModal === 'blocks' && (
                 <div>
                   <div className="text-xs font-bold uppercase opacity-50 mb-2">Categories</div>
                   <details open className="mb-4">
                      <summary className="cursor-pointer font-bold mb-2">Basic & Alerts</summary>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                          {[
                            {id:'note',icon:'ℹ️',t:'Note',d:'Blue info box'}, {id:'tip',icon:'💡',t:'Tip',d:'Green success box'},
                            {id:'warning',icon:'⚠️',t:'Warning',d:'Yellow warning'}, {id:'caution',icon:'🛑',t:'Caution',d:'Red critical'},
                            {id:'details',icon:'🔽',t:'Collapsible',d:'Details/Summary'}, {id:'button',icon:'🔘',t:'Button Link',d:'CTA Button'},
                          ].map(b => (
                            <button key={b.id} onClick={() => insertBlock(b.id)} className={`p-3 text-left rounded border flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group ${theme==='light'?'border-gray-200':'border-gray-700'}`}>
                              <span className="text-xl">{b.icon}</span>
                              <div><div className="text-sm font-bold">{b.t}</div><div className="text-xs opacity-60">{b.d}</div></div>
                            </button>
                          ))}
                      </div>
                   </details>
                   
                   <details className="mb-4">
                      <summary className="cursor-pointer font-bold mb-2">Diagrams & Charts</summary>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                          {[
                            {id:'kanban',icon:'📋',t:'Kanban Board',d:'Columns for tasks'}, {id:'swot',icon:'🎯',t:'SWOT Analysis',d:'2x2 Matrix'},
                            {id:'kpi',icon:'📊',t:'KPI Grid',d:'Stats Dashboard'}, {id:'progress',icon:'📉',t:'Progress Bar',d:'Visual meter'},
                            {id:'timeline',icon:'📅',t:'Timeline',d:'Vertical steps'}, {id:'filetree',icon:'📂',t:'File Tree',d:'Folder structure'},
                          ].map(b => (
                            <button key={b.id} onClick={() => insertBlock(b.id)} className={`p-3 text-left rounded border flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group ${theme==='light'?'border-gray-200':'border-gray-700'}`}>
                              <span className="text-xl">{b.icon}</span>
                              <div><div className="text-sm font-bold">{b.t}</div><div className="text-xs opacity-60">{b.d}</div></div>
                            </button>
                          ))}
                      </div>
                   </details>
                   
                   <details className="mb-4">
                      <summary className="cursor-pointer font-bold mb-2">Content & Layout</summary>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                          {[
                            {id:'pricing',icon:'💲',t:'Pricing Table',d:'Complex Layout'}, {id:'features',icon:'✅',t:'Feature List',d:'Styled checkboxes'},
                            {id:'comparison',icon:'🆚',t:'Comparison',d:'Feature Table'}, {id:'faq',icon:'❓',t:'FAQ Section',d:'Q&A List'},
                            {id:'steps',icon:'👣',t:'Step Process',d:'Numbered Steps'}, {id:'persona',icon:'👤',t:'User Persona',d:'Profile Card'},
                            {id:'social',icon:'🐦',t:'Social Post',d:'Mockup tweet'}, {id:'review',icon:'⭐',t:'Review',d:'Testimonial'},
                            {id:'recipe',icon:'🍪',t:'Recipe',d:'Ingredients list'}, {id:'sheetmusic',icon:'🎵',t:'Sheet Music',d:'Text format'},
                            {id:'terminal',icon:'💻',t:'Terminal',d:'Code Window'}, {id:'math',icon:'∑',t:'Math',d:'Latex equation'},
                          ].map(b => (
                            <button key={b.id} onClick={() => insertBlock(b.id)} className={`p-3 text-left rounded border flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group ${theme==='light'?'border-gray-200':'border-gray-700'}`}>
                              <span className="text-xl">{b.icon}</span>
                              <div><div className="text-sm font-bold">{b.t}</div><div className="text-xs opacity-60">{b.d}</div></div>
                            </button>
                          ))}
                      </div>
                   </details>
                   
                   <div className="pt-4 border-t mt-2">
                      <p className="text-xs font-bold mb-2 uppercase opacity-50">Badges</p>
                      <div className="flex flex-wrap gap-2">
                        {['blue','green','red','yellow','gray'].map(c => (
                          <button key={c} onClick={() => insertBadge(c)} className={`px-2 py-1 text-xs rounded border capitalize hover:opacity-80 bg-${c}-100 text-${c}-800`}>{c}</button>
                        ))}
                      </div>
                   </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
