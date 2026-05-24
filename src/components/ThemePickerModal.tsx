import { X, Check } from 'lucide-react';
import { useTheme } from '../lib/useTheme';
import { cn } from '../lib/utils';

export default function ThemePickerModal({ onClose }: { onClose: () => void }) {
  const { activeThemeId, setActiveThemeId, themes } = useTheme();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-background max-w-5xl w-full max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-outline-variant animate-in fade-in zoom-in-95 p-8 flex flex-col">
        <div className="flex justify-between items-center mb-8 shrink-0">
          <div>
            <h2 className="text-3xl font-bold text-on-surface">Themes</h2>
            <p className="text-on-surface-variant font-medium mt-2">Personalize your workspace experience.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-surface-container rounded-full transition-colors">
            <X className="w-6 h-6 text-on-surface" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {themes.map(theme => (
            <div 
              key={theme.id}
              onClick={() => setActiveThemeId(theme.id)}
              className={cn(
                "group cursor-pointer rounded-2xl overflow-hidden border-2 transition-all hover:scale-[1.02]",
                activeThemeId === theme.id ? "border-primary" : "border-outline-variant hover:border-outline"
              )}
            >
              <div className="aspect-[4/5] p-4 flex flex-col gap-3" style={{ backgroundColor: theme.colors.bg }}>
                {/* Mockup UI Sidebar + Content */}
                <div className="flex gap-3 h-full">
                  <div className="w-1/3 rounded-lg" style={{ backgroundColor: theme.colors.bg2 }} />
                  <div className="w-2/3 h-full flex flex-col gap-3">
                    <div className="h-10 rounded-lg shrink-0" style={{ backgroundColor: theme.colors.bg3 }} />
                    <div className="h-full rounded-lg" style={{ backgroundColor: theme.colors.bg2 }}>
                      <div className="p-3">
                        <div className="w-12 h-3 rounded-full mb-3" style={{ backgroundColor: theme.colors.accent }} />
                        <div className="w-full h-2 rounded-full opacity-50" style={{ backgroundColor: theme.colors['text-variant'] }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-surface-container flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-sm text-on-surface">{theme.name}</h4>
                  <p className="text-[10px] text-on-surface-variant mt-1 leading-tight">{theme.description}</p>
                </div>
                {activeThemeId === theme.id && (
                  <div className="bg-primary text-on-primary w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" strokeWidth={3} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
