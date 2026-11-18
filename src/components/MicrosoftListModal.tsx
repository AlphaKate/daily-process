import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  ListTodo,
  Settings2,
  RefreshCw,
  LogIn,
  LogOut,
  FolderCheck,
  ShieldCheck,
  KeyRound
} from 'lucide-react';
import {
  fetchToDoLists,
  getSelectedToDoList,
  saveSelectedToDoList,
  MicrosoftToDoList,
  SelectedToDoList
} from '../services/microsoftToDo';
import {
  getStoredMicrosoftToken,
  getStoredMicrosoftUser,
  triggerMicrosoftLogin,
  logoutMicrosoft,
  getStoredMicrosoftClientId,
  saveMicrosoftClientId,
  DEFAULT_MICROSOFT_CLIENT_ID,
  MicrosoftUser
} from '../services/microsoftAuth';

interface MicrosoftListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onListSelected?: (list: SelectedToDoList) => void;
  onSyncRequested?: (list: SelectedToDoList) => void;
}

export const MicrosoftListModal: React.FC<MicrosoftListModalProps> = ({
  isOpen,
  onClose,
  onListSelected,
  onSyncRequested,
}) => {
  const [lists, setLists] = useState<MicrosoftToDoList[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<SelectedToDoList | null>(getSelectedToDoList());
  const [user, setUser] = useState<MicrosoftUser | null>(getStoredMicrosoftUser());
  
  // Custom Client ID settings
  const [showConfig, setShowConfig] = useState(false);
  const [customClientId, setCustomClientId] = useState(getStoredMicrosoftClientId());
  const [clientIdSavedSuccess, setClientIdSavedSuccess] = useState(false);

  const loadLists = async () => {
    const token = getStoredMicrosoftToken();
    if (!token?.access_token) {
      setLists([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const fetched = await fetchToDoLists(token.access_token);
      setLists(fetched);

      // Auto-select first list if nothing selected yet and lists exist
      const currentSelected = getSelectedToDoList();
      if (!currentSelected && fetched.length > 0) {
        const defaultList = fetched.find(l => l.wellknownListName === 'defaultList') || fetched[0];
        const newSel: SelectedToDoList = { id: defaultList.id, name: defaultList.displayName };
        setSelectedList(newSel);
        saveSelectedToDoList(newSel);
        onListSelected?.(newSel);
      } else if (currentSelected) {
        setSelectedList(currentSelected);
      }
    } catch (err: any) {
      console.error('Failed to load To Do lists:', err);
      setError('שגיאה בטעינת רשימות Microsoft To Do');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setUser(getStoredMicrosoftUser());
      setSelectedList(getSelectedToDoList());
      setCustomClientId(getStoredMicrosoftClientId());
      loadLists();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelect = (list: MicrosoftToDoList) => {
    const newSelected: SelectedToDoList = { id: list.id, name: list.displayName };
    setSelectedList(newSelected);
    saveSelectedToDoList(newSelected);
    onListSelected?.(newSelected);
  };

  const handleSaveAndSync = () => {
    if (selectedList) {
      saveSelectedToDoList(selectedList);
      onListSelected?.(selectedList);
      onSyncRequested?.(selectedList);
    }
    onClose();
  };

  const handleLogin = () => {
    triggerMicrosoftLogin();
  };

  const handleLogout = () => {
    logoutMicrosoft();
    setUser(null);
    setLists([]);
    setSelectedList(null);
  };

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    saveMicrosoftClientId(customClientId);
    setClientIdSavedSuccess(true);
    setTimeout(() => setClientIdSavedSuccess(false), 2500);
  };

  const handleResetClientId = () => {
    saveMicrosoftClientId(DEFAULT_MICROSOFT_CLIENT_ID);
    setCustomClientId(DEFAULT_MICROSOFT_CLIENT_ID);
    setClientIdSavedSuccess(true);
    setTimeout(() => setClientIdSavedSuccess(false), 2500);
  };

  const isConnected = Boolean(getStoredMicrosoftToken() && user);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-400 flex items-center justify-center border border-sky-100 dark:border-sky-800">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>רשימת Microsoft To Do</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300">
                  Casual
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                בחירת הרשימה שתסתנכרן ישירות עם קטגוריית הסידורים השוטפים
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Connection Status Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-3 h-3 rounded-full shrink-0 ${
                  isConnected ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {isConnected ? (user?.name || 'משתמש Microsoft מחובר') : 'לא מחובר לחשבון Microsoft'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {isConnected ? (user?.email || 'Tasks.ReadWrite') : 'התחבר/י כדי לבחור רשימות ולסנכרן'}
                </p>
              </div>
            </div>

            {isConnected ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={loadLists}
                  disabled={isLoading}
                  className="p-1.5 text-slate-500 hover:text-sky-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="רענן רשימות"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
                  title="התנתק מחשבון Microsoft"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">התנתק</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLogin}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>התחבר עכשיו</span>
              </button>
            )}
          </div>

          {/* List Selection Area */}
          {isConnected && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span>רשימות זמינות ({lists.length}):</span>
                {selectedList && (
                  <span className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1">
                    <FolderCheck className="w-3.5 h-3.5" />
                    נבחרה: {selectedList.name}
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-sky-500" />
                  <span>טוען רשימות מ-Microsoft To Do...</span>
                </div>
              ) : error ? (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs text-center border border-rose-200 dark:border-rose-800">
                  {error}
                </div>
              ) : lists.length === 0 ? (
                <div className="py-6 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                  לא נמצאו רשימות בחשבון זה.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                  {lists.map(list => {
                    const isSelected = selectedList?.id === list.id;
                    return (
                      <button
                        key={list.id}
                        type="button"
                        onClick={() => handleSelect(list)}
                        className={`w-full text-right p-3 rounded-xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-400 dark:border-sky-600 text-sky-900 dark:text-sky-100 shadow-2xs font-semibold'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all ${
                              isSelected
                                ? 'border-sky-500 bg-sky-500 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <span className="truncate text-xs sm:text-sm">{list.displayName}</span>
                          {list.wellknownListName === 'defaultList' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                              ברירת מחדל
                            </span>
                          )}
                        </div>

                        {isSelected && (
                          <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">
                            מסונכרן
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Configurable Client ID Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowConfig(prev => !prev)}
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 flex items-center gap-1.5 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>הגדרות מתקדמות (Microsoft App Client ID)</span>
            </button>

            {showConfig && (
              <form onSubmit={handleSaveClientId} className="mt-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2.5 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                  <KeyRound className="w-3.5 h-3.5 text-sky-500" />
                  <span>Microsoft Application (Client) ID</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  אם ברצונך להשתמש ב-App Registration משלך ב-Azure Portal, באפשרותך להגדיר כאן מזהה לקוח ייעודי (נדרשת הרשאת Tasks.ReadWrite).
                </p>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customClientId}
                    onChange={(e) => setCustomClientId(e.target.value)}
                    dir="ltr"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="flex-1 px-3 py-1.5 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition-colors active:scale-95"
                  >
                    שמור
                  </button>
                  <button
                    type="button"
                    onClick={handleResetClientId}
                    className="px-2.5 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    title="שחזר ברירת מחדל"
                  >
                    איפוס
                  </button>
                </div>

                {clientIdSavedSuccess && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>מזהה הלקוח נשמר בהצלחה</span>
                  </p>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/60 rounded-xl transition-colors"
          >
            סגור
          </button>

          {isConnected && selectedList && (
            <button
              type="button"
              onClick={handleSaveAndSync}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md shadow-sky-600/20 transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>סנכרן רשימה זו ({selectedList.name})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
