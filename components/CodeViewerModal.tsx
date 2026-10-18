'use client';

import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Download, ExternalLink } from 'lucide-react';

export default function CodeViewerModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [code, setCode] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || code) return;

    let isMounted = true;
    const fetchCode = async () => {
      try {
        const res = await fetch('/game.html');
        const txt = await res.text();
        if (isMounted) {
          setCode(txt);
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCode();

    return () => {
      isMounted = false;
    };
  }, [isOpen, code]);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 sm:p-6">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="font-mono text-base font-bold text-slate-900">
              Standalone Single-File HTML Platformer Game
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              100% self-contained HTML5 Canvas, Web Audio API, ES6 Physics & Pixel Art. No dependencies.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <a
              href="/game.html"
              download="octo-platformer.html"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .html</span>
            </a>

            <a
              href="/game.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-medium rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
              title="Open standalone file directly in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Raw</span>
            </a>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md hover:bg-slate-200 transition-colors ml-1"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 text-slate-200 font-mono text-xs leading-relaxed select-text">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              Loading standalone code...
            </div>
          ) : (
            <pre className="whitespace-pre overflow-x-auto selection:bg-purple-900 selection:text-white">
              <code>{code}</code>
            </pre>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-2.5 bg-slate-100 border-t border-slate-200 text-xs text-slate-500 font-mono flex items-center justify-between">
          <span>Save this as any <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 text-slate-800 font-bold">.html</code> file on your computer and double-click to play offline!</span>
          <span>~800 lines · 0 external files</span>
        </div>
      </div>
    </div>
  );
}
