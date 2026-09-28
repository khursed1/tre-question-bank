"use client";

import { useRef } from "react";
import { Code, Bold, Italic, Calculator, Wand2 } from "lucide-react";

interface Props {
  value: string;
  onChange: (val: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function MarkdownTextarea({ value, onChange, rows = 3, placeholder, className = "", required }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const formatText = (prefix: string, suffix: string, defaultText: string = "", replacementOverride: string | null = null) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    const replacement = replacementOverride !== null 
      ? `${prefix}${replacementOverride}${suffix}` 
      : (selectedText ? `${prefix}${selectedText}${suffix}` : `${prefix}${defaultText}${suffix}`);
    
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      const newStart = start + prefix.length;
      const newEnd = replacementOverride !== null ? newStart + replacementOverride.length : (end > start ? end + prefix.length : newStart + defaultText.length);
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  };

  const handleFormatCode = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const selectedText = value.substring(textarea.selectionStart, textarea.selectionEnd);
    if (selectedText.includes('\n')) {
      formatText('\n```\n', '\n```\n', 'code');
    } else {
      formatText('`', '`', 'code');
    }
  };

  const handleBeautify = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    let selectedText = value.substring(textarea.selectionStart, textarea.selectionEnd);
    if (!selectedText) {
      alert("Please select some code to beautify first!");
      return;
    }

    // Generic indentation fixer
    let indent = 0;
    const lines = selectedText.split('\n');
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) {
        if (i > 0 && result[result.length - 1] !== '') result.push('');
        continue;
      }
      
      // Decrease indent if line starts with closing bracket
      if (line.match(/^[\}\]\)]/)) {
        indent = Math.max(0, indent - 1);
      }
      
      result.push('  '.repeat(indent) + line);
      
      const openBrackets = (line.match(/[\{\[\(]/g) || []).length;
      const closeBrackets = (line.match(/[\}\]\)]/g) || []).length;
      
      indent = Math.max(0, indent + openBrackets - closeBrackets);
    }
    
    const beautified = result.join('\n');
    // If it's already wrapped in backticks, don't double wrap it. Otherwise wrap it.
    if (beautified.startsWith('```') && beautified.endsWith('```')) {
       formatText('', '', '', beautified);
    } else {
       formatText('\n```\n', '\n```\n', '', beautified);
    }
  };

  return (
    <div className={`relative border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white overflow-hidden ${className}`}>
      <div className="flex items-center gap-1 p-1.5 border-b border-gray-200 bg-gray-50">
        <button type="button" onClick={() => formatText('**', '**', 'bold text')} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors" title="Bold">
          <Bold size={15} />
        </button>
        <button type="button" onClick={() => formatText('*', '*', 'italic text')} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors" title="Italic">
          <Italic size={15} />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1"></div>
        <button type="button" onClick={handleFormatCode} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors" title="Code Block">
          <Code size={15} />
        </button>
        <button type="button" onClick={handleBeautify} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors" title="Auto Beautify Code">
          <Wand2 size={15} />
        </button>
        <button type="button" onClick={() => formatText('$', '$', 'math')} className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors" title="Math Formula">
          <Calculator size={15} />
        </button>
      </div>
      <textarea
        ref={textareaRef}
        required={required}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 outline-none resize-y min-h-[60px] bg-transparent text-gray-900 block"
      />
    </div>
  );
}
