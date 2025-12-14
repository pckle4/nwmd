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

  // Parsing & History Management
  useEffect(() => {
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
      }
    }, 150);
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

  const insertLorem = () => insertText("Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ");
  
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
      case 'note': block = '\n> [!NOTE]\n> This is a note alert.\n'; break;
      case 'tip': block = '\n> [!TIP]\n> This is a helpful tip.\n'; break;
      case 'warning': block = '\n> [!WARNING]\n> This is a warning!\n'; break;
      case 'caution': block = '\n> [!CAUTION]\n> Use with caution.\n'; break;
      case 'details': block = '\n<details>\n<summary>Click to expand</summary>\n\nHidden content goes here.\n\n</details>\n'; break;
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
    <div className={`site-footer mt-auto py-2 px-4 border-t text-[10px] flex justify-between items-center z-20 no-print ${theme === 'light' ? 'bg-white border-gray-200 text-gray-500' : 'bg-gray-900 border-gray-700 text-gray-400'}`}>
       <div className="flex items-center gap-4">
          <span className="font-bold uppercase tracking-wider text-indigo-500">NoWhile Editor</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">All rights reserved © {currentTime.getFullYear()}</span>
       </div>
       <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {currentTime.toLocaleTimeString()}
          </div>
          <span className="opacity-60">PDF Generation via Browser Native Print</span>
       </div>
    </div>
  );

  return (
    <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : theme === 'midnight' ? 'bg-slate-900 text-slate-100' : 'bg-white text-gray-900'} transition-colors duration-300`}>
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
            <input type="text" value={docName} onChange={(e) => setDocName(e.target.value)} className={`text-lg font-bold tracking-tight leading-none focus:outline-none focus:border-b border-transparent transition-all w-40 sm:w-64 bg-transparent p-0.5 ${theme === 'light' ? 'focus:border-indigo-500 hover:border-gray-300' : 'focus:border-indigo-400 hover:border-gray-600'}`} placeholder="Document Name" />
            <p className={`text-xs font-medium mt-1 uppercase tracking-wider ${theme === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>NoWhile Editor</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Theme & Actions */}
          <div className={`hidden md:flex rounded-lg border p-1 ${theme === 'light' ? 'bg-gray-100 border-gray-200' : 'bg-gray-800 border-gray-700'}`}>
             <button onClick={() => setTheme('light')} className={`p-1.5 rounded-md text-xs font-medium ${theme === 'light' ? 'bg-white shadow text-gray-900' : 'text-gray-400'}`}>Light</button>
             <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-md text-xs font-medium ${theme === 'dark' ? 'bg-gray-600 shadow text-white' : 'text-gray-500'}`}>Dark</button>
             <button onClick={() => setTheme('midnight')} className={`p-1.5 rounded-md text-xs font-medium ${theme === 'midnight' ? 'bg-slate-600 shadow text-white' : 'text-gray-500'}`}>Blue</button>
          </div>
          <div className="w-px h-6 bg-gray-300 mx-2 hidden md:block"></div>
          <button onClick={() => setIsFocused(true)} className="p-2 text-gray-500 hover:text-indigo-500 hidden md:block"><Icons.Maximize /></button>
          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-indigo-500"><Icons.Upload /></button>
          <button onClick={handleDownloadHTML} className="p-2 text-gray-500 hover:text-indigo-500"><Icons.Html /></button>
          <button onClick={handleCopyMarkdown} className="p-2 text-gray-500 hover:text-indigo-500"><Icons.Copy /></button>
          <button onClick={handleDownloadMD} className="p-2 text-gray-500 hover:text-green-500"><Icons.Download /></button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md transition-all active:scale-95 ml-2"><Icons.Print /> <span className="hidden sm:inline">Print PDF</span></button>
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
          <button onClick={insertLorem} className="text-xs p-1.5 border rounded hover:bg-gray-100 dark:hover:bg-gray-700">Lorem</button>
          
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
           <div className={`paper-preview ${paperSize === 'a4' ? 'paper-a4' : 'paper-letter'} ${fontFamily === 'serif' ? 'font-serif' : fontFamily === 'mono' ? 'font-mono' : 'font-sans'} ${fontSize === 'sm' ? 'text-size-sm' : fontSize === 'lg' ? 'text-size-lg' : 'text-size-base'}`} style={{ transform: `scale(${zoomLevel})` }}>
              <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
              <DocFooter />
           </div>
        </div>

        {/* Overlays */}
        {isFocused && <button onClick={() => setIsFocused(false)} className="focus-mode-toggle absolute top-4 right-4 p-2 bg-gray-800 text-white rounded-full opacity-50 hover:opacity-100 z-50 shadow-lg"><Icons.Minimize /></button>}
        <div className="lg:hidden absolute bottom-16 right-6 flex gap-2 no-print z-40">
          <button onClick={() => setView(view === EditorView.EDIT ? EditorView.PREVIEW : EditorView.EDIT)} className="p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-transform">{view === EditorView.EDIT ? <Icons.Eye /> : <Icons.Edit />}</button>
        </div>
      </main>

      {/* --- SITE FOOTER --- */}
      {!isFocused && <SiteFooter />}

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-xl text-sm font-medium animate-bounce-in z-50 flex items-center gap-2 no-print ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
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
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      {id:'note',icon:'ℹ️',t:'Note',d:'Blue info box'}, {id:'tip',icon:'💡',t:'Tip',d:'Green success box'},
                      {id:'warning',icon:'⚠️',t:'Warning',d:'Yellow warning'}, {id:'caution',icon:'🛑',t:'Caution',d:'Red critical'},
                      {id:'details',icon:'🔽',t:'Collapsible',d:'Details/Summary'}, {id:'pricing',icon:'💲',t:'Pricing Table',d:'Complex Layout'},
                      {id:'features',icon:'✅',t:'Feature List',d:'Styled checkboxes'}, {id:'image',icon:'🖼️',t:'Image',d:'Placeholder'},
                      {id:'timeline',icon:'📅',t:'Timeline',d:'Vertical steps'}, {id:'button',icon:'🔘',t:'Button Link',d:'CTA Button'},
                      {id:'progress',icon:'📊',t:'Progress Bar',d:'Visual meter'}, {id:'filetree',icon:'📂',t:'File Tree',d:'Folder structure'},
                      {id:'math',icon:'∑',t:'Math',d:'Latex equation'}, {id:'footnote',icon:'¹',t:'Footnote',d:'Reference'}
                    ].map(b => (
                      <button key={b.id} onClick={() => insertBlock(b.id)} className={`p-3 text-left rounded border flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group ${theme==='light'?'border-gray-200':'border-gray-700'}`}>
                        <span className="text-xl">{b.icon}</span>
                        <div><div className="text-sm font-bold">{b.t}</div><div className="text-xs opacity-60">{b.d}</div></div>
                      </button>
                    ))}
                    <div className="col-span-full pt-4 border-t mt-2">
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
