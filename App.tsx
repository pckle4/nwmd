import React, { useState, useEffect, useRef } from 'react';
import { SAMPLE_MARKDOWN, TEMPLATES } from './constants';
import { parseMarkdown } from './services/markdownUtils';
import { EditorView, Theme, FontFamily, FontSize, PaperSize } from './types';
import { Icons } from './components/Icons';

export default function App() {
  const [markdown, setMarkdown] = useState<string>(SAMPLE_MARKDOWN);
  const [html, setHtml] = useState<string>('');
  const [customCss, setCustomCss] = useState<string>('');
  const [docName, setDocName] = useState<string>('Untitled Document');
  
  // Modals state
  const [activeModal, setActiveModal] = useState<'none' | 'link' | 'table' | 'css'>('none');
  const [linkData, setLinkData] = useState({ text: '', url: '' });
  const [tableData, setTableData] = useState({ rows: 3, cols: 3 });

  const [view, setView] = useState<EditorView>(EditorView.SPLIT);
  const [theme, setTheme] = useState<Theme>('light');
  const [fontFamily, setFontFamily] = useState<FontFamily>('sans');
  const [fontSize, setFontSize] = useState<FontSize>('base');
  const [paperSize, setPaperSize] = useState<PaperSize>('a4');
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(0);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Update Page Title for PDF "Save As"
  useEffect(() => {
    document.title = docName || 'Markdown to PDF Pro';
  }, [docName]);

  // Debounced parsing & Stats
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const parsed = await parseMarkdown(markdown);
        setHtml(parsed);
        
        // Calculate stats
        const text = markdown.trim();
        const words = text ? text.split(/\s+/).length : 0;
        setWordCount(words);
        setReadingTime(Math.ceil(words / 200)); // Approx 200 wpm
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
    handleResize(); // Init
    return () => window.removeEventListener('resize', handleResize);
  }, []); 

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- Actions ---

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMD = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Sanitize filename
    const safeName = (docName || 'document').replace(/[^a-z0-9]/gi, '-').toLowerCase();
    a.download = `${safeName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Markdown file downloaded");
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      showNotification("Markdown copied to clipboard");
    } catch (err) {
      showNotification("Failed to copy", 'error');
    }
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear the editor?")) {
      setMarkdown("");
    }
  };
  
  const handleLoadTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateName = e.target.value;
    if (!templateName) return;
    
    if (markdown.length > 50 && !window.confirm("Replace current content with template?")) {
      e.target.value = ""; // Reset
      return;
    }
    
    // @ts-ignore
    const tmpl = TEMPLATES[templateName];
    if (tmpl) setMarkdown(tmpl);
    e.target.value = "";
  };

  const insertText = (before: string, after: string = "") => {
    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.substring(start, end);
    const newText = markdown.substring(0, start) + before + selectedText + after + markdown.substring(end);
    
    setMarkdown(newText);
    
    // Defer selection update
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };
  
  const insertDateTime = () => {
    insertText(new Date().toLocaleString());
  };

  // --- Modal Logic ---

  const openLinkModal = () => {
    const textarea = textAreaRef.current;
    let selectedText = '';
    if (textarea) {
       selectedText = markdown.substring(textarea.selectionStart, textarea.selectionEnd);
    }
    setLinkData({ text: selectedText, url: '' });
    setActiveModal('link');
  };

  const confirmInsertLink = () => {
    const { text, url } = linkData;
    const linkText = text || 'Link Text';
    const linkUrl = url || '#';
    insertText(`[${linkText}]`, `(${linkUrl})`);
    setActiveModal('none');
  };

  const openTableModal = () => {
    setTableData({ rows: 3, cols: 3 });
    setActiveModal('table');
  };

  const confirmInsertTable = () => {
    const { rows, cols } = tableData;
    let header = "|";
    let divider = "|";
    
    for (let i = 1; i <= cols; i++) {
      header += ` Header ${i} |`;
      divider += ` --- |`;
    }
    
    let body = "";
    for (let r = 0; r < rows; r++) {
      body += "\n|";
      for (let c = 0; c < cols; c++) {
        body += "  |";
      }
    }
    
    insertText(`\n${header}\n${divider}${body}\n`);
    setActiveModal('none');
  };

  // --- Theme Classes ---
  const getThemeClasses = () => {
    switch(theme) {
      case 'dark': return 'bg-gray-900 text-gray-100';
      case 'midnight': return 'bg-slate-900 text-slate-100';
      default: return 'bg-white text-gray-900';
    }
  };

  const getEditorClasses = () => {
    switch(theme) {
      case 'dark': return 'bg-gray-800 text-gray-100 border-gray-700';
      case 'midnight': return 'bg-slate-800 text-slate-100 border-slate-700';
      default: return 'bg-gray-50 text-gray-900 border-gray-200';
    }
  };

  const getContainerFontClass = () => {
    switch(fontFamily) {
      case 'serif': return 'font-serif';
      case 'mono': return 'font-mono';
      default: return 'font-sans';
    }
  };

  const getContainerSizeClass = () => {
    switch(fontSize) {
      case 'sm': return 'text-size-sm';
      case 'lg': return 'text-size-lg';
      default: return 'text-size-base';
    }
  };

  // --- Render Footer ---
  const FooterComponent = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return (
      <div className="doc-footer">
        <div className="footer-badge bg-pink-50 text-pink-700 border border-pink-100 print-only">
           <span>Made with love by</span>
           <strong>NoWhile</strong>
           <Icons.Heart />
        </div>
        <div className="flex gap-2">
           <div className="footer-badge bg-blue-50 text-blue-700 border border-blue-100">
             {dateStr}
           </div>
           <div className="footer-badge bg-gray-50 text-gray-600 border border-gray-200 font-mono">
             {timeStr}
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-screen ${getThemeClasses()} transition-colors duration-300`}>
      {/* Inject Custom CSS */}
      <style dangerouslySetInnerHTML={{ __html: customCss }} />

      {/* --- HEADER --- */}
      {!isFocused && (
      <header className={`
        flex items-center justify-between px-4 py-3 border-b shrink-0 z-20 no-print
        ${theme === 'light' ? 'bg-white border-gray-200' : 'bg-gray-900 border-gray-700'}
      `}>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg text-white shadow-lg shadow-blue-500/30">
            <Icons.File />
          </div>
          <div className="flex flex-col">
            <input 
              type="text" 
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className={`text-lg font-bold tracking-tight leading-none focus:outline-none focus:border-b border-transparent transition-all w-48 sm:w-64 bg-transparent p-0.5 ${theme === 'light' ? 'focus:border-blue-500 hover:border-gray-300' : 'focus:border-blue-400 hover:border-gray-600'}`}
              placeholder="Document Name"
            />
            <p className={`text-xs font-medium mt-1 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
              Markdown to PDF Pro
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <div className={`hidden md:flex rounded-lg border p-1 ${theme === 'light' ? 'bg-gray-100 border-gray-200' : 'bg-gray-800 border-gray-700'}`}>
             <button onClick={() => setTheme('light')} className={`p-1.5 rounded-md text-xs font-medium transition-all ${theme === 'light' ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-200'}`}>Light</button>
             <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-md text-xs font-medium transition-all ${theme === 'dark' ? 'bg-gray-600 shadow text-white' : 'text-gray-500 hover:text-gray-700'}`}>Dark</button>
             <button onClick={() => setTheme('midnight')} className={`p-1.5 rounded-md text-xs font-medium transition-all ${theme === 'midnight' ? 'bg-slate-600 shadow text-white' : 'text-gray-500 hover:text-gray-700'}`}>Blue</button>
          </div>

          <div className="w-px h-6 bg-gray-300 mx-2 hidden md:block"></div>
          
          <button onClick={() => setIsFocused(true)} className="p-2 text-gray-500 hover:text-blue-500 transition-colors hidden md:block" title="Focus Mode">
            <Icons.Maximize />
          </button>

          <button onClick={handleCopyMarkdown} className="p-2 text-gray-500 hover:text-blue-500 transition-colors" title="Copy Markdown">
            <Icons.Copy />
          </button>
          <button onClick={handleDownloadMD} className="p-2 text-gray-500 hover:text-green-500 transition-colors" title="Download .md">
            <Icons.Download />
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-md transition-all active:scale-95 ml-2">
            <Icons.Print />
            <span className="hidden sm:inline">Print PDF</span>
          </button>
        </div>
      </header>
      )}

      {/* --- SECONDARY TOOLBAR (Formatting) --- */}
      {!isFocused && (
      <div className={`
        flex flex-wrap items-center justify-between px-4 py-2 border-b text-sm shrink-0 no-print gap-y-2
        ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-gray-800 border-gray-700'}
      `}>
        <div className="flex items-center gap-1 overflow-x-auto">
          {/* Headings */}
          <button onClick={() => insertText('# ')} className={`p-1.5 rounded hover:bg-black/5 font-bold w-8 text-center text-xs ${theme !== 'light' && 'text-gray-300 hover:bg-white/10'}`}>H1</button>
          <button onClick={() => insertText('## ')} className={`p-1.5 rounded hover:bg-black/5 font-bold w-8 text-center text-xs ${theme !== 'light' && 'text-gray-300 hover:bg-white/10'}`}>H2</button>
          
          <div className="w-px h-4 bg-gray-300 mx-1"></div>

          {/* Style */}
          <button onClick={() => insertText('**', '**')} className={`p-1.5 rounded hover:bg-black/5 font-bold w-8 text-center ${theme !== 'light' && 'text-gray-300 hover:bg-white/10'}`}>B</button>
          <button onClick={() => insertText('*', '*')} className={`p-1.5 rounded hover:bg-black/5 italic w-8 text-center ${theme !== 'light' && 'text-gray-300 hover:bg-white/10'}`}>I</button>
          <button onClick={() => insertText('~~', '~~')} className={`p-1.5 rounded hover:bg-black/5 line-through w-8 text-center ${theme !== 'light' && 'text-gray-300 hover:bg-white/10'}`}>S</button>
          
          <div className="w-px h-4 bg-gray-300 mx-1"></div>

          {/* Inserts */}
          <button onClick={openLinkModal} className={`p-1.5 rounded hover:bg-black/5 ${theme !== 'light' && 'text-gray-300 hover:bg-white/10'}`} title="Link"><Icons.Link /></button>
          <button onClick={() => insertText('\n---\n')} className={`p-1.5 rounded hover:bg-black/5 font-bold text-xs w-8 ${theme !== 'light' && 'text-gray-300 hover:bg-white/10'}`} title="Horizontal Rule">—</button>
          <button onClick={() => insertText('\n<div align="center">\n', '\n</div>\n')} className={`p-1.5 rounded hover:bg-black/5 ${theme !== 'light' && 'text-gray-300 hover:bg-white/10'}`} title="Center Align"><Icons.Center /></button>
          
          <div className="w-px h-4 bg-gray-300 mx-1"></div>
          
          {/* Blocks */}
          <button onClick={openTableModal} className={`p-1.5 rounded hover:bg-black/5 ${theme !== 'light' && 'text-gray-300 hover:bg-white/10'}`} title="Insert Table"><Icons.Table /></button>
          <button onClick={() => insertText('\n```javascript\n', '\n```\n')} className={`p-1.5 rounded hover:bg-black/5 ${theme !== 'light' && 'text-gray-300 hover:bg-white/10'}`} title="Code Block"><Icons.Code /></button>
          <button onClick={() => insertText('\n- [ ] ')} className={`p-1.5 rounded hover:bg-black/5 ${theme !== 'light' && 'text-gray-300 hover:bg-white/10'}`} title="Checkbox List"><Icons.List /></button>
          <button onClick={() => insertText('> ')} className={`p-1.5 rounded hover:bg-black/5 ${theme !== 'light' && 'text-gray-300 hover:bg-white/10'}`} title="Blockquote"><Icons.Quote /></button>
          
          <div className="w-px h-4 bg-gray-300 mx-1"></div>
          
          <button onClick={insertDateTime} className={`p-1.5 rounded hover:bg-black/5 ${theme !== 'light' && 'text-gray-300 hover:bg-white/10'}`} title="Insert Date/Time"><Icons.Clock /></button>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* Templates */}
          <select onChange={handleLoadTemplate} className={`text-xs p-1.5 rounded border max-w-[100px] ${theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600 text-white'}`}>
            <option value="">Templates...</option>
            <option value="resume">Resume</option>
            <option value="letter">Cover Letter</option>
            <option value="invoice">Invoice</option>
          </select>

          {/* Paper Size */}
          <div className="flex items-center gap-1 hidden sm:flex">
             <span className={`text-[10px] uppercase font-bold ${theme === 'light' ? 'text-gray-400' : 'text-gray-500'}`}>Size</span>
             <button onClick={() => setPaperSize('a4')} className={`text-xs px-2 py-1 rounded border ${paperSize === 'a4' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-transparent text-gray-500'}`}>A4</button>
             <button onClick={() => setPaperSize('letter')} className={`text-xs px-2 py-1 rounded border ${paperSize === 'letter' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-transparent text-gray-500'}`}>Let</button>
          </div>

          {/* Configs */}
          <div className="flex items-center gap-2">
            <select 
              value={fontFamily} 
              onChange={(e) => setFontFamily(e.target.value as FontFamily)}
              className={`text-xs p-1 rounded border ${theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600 text-white'}`}
            >
              <option value="sans">Sans</option>
              <option value="serif">Serif</option>
              <option value="mono">Mono</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <select 
              value={fontSize} 
              onChange={(e) => setFontSize(e.target.value as FontSize)}
              className={`text-xs p-1 rounded border ${theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-700 border-gray-600 text-white'}`}
            >
              <option value="sm">Small</option>
              <option value="base">Medium</option>
              <option value="lg">Large</option>
            </select>
          </div>

          {/* Custom CSS Button */}
          <button 
             onClick={() => setActiveModal('css')} 
             className={`p-1.5 rounded border ${theme === 'light' ? 'bg-white border-gray-300 text-gray-600 hover:text-blue-600' : 'bg-gray-700 border-gray-600 text-gray-300 hover:text-white'}`}
             title="Custom CSS"
          >
             <Icons.CodeBrackets />
          </button>

          <button onClick={handleClear} className="text-red-500 hover:text-red-600 p-1 rounded hover:bg-red-50" title="Clear All">
            <Icons.Trash />
          </button>
        </div>
      </div>
      )}

      {/* --- MAIN CONTENT (Side-by-Side) --- */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Editor Pane (Left on Desktop) */}
        <div className={`
          flex-1 flex flex-col border-r relative z-10 transition-all duration-300 no-print
          ${view === EditorView.PREVIEW ? 'hidden lg:flex' : 'flex'}
          ${getEditorClasses()}
        `}>
          <textarea
            ref={textAreaRef}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            className={`flex-1 w-full p-6 resize-none focus:outline-none bg-transparent font-mono text-sm leading-relaxed ${theme === 'light' ? 'text-gray-800' : 'text-gray-200'}`}
            placeholder="Type your markdown here..."
            spellCheck={false}
          />
          {/* Stats Bar */}
          {!isFocused && (
          <div className={`px-4 py-2 border-t text-xs flex justify-between ${theme === 'light' ? 'border-gray-200 text-gray-500' : 'border-gray-700 text-gray-400'}`}>
             <span className="flex gap-3">
               <span>{markdown.length} chars</span>
               <span>{wordCount} words</span>
             </span>
             <span>~{readingTime} min read</span>
          </div>
          )}
        </div>

        {/* Preview Pane (Right on Desktop) */}
        <div className={`
          preview-container flex-1 bg-gray-200 overflow-auto relative transition-all duration-300 p-4 lg:p-8 pb-20
          ${view === EditorView.EDIT ? 'hidden lg:block' : 'block'}
        `}>
           <div className={`
              paper-preview ${paperSize === 'a4' ? 'paper-a4' : 'paper-letter'}
              ${getContainerFontClass()} ${getContainerSizeClass()}
           `}>
              <div 
                 className="markdown-body"
                 dangerouslySetInnerHTML={{ __html: html }} 
              />
              
              {/* Dynamic Footer Auto-injected */}
              <FooterComponent />
           </div>
        </div>

        {/* Focus Mode Exit Button */}
        {isFocused && (
          <button 
            onClick={() => setIsFocused(false)}
            className="focus-mode-toggle absolute top-4 right-4 p-2 bg-gray-800 text-white rounded-full opacity-50 hover:opacity-100 transition-opacity z-50 shadow-lg"
            title="Exit Focus Mode"
          >
            <Icons.Minimize />
          </button>
        )}

        {/* Mobile Floating Action Button (View Switcher) */}
        <div className="lg:hidden absolute bottom-6 right-6 flex gap-2 no-print z-50">
          <button 
            onClick={() => setView(view === EditorView.EDIT ? EditorView.PREVIEW : EditorView.EDIT)}
            className="p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:scale-95 transition-transform"
          >
            {view === EditorView.EDIT ? <Icons.Eye /> : <Icons.Edit />}
          </button>
        </div>

      </main>

      {/* Notification Toast */}
      {notification && (
        <div className={`
          fixed bottom-6 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-xl text-sm font-medium animate-bounce-in z-50 flex items-center gap-2 no-print
          ${notification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}
        `}>
           {notification.type === 'success' ? <span>✓</span> : <span>!</span>}
           {notification.msg}
        </div>
      )}

      {/* --- UNIFIED MODALS --- */}
      {activeModal !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 print:hidden">
          <div className={`w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col ${activeModal === 'css' ? 'h-[60vh] md:h-auto' : 'h-auto'} ${theme === 'light' ? 'bg-white' : 'bg-gray-800 text-white'}`}>
            
            {/* Modal Header */}
            <div className={`p-4 border-b flex justify-between items-center ${theme === 'light' ? 'border-gray-200' : 'border-gray-700'}`}>
               <h3 className="font-bold capitalize">
                  {activeModal === 'css' ? 'Custom CSS' : `Insert ${activeModal}`}
               </h3>
               <button onClick={() => setActiveModal('none')} className="hover:opacity-70"><Icons.X /></button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex-1 flex flex-col gap-4 overflow-y-auto">
               
               {/* --- LINK MODAL --- */}
               {activeModal === 'link' && (
                 <>
                   <div>
                      <label className="block text-xs font-medium mb-1 opacity-70">Link Text</label>
                      <input 
                        type="text" 
                        value={linkData.text} 
                        onChange={e => setLinkData({...linkData, text: e.target.value})}
                        className={`w-full p-2 rounded border text-sm ${theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-900 border-gray-600'}`}
                        placeholder="e.g. Google"
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-medium mb-1 opacity-70">URL</label>
                      <input 
                        type="text" 
                        value={linkData.url} 
                        onChange={e => setLinkData({...linkData, url: e.target.value})}
                        className={`w-full p-2 rounded border text-sm ${theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-900 border-gray-600'}`}
                        placeholder="https://example.com"
                      />
                   </div>
                 </>
               )}

               {/* --- TABLE MODAL --- */}
               {activeModal === 'table' && (
                 <div className="grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-xs font-medium mb-1 opacity-70">Rows (excluding header)</label>
                      <input 
                        type="number" 
                        min="1"
                        max="20"
                        value={tableData.rows} 
                        onChange={e => setTableData({...tableData, rows: parseInt(e.target.value) || 1})}
                        className={`w-full p-2 rounded border text-sm ${theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-900 border-gray-600'}`}
                      />
                   </div>
                   <div>
                      <label className="block text-xs font-medium mb-1 opacity-70">Columns</label>
                      <input 
                        type="number" 
                        min="1"
                        max="10"
                        value={tableData.cols} 
                        onChange={e => setTableData({...tableData, cols: parseInt(e.target.value) || 1})}
                        className={`w-full p-2 rounded border text-sm ${theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-900 border-gray-600'}`}
                      />
                   </div>
                   <div className="col-span-2 text-xs opacity-60">
                     A formatted markdown table will be inserted at your cursor position.
                   </div>
                 </div>
               )}

               {/* --- CSS MODAL --- */}
               {activeModal === 'css' && (
                 <>
                   <p className={`text-xs opacity-70 mb-2 ${theme === 'light' ? 'text-gray-500' : 'text-gray-400'}`}>
                     Styles added here will apply to the preview and the printed PDF.
                     <br />Target <code>.markdown-body</code> for content specific styles.
                   </p>
                   <textarea 
                     value={customCss}
                     onChange={(e) => setCustomCss(e.target.value)}
                     className={`flex-1 w-full p-3 font-mono text-xs border rounded-md resize-none focus:ring-2 focus:ring-blue-500 outline-none min-h-[200px] ${theme === 'light' ? 'bg-gray-50 border-gray-300 text-gray-800' : 'bg-gray-900 border-gray-600 text-gray-200'}`}
                     placeholder={`.markdown-body h1 { \n  color: #2563eb; \n  text-transform: uppercase;\n}`}
                     spellCheck={false}
                   />
                 </>
               )}

            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex justify-end gap-2 ${theme === 'light' ? 'bg-gray-50 border-gray-200' : 'bg-gray-900 border-gray-700'}`}>
               <button onClick={() => setActiveModal('none')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'light' ? 'text-gray-600 hover:bg-gray-200' : 'text-gray-300 hover:bg-gray-700'}`}>
                 Cancel
               </button>
               <button 
                 onClick={() => {
                   if (activeModal === 'link') confirmInsertLink();
                   else if (activeModal === 'table') confirmInsertTable();
                   else setActiveModal('none'); // Save for CSS is implicit
                 }} 
                 className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
               >
                 {activeModal === 'css' ? 'Save & Close' : 'Insert'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
