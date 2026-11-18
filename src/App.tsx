import React, { useState, useEffect, useCallback } from 'react';
import { Task, TaskCategory, AppSettings } from './types';
import {
  getStoredTasks,
  saveStoredTasks,
  getTodayDateString,
  getAppSettings,
  saveAppSettings,
  checkUnfinishedPreviousTasks,
} from './services/storage';
import {
  initGoogleTokenClient,
  triggerGoogleLogin,
  logoutGoogle,
  getStoredToken,
  getStoredGoogleUser,
  GoogleUser,
  GOOGLE_DRIVE_FOLDER_ID
} from './services/googleAuth';
import {
  syncDriveGoalsToTasks,
  saveTasksToDriveFile,
  loadTasksFromDriveFile
} from './services/googleDrive';
import { syncCalendarEventsToTasks } from './services/googleCalendar';
import { Header } from './components/Header';
import { DailyProcess } from './components/DailyProcess';
import { StatsView } from './components/StatsView';
import { TaskModal } from './components/TaskModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { MorningReviewModal } from './components/MorningReviewModal';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState<string>(getTodayDateString());
  const [activeView, setActiveView] = useState<'process' | 'stats'>('process');
  
  // Theme state
  const [settings, setSettings] = useState<AppSettings>(getAppSettings);
  const [isDark, setIsDark] = useState<boolean>(false);

  // Google integration state
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(getStoredGoogleUser);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultCategoryForNew, setDefaultCategoryForNew] = useState<TaskCategory>('must_do');

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Morning Review / Rollover state
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [isMorningReviewOpen, setIsMorningReviewOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(prev => (prev?.message === message ? null : prev));
    }, 6000);
  };

  // Helper to persist tasks both locally and to Google Drive if connected
  const persistTasks = useCallback((updated: Task[]) => {
    setTasks(updated);
    saveStoredTasks(updated);

    const token = getStoredToken();
    if (token) {
      saveTasksToDriveFile(GOOGLE_DRIVE_FOLDER_ID, token.access_token, updated);
    }
  }, []);

  const syncGoogleServices = useCallback(async (tokenStr?: string) => {
    const tokenObj = tokenStr ? { access_token: tokenStr } : getStoredToken();
    if (!tokenObj) {
      showToast('נא להתחבר תחילה לחשבון Google', 'error');
      return;
    }

    setIsSyncing(true);
    let calendarCount = 0;
    let driveCount = 0;
    const currentTasks = getStoredTasks();
    let mergedTasks = [...currentTasks];

    try {
      // 1. Pull shared cross-device tasks file from Google Drive
      try {
        const driveStoredTasks = await loadTasksFromDriveFile(
          GOOGLE_DRIVE_FOLDER_ID,
          tokenObj.access_token
        );
        if (driveStoredTasks && driveStoredTasks.length > 0) {
          // Merge tasks: keep newer or non-existing
          const taskMap = new Map<string, Task>();
          driveStoredTasks.forEach(t => taskMap.set(t.id, t));
          mergedTasks.forEach(t => {
            const existing = taskMap.get(t.id);
            if (!existing || (t.updatedAt && existing.updatedAt && t.updatedAt > existing.updatedAt)) {
              taskMap.set(t.id, t);
            }
          });
          mergedTasks = Array.from(taskMap.values());
        }
      } catch (driveFileErr) {
        console.warn('Drive tasks file load warning', driveFileErr);
      }

      // 2. Sync Google Calendar -> Must Do
      try {
        const calResult = await syncCalendarEventsToTasks(
          currentDate,
          tokenObj.access_token,
          mergedTasks
        );
        calendarCount = calResult.newTasks.length;
        if (calResult.newTasks.length > 0) {
          mergedTasks = [...calResult.newTasks, ...mergedTasks];
        }
      } catch (calErr: any) {
        console.warn('Google Calendar sync warning:', calErr);
      }

      // 3. Sync Google Drive Goals -> Goals
      try {
        const driveResult = await syncDriveGoalsToTasks(
          GOOGLE_DRIVE_FOLDER_ID,
          tokenObj.access_token,
          mergedTasks,
          currentDate
        );
        driveCount = driveResult.newTasks.length;
        if (driveResult.newTasks.length > 0) {
          mergedTasks = [...driveResult.newTasks, ...mergedTasks];
        }
      } catch (driveErr: any) {
        console.warn('Google Drive sync warning:', driveErr);
      }

      // Save master merged tasks locally and back to Drive
      persistTasks(mergedTasks);

      const msgParts = [];
      if (calendarCount > 0) msgParts.push(`${calendarCount} פגישות מיומן Google`);
      if (driveCount > 0) msgParts.push(`${driveCount} יעדים מ-Drive`);
      
      if (msgParts.length > 0) {
        showToast(`סונכרנו בהצלחה: ${msgParts.join(', ')}`, 'success');
      } else {
        showToast('הנתונים סונכרנו בהצלחה מול Google Drive!', 'success');
      }
    } catch (err: any) {
      console.error('Overall Google sync error:', err);
      showToast(err.message || 'שגיאה בסנכרון מול Google', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [currentDate, persistTasks]);

  // Initialize data, theme, and Google Token Client
  useEffect(() => {
    const loadedTasks = getStoredTasks();
    setTasks(loadedTasks);

    // Dark mode initialization
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDark = settings.theme === 'dark' || (settings.theme === 'system' && prefersDark);
    setIsDark(initialDark);
    if (initialDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Check if new day opened and overdue tasks exist
    const today = getTodayDateString();
    const overdue = checkUnfinishedPreviousTasks(today);
    if (overdue.length > 0) {
      setOverdueTasks(overdue);
      setIsMorningReviewOpen(true);
    }

    // Update last active date
    const updatedSettings: AppSettings = {
      ...settings,
      lastActiveDate: today
    };
    setSettings(updatedSettings);
    saveAppSettings(updatedSettings);

    // Setup Google Token Client
    initGoogleTokenClient(
      (token) => {
        setGoogleUser(getStoredGoogleUser() || { email: 'מחובר ל-Google', name: 'משתמש Google' });
        showToast('התחברת בהצלחה לחשבון Google!', 'success');
        syncGoogleServices(token.access_token);
      },
      (err) => {
        console.error('Google login error', err);
        showToast('שגיאה בהתחברות ל-Google', 'error');
      }
    );

    // If already has stored token, run initial sync
    const stored = getStoredToken();
    if (stored) {
      syncGoogleServices(stored.access_token);
    }
  }, [syncGoogleServices]);

  const handleToggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    const updatedSettings: AppSettings = {
      ...settings,
      theme: nextDark ? 'dark' : 'light'
    };
    setSettings(updatedSettings);
    saveAppSettings(updatedSettings);
  };

  const handleConnectGoogle = () => {
    try {
      triggerGoogleLogin(
        (token) => {
          setGoogleUser(getStoredGoogleUser() || { email: 'מחובר ל-Google', name: 'משתמש Google' });
          showToast('התחברת בהצלחה לחשבון Google!', 'success');
          syncGoogleServices(token.access_token);
        },
        (err) => {
          console.error('Google login error', err);
          showToast('שגיאה בהתחברות ל-Google', 'error');
        }
      );
    } catch (err: any) {
      console.error('Login initiation failed', err);
      showToast(err.message || 'שגיאה בהתחברות ל-Google', 'error');
    }
  };

  const handleLogoutGoogle = () => {
    logoutGoogle();
    setGoogleUser(null);
    showToast('התנתקת מחשבון Google', 'success');
  };

  // Task actions
  const handleToggleComplete = (task: Task) => {
    const nextCompleted = !task.completed;
    const updated = tasks.map(t =>
      t.id === task.id
        ? {
            ...t,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
            updatedAt: new Date().toISOString()
          }
        : t
    );
    persistTasks(updated);
  };

  const handleOpenAddTask = (category: TaskCategory = 'must_do') => {
    setEditingTask(null);
    setDefaultCategoryForNew(category);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (taskData: Partial<Task>) => {
    if (editingTask) {
      const updated = tasks.map(t =>
        t.id === editingTask.id
          ? {
              ...t,
              ...taskData,
              updatedAt: new Date().toISOString()
            }
          : t
      );
      persistTasks(updated);
    } else {
      const now = new Date().toISOString();
      const newTask: Task = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        title: taskData.title || '',
        description: taskData.description,
        category: taskData.category || defaultCategoryForNew,
        completed: false,
        date: taskData.date || currentDate,
        time: taskData.time,
        durationMinutes: taskData.durationMinutes,
        milestoneTitle: taskData.milestoneTitle,
        link: taskData.link,
        createdAt: now,
        updatedAt: now
      };
      const updated = [newTask, ...tasks];
      persistTasks(updated);
    }
  };

  const handleDeleteRequest = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!taskToDelete) return;
    const updated = tasks.filter(t => t.id !== taskToDelete.id);
    persistTasks(updated);
    setTaskToDelete(null);
  };

  // Morning Review Rollover
  const handleConfirmRollover = (selectedTaskIds: string[], completedTaskIds: string[]) => {
    const today = getTodayDateString();
    let updated = [...tasks];

    if (completedTaskIds.length > 0) {
      const now = new Date().toISOString();
      updated = updated.map(t =>
        completedTaskIds.includes(t.id)
          ? { ...t, completed: true, completedAt: now, updatedAt: now }
          : t
      );
    }

    if (selectedTaskIds.length > 0) {
      updated = updated.map(t =>
        selectedTaskIds.includes(t.id)
          ? {
              ...t,
              rolledOverFrom: t.rolledOverFrom || t.date,
              date: today,
              updatedAt: new Date().toISOString()
            }
          : t
      );
    }

    persistTasks(updated);
    setCurrentDate(today);
  };

  const filteredTasksForDate = tasks.filter(t => t.date === currentDate);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <Header
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        activeView={activeView}
        onViewChange={setActiveView}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        onOpenAddTask={() => handleOpenAddTask('must_do')}
        googleUser={googleUser}
        isSyncing={isSyncing}
        onConnectGoogle={handleConnectGoogle}
        onSyncGoogle={() => syncGoogleServices()}
        onLogoutGoogle={handleLogoutGoogle}
      />

      {/* Floating Notification Toast */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[92%] animate-in slide-in-from-top duration-300">
          <div
            className={`p-3.5 rounded-2xl shadow-xl border flex items-center justify-between gap-3 text-xs font-semibold ${
              notification.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-900/20'
                : 'bg-rose-600 text-white border-rose-500 shadow-rose-900/20'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-5">
        {activeView === 'process' ? (
          <DailyProcess
            tasks={filteredTasksForDate}
            currentDate={currentDate}
            onToggleComplete={handleToggleComplete}
            onEditTask={handleEditTask}
            onDeleteRequest={handleDeleteRequest}
            onQuickAddTask={handleOpenAddTask}
          />
        ) : (
          <StatsView
            tasks={tasks}
            currentDate={currentDate}
          />
        )}
      </main>

      {/* Add / Edit Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        initialTask={editingTask}
        defaultDate={currentDate}
        defaultCategory={defaultCategoryForNew}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
      />

      {/* Safe Delete Confirmation Modal */}
      <DeleteConfirmModal
        task={taskToDelete}
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      {/* Morning Review Modal */}
      <MorningReviewModal
        isOpen={isMorningReviewOpen}
        overdueTasks={overdueTasks}
        todayDate={getTodayDateString()}
        onConfirmRollover={handleConfirmRollover}
        onClose={() => setIsMorningReviewOpen(false)}
      />
    </div>
  );
};

export default App;
