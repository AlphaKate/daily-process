import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Check,
  Trash2,
  RefreshCw,
  ExternalLink,
  ListTodo,
  ArrowDownToLine,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  SuperListItem,
  getSuperListItems,
  addSuperListItem,
  toggleSuperListItem,
  deleteSuperListItem,
  importSuperItemToCasual,
  syncSuperListWithDrive,
  SUPER_LIST_INVITE_URL
} from '../services/superListStorage';
import { getStoredToken, getStoredDriveFolderId } from '../services/googleAuth';

interface SuperListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemImported?: (title: string) => void;
  currentDate?: string;
}

export const SuperListModal: React.FC<SuperListModalProps> = ({
  isOpen,
  onClose,
  onItemImported,
  currentDate
}) => {
  const [items, setItems] = useState<SuperListItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const loadItems = () => {
    const loaded = getSuperListItems();
    setItems(loaded);
  };

  useEffect(() => {
    if (isOpen) {
      loadItems();
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    addSuperListItem(newItemText.trim());
    setNewItemText('');
    loadItems();
  };

  const handleToggle = (id: string) => {
    const updated = toggleSuperListItem(id);
    setItems(updated);
  };

  const handleDelete = (id: string) => {
    const updated = deleteSuperListItem(id);
    setItems(updated);
  };

  const handleImport = (item: SuperListItem) => {
    importSuperItemToCasual(item, currentDate);
    onItemImported?.(item.text);
    setStatusMessage({
      text: `הפריט "${item.text}" נוסף לרשימת הסידורים של היום!`,
      type: 'success'
    });
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      const token = getStoredToken();
      const driveFolderId = getStoredDriveFolderId();
      if (!token?.access_token || !driveFolderId) {
        // Local refresh
        loadItems();
        setStatusMessage({
          text: !driveFolderId && token?.access_token
            ? 'הרשימה המקומית רועננה (הגדירי תיקיית Drive ב-⚙️ לסנכרון ענן)'
            : 'הרשימה המקומית רועננה (חברי Google Drive לסנכרון ענן בין מכשירים)',
          type: 'info'
        });
      } else {
        const res = await syncSuperListWithDrive(driveFolderId, token.access_token);
        setItems(res.items);
        setStatusMessage({
          text: `סונכרן בהצלחה מול הענן! (${res.items.length} פריטים)`,
          type: 'success'
        });
      }
    } catch (err: any) {
      console.warn('Sync failed:', err);
      setStatusMessage({
        text: 'שגיאה בסנכרון מול הענן',
        type: 'error'
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const activeItems = items.filter(i => !i.completed);
  const completedItems = items.filter(i => i.completed);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-800">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  רשימת "סופר" (To Do)
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300">
                  {items.length} פריטים
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                רשימת קניות וסידורים - זמינה ישירות ללא צורך בהתחברות
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alert Banner if any */}
        {statusMessage && (
          <div
            className={`px-4 py-2 text-xs flex items-center justify-between gap-2 border-b transition-colors ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                : 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200 border-sky-200 dark:border-sky-800'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)}>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick Add Form */}
        <form onSubmit={handleAddItem} className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/50">
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="הוסף פריט חדש לרשימת סופר..."
              className="flex-1 px-3.5 py-2 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={!newItemText.trim()}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>הוסף</span>
            </button>
          </div>
        </form>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100 dark:divide-slate-800">
          {/* Active Items */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              לקנות / לעשות ({activeItems.length})
            </div>
            {activeItems.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-3 italic">
                אין פריטים פתוחים ברשימה
              </div>
            ) : (
              activeItems.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-slate-50/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs sm:text-sm group hover:border-sky-300 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      onClick={() => handleToggle(item.id)}
                      className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 hover:border-sky-500 flex items-center justify-center shrink-0 transition-colors"
                      title="סמן כבוצע"
                    >
                      {item.completed && <Check className="w-3 h-3 text-sky-600" />}
                    </button>
                    <span className="truncate text-slate-800 dark:text-slate-200 font-medium">
                      {item.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleImport(item)}
                      className="p-1 px-2 text-[11px] text-sky-700 dark:text-sky-300 bg-sky-100/70 hover:bg-sky-200/80 dark:bg-sky-950 dark:hover:bg-sky-900 rounded-lg flex items-center gap-1 font-semibold transition-colors"
                      title="ייבא כסידור לרשימת היום"
                    >
                      <ArrowDownToLine className="w-3 h-3" />
                      <span>להיום</span>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="מחק פריט"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Completed Items */}
          {completedItems.length > 0 && (
            <div className="space-y-1.5 pt-3">
              <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                הושלמו ({completedItems.length})
              </div>
              {completedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 bg-slate-50/40 dark:bg-slate-850/40 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <button
                      onClick={() => handleToggle(item.id)}
                      className="w-4 h-4 rounded bg-sky-500 border-sky-500 text-white flex items-center justify-center shrink-0"
                      title="החזר לפעיל"
                    >
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </button>
                    <span className="truncate text-slate-400 line-through">
                      {item.text}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                    title="מחק"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Actions: Sync & External Link */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between gap-2 flex-wrap">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs"
            title="סנכרן את רשימת סופר כעת"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'מסנכרן...' : 'סנכרן עכשיו'}</span>
          </button>

          <a
            href={SUPER_LIST_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium"
            title="פתח ברשימה המשותפת באפליקציית Microsoft To Do"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>פתח ב-Microsoft To Do</span>
          </a>
        </div>
      </div>
    </div>
  );
};
