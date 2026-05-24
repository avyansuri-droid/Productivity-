import React, { useState, useEffect } from 'react';

let resolvePrompt: ((value: string | null) => void) | null = null;
let resolveConfirm: ((value: boolean) => void) | null = null;

export const showPrompt = (message: string, defaultValue = ''): Promise<string | null> => {
  return new Promise((resolve) => {
    resolvePrompt = resolve;
    window.dispatchEvent(new CustomEvent('app-prompt', { detail: { message, defaultValue, type: 'prompt' } }));
  });
};

export const showConfirm = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    resolveConfirm = resolve;
    window.dispatchEvent(new CustomEvent('app-prompt', { detail: { message, type: 'confirm' } }));
  });
};

export function PromptModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState<'prompt'|'confirm'>('prompt');

  useEffect(() => {
    const handlePrompt = (e: any) => {
      setMessage(e.detail.message);
      setValue(e.detail.defaultValue || '');
      setType(e.detail.type || 'prompt');
      setIsOpen(true);
    };
    window.addEventListener('app-prompt', handlePrompt);
    return () => window.removeEventListener('app-prompt', handlePrompt);
  }, []);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    if (type === 'prompt' && resolvePrompt) resolvePrompt(value);
    if (type === 'confirm' && resolveConfirm) resolveConfirm(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (type === 'prompt' && resolvePrompt) resolvePrompt(null);
    if (type === 'confirm' && resolveConfirm) resolveConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-surface-container w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 border border-outline-variant">
        <form onSubmit={handleSubmit} className="p-6">
          <h3 className="text-lg font-bold text-on-surface mb-4">{message}</h3>
          
          {type === 'prompt' && (
            <input
              autoFocus
              type="text"
              className="w-full bg-background border border-outline-variant px-4 py-3 rounded-xl text-on-surface outline-none focus:border-primary transition-colors focus:ring-2 ring-primary/20"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 rounded-lg font-bold text-sm text-on-surface-variant hover:bg-surface-variant transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              autoFocus={type === 'confirm'}
              onClick={type === 'confirm' ? handleSubmit : undefined}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
            >
              OK
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
