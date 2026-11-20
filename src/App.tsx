import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Task, TaskCategory, AppSettings } from './types';
import {
  getStoredTasks,
  saveStoredTasks,
  getTodayDateString,
  getAppSettings,
  saveAppSettings,
  checkUnfinishedPreviousTasks,
  ensureAssertivePracticePlanSeeded,
  performEmergencyLocalWipe
} from './services/storage';
import {
  initGoogleTokenClient,
  triggerGoogleLogin,
  logoutGoogle,
  getStoredToken,
  getStoredGoogleUser,
  onUserProfileUpdated,
  GoogleUser,
  GOOGLE_DRIVE_FOLDER_ID
} from './services/googleAuth';
import {
  syncDriveGoalsToTasks,
  scheduleSaveTasksToDrive,
  loadTasksFromDriveFile
} from './services/googleDrive';
import { updateGoogleDocGoalStatus } from './services/googleDocs';
import { syncCalendarEventsToTasks } from './services/googleCalendar';
import { syncSuperListWithDrive } from './services/superListStorage';
import { checkUrlForMicrosoftToken, getStoredMicrosoftToken, logoutMicrosoft } from './services/microsoftAuth';
import { getSelectedToDoList, updateMicrosoftTaskStatus } from './services/microsoftToDo';
import { Header } from './components/Header';
import { DailyProcess } from './components/DailyProcess';
import { StatsView } from './components/StatsView';
import { TaskModal } from './components/TaskModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { MorningReviewModal } from './components/MorningReviewModal';
import { TaskAlertModal } from './components/TaskAlertModal';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { VoiceTaskModal } from './components/VoiceTaskModal';
import { SecurityDisconnectModal } from './components/SecurityDisconnectModal';
import { AppPrivacyShield } from './components/AppPrivacyShield';
import {
  NotificationPreferences,
  getNotificationPreferences,
  isTaskAlreadyAlerted,
  markTaskAsAlerted,
  playNotificationChime,
  sendSystemNotification
} from './services/notificationService';
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

  // Notification and Task Alerts state
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(() =>
    getNotificationPreferences()
  );
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [activeAlertTask, setActiveAlertTask] = useState<Task | null>(null);

  // Voice Task Modal state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Security, Disconnect & Emergency Wipe Modal state
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);

  const lastSyncTimeRef = useRef<number>(0);

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
      scheduleSaveTasksToDrive(GOOGLE_DRIVE_FOLDER_ID, token.access_token, updated);
    }
  }, []);

  const syncGoogleServices = useCallback(async (tokenStr?: string, silent: boolean = false) => {
    const tokenObj = tokenStr ? { access_token: tokenStr } : getStoredToken();
    if (!tokenObj) {
      if (!silent) showToast('נא להתחבר תחילה לחשבון Google', 'error');
      return;
    }

    setIsSyncing(true);
    let calendarCount = 0;
    let calendarUpdatesCount = 0;
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
          // Merge tasks: keep newer by updatedAt, respect isDeleted tombstones
          const taskMap = new Map<string, Task>();
          
          // Seed with current local tasks
          currentTasks.forEach(t => taskMap.set(t.id, t));

          // Merge each remote task
          driveStoredTasks.forEach(remoteTask => {
            const localTask = taskMap.get(remoteTask.id);
            if (!localTask) {
              if (!remoteTask.isDeleted) {
                taskMap.set(remoteTask.id, remoteTask);
              }
            } else {
              const localTime = new Date(localTask.updatedAt || 0).getTime();
              const remoteTime = new Date(remoteTask.updatedAt || 0).getTime();
              if (remoteTime > localTime) {
                taskMap.set(remoteTask.id, remoteTask);
              }
            }
          });

          mergedTasks = Array.from(taskMap.values());
        }
      } catch (driveFileErr) {
        console.warn('Drive tasks file load warning', driveFileErr);
      }

      // 2. Sync Google Calendar -> Must Do (syncs rolling multi-week window for all updates, moves & deletions)
      try {
        const calResult = await syncCalendarEventsToTasks(
          currentDate,
          tokenObj.access_token,
          mergedTasks
        );
        calendarCount = calResult.newTasks.length;
        calendarUpdatesCount = calResult.updatedTasks ? calResult.updatedTasks.length : 0;
        if (calResult.updatedTasks && calResult.updatedTasks.length > 0) {
          const updatedMap = new Map(calResult.updatedTasks.map(t => [t.id, t]));
          mergedTasks = mergedTasks.map(t => updatedMap.get(t.id) || t);
        }
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

      // 4. Sync Super List (To Do) -> Drive
      let superCount = 0;
      try {
        const superResult = await syncSuperListWithDrive(
          GOOGLE_DRIVE_FOLDER_ID,
          tokenObj.access_token
        );
        superCount = superResult.syncCount;
      } catch (superErr: any) {
        console.warn('Super list Drive sync warning:', superErr);
      }

      // Save master merged tasks locally and back to Drive
      persistTasks(mergedTasks);
      lastSyncTimeRef.current = Date.now();

      if (!silent) {
        const msgParts = [];
        if (calendarCount > 0) msgParts.push(`${calendarCount} פגישות חדשות מיומן Google`);
        if (calendarUpdatesCount > 0) msgParts.push(`${calendarUpdatesCount} פגישות שעודכנו/הוזזו מיומן Google`);
        if (driveCount > 0) msgParts.push(`${driveCount} יעדים מ-Drive`);
        if (superCount > 0) msgParts.push(`רשימת סופר (${superCount} פריטים)`);
        
        if (msgParts.length > 0) {
          showToast(`סונכרנו בהצלחה: ${msgParts.join(', ')}`, 'success');
        } else {
          showToast('הנתונים סונכרנו בהצלחה מול Google Drive!', 'success');
        }
      }
    } catch (err: any) {
      console.error('Overall Google sync error:', err);
      if (!silent) {
        showToast(err.message || 'שגיאה בסנכרון מול Google', 'error');
      }
    } finally {
      setIsSyncing(false);
    }
  }, [currentDate, persistTasks]);

  // Initialize data, theme, and Google Token Client
  useEffect(() => {
    const loadedTasks = ensureAssertivePracticePlanSeeded();
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

    // Check URL for Microsoft OAuth redirect token
    try {
      const msRedirectToken = checkUrlForMicrosoftToken();
      if (msRedirectToken) {
        showToast('התחברת בהצלחה לחשבון Microsoft!', 'success');
      }
    } catch (e) {
      console.warn('Error checking Microsoft redirect token', e);
    }

    // Subscribe to Google User Profile updates
    const unsubscribeProfile = onUserProfileUpdated((user) => {
      setGoogleUser(user);
    });

    // Setup Google Token Client & check URL hash for token from redirect
    let tokenHandled = false;
    initGoogleTokenClient(
      (token) => {
        tokenHandled = true;
        setGoogleUser(getStoredGoogleUser() || { email: 'מחובר ל-Google', name: 'משתמש Google' });
        showToast('התחברת בהצלחה לחשבון Google!', 'success');
        syncGoogleServices(token.access_token);
      },
      (err) => {
        console.error('Google login error', err);
        showToast('שגיאה בהתחברות ל-Google', 'error');
      }
    );

    // If already has stored token and wasn't just handled by URL redirect, run initial sync
    if (!tokenHandled) {
      const stored = getStoredToken();
      if (stored) {
        syncGoogleServices(stored.access_token, true);
      }
    }

    return () => {
      unsubscribeProfile();
    };
  }, [syncGoogleServices]);

  // Auto-sync when user returns to app / tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        // Sync if at least 30 seconds passed since last sync
        if (now - lastSyncTimeRef.current > 30000) {
          const stored = getStoredToken();
          if (stored) {
            syncGoogleServices(stored.access_token, true);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [syncGoogleServices]);

  // Continuous background sync: Poll for Google Calendar updates every 60 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const stored = getStoredToken();
      if (stored?.access_token) {
        syncGoogleServices(stored.access_token, true);
      }
    }, 60000);
    return () => clearInterval(timer);
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
    setIsSecurityModalOpen(true);
  };

  const handleDisconnectOnly = async () => {
    try {
      await logoutGoogle(true);
      logoutMicrosoft();
      setGoogleUser(null);
      showToast('התנתקת מ-Google וממקורות הענן (הרשאה בוטלה בשרת)', 'success');
    } catch (e: any) {
      showToast('התנתקות הושלמה מקומית', 'success');
    }
  };

  const handleEmergencyWipe = async () => {
    try {
      await logoutGoogle(true);
      logoutMicrosoft();
      performEmergencyLocalWipe();
      setTasks([]);
      setGoogleUser(null);
      showToast('כל הנתונים המקומיים נמחקו בהצלחה והסשן נותק', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e) {
      performEmergencyLocalWipe();
      window.location.reload();
    }
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

    // Sync status back to connected Google Doc if applicable
    const currentToken = getStoredToken();
    if (task.goalDocumentId && currentToken?.access_token) {
      updateGoogleDocGoalStatus(
        task.goalDocumentId,
        currentToken.access_token,
        task.title,
        nextCompleted
      ).catch(e => console.warn('Could not sync status to Google Doc:', e));
    }

    // Sync status back to Microsoft To Do if applicable
    const msToken = getStoredMicrosoftToken();
    const selectedList = getSelectedToDoList();
    if (task.id.startsWith('mstodo-') && msToken?.access_token && selectedList?.id) {
      updateMicrosoftTaskStatus(
        selectedList.id,
        task.id,
        msToken.access_token,
        nextCompleted
      ).catch(e => console.warn('Could not sync status to Microsoft To Do:', e));
    }
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

  const handleSaveVoiceTask = (taskData: {
    title: string;
    date: string;
    time?: string;
    category: 'must_do';
  }) => {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: `voice-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: taskData.title,
      category: 'must_do',
      completed: false,
      date: taskData.date,
      time: taskData.time,
      createdAt: now,
      updatedAt: now
    };
    const updated = [newTask, ...tasks];
    persistTasks(updated);
    showToast(
      `משימת Must Do קולית נוספה בהצלחה לתאריך ${taskData.date}${taskData.time ? ` בשעה ${taskData.time}` : ''}! 🎙️`,
      'success'
    );
  };

  const handleDeleteRequest = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!taskToDelete) return;
    const now = new Date().toISOString();
    // Soft-delete to ensure tombstone propagates cleanly to Google Drive without zombie resurrects
    const updated = tasks.map(t =>
      t.id === taskToDelete.id
        ? { ...t, isDeleted: true, updatedAt: now }
        : t
    );
    persistTasks(updated);
    showToast(`המשימה "${taskToDelete.title}" נמחקה בהצלחה`, 'success');
    setTaskToDelete(null);
  };

  const handleRescheduleTask = (task: Task, newDate: string) => {
    const updated = tasks.map(t =>
      t.id === task.id ? { ...t, date: newDate, updatedAt: new Date().toISOString() } : t
    );
    persistTasks(updated);
    showToast(`היעד תוזמן לתאריך ${newDate}`, 'success');
  };

  const handleSnoozeTask = (task: Task, minutes: number) => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + minutes);
    const newTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const updated = tasks.map(t =>
      t.id === task.id ? { ...t, time: newTime, updatedAt: new Date().toISOString() } : t
    );
    persistTasks(updated);
    showToast(`המשימה נדחתה ב-${minutes} דקות (לשעה ${newTime})`, 'success');
    setActiveAlertTask(null);
  };

  // Periodic Task Alert Checker (runs every 15s)
  useEffect(() => {
    if (!notificationPrefs.enabled) return;

    const checkAlerts = () => {
      const today = getTodayDateString();
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentMinutesSinceMidnight = currentHours * 60 + currentMinutes;

      // Active tasks for today that have a time and are not completed
      const eligibleTasks = tasks.filter(
        t => !t.isDeleted && !t.completed && t.date === today && t.time
      );

      for (const task of eligibleTasks) {
        if (!task.time) continue;
        const [tH, tM] = task.time.split(':').map(Number);
        if (isNaN(tH) || isNaN(tM)) continue;

        const taskMinutesSinceMidnight = tH * 60 + tM;
        const targetMinutes = taskMinutesSinceMidnight - (notificationPrefs.leadTimeMinutes || 0);

        // Check if current time has reached target time (within a 2-minute trigger window)
        if (
          currentMinutesSinceMidnight >= targetMinutes &&
          currentMinutesSinceMidnight <= targetMinutes + 2
        ) {
          if (!isTaskAlreadyAlerted(task.id, today, task.time)) {
            markTaskAsAlerted(task.id, today, task.time);

            // Play sound chime if sound enabled
            if (notificationPrefs.soundEnabled) {
              playNotificationChime();
            }

            // Show native system notification
            sendSystemNotification(
              `⏰ תזכורת: ${task.title}`,
              task.description || `השעה ${task.time} - הגיע זמן המשימה!`,
              () => {
                setActiveAlertTask(task);
              }
            );

            // Open in-app visual alert
            setActiveAlertTask(task);
            break; // Alert one task at a time
          }
        }
      }
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 15000);
    return () => clearInterval(interval);
  }, [tasks, notificationPrefs]);

  const handleTasksSynced = (newTasks: Task[], updatedTasks: Task[]) => {
    const map = new Map(tasks.map(t => [t.id, t]));
    updatedTasks.forEach(t => map.set(t.id, t));
    newTasks.forEach(t => map.set(t.id, t));
    persistTasks(Array.from(map.values()));
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

      const currentToken = getStoredToken();
      if (currentToken?.access_token) {
        tasks
          .filter(t => completedTaskIds.includes(t.id) && t.goalDocumentId)
          .forEach(t => {
            updateGoogleDocGoalStatus(
              t.goalDocumentId!,
              currentToken.access_token,
              t.title,
              true
            ).catch(() => {});
          });
      }
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

    const remainingOverdue = updated.filter(t => !t.isDeleted && !t.completed && t.date < today);
    setOverdueTasks(remainingOverdue);
    persistTasks(updated);
    setCurrentDate(today);

    const parts = [];
    if (selectedTaskIds.length > 0) parts.push(`${selectedTaskIds.length} משימות הועברו להיום`);
    if (completedTaskIds.length > 0) parts.push(`${completedTaskIds.length} סומנו כבוצעו`);
    showToast(`סקירת בוקר הושלמה בהצלחה! ${parts.join(', ')}`, 'success');
  };

  const filteredTasksForDate = tasks.filter(t => !t.isDeleted && t.date === currentDate);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200 overflow-x-hidden w-full max-w-full">
      {/* Top Header */}
      <Header
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        activeView={activeView}
        onViewChange={setActiveView}
        isDark={isDark}
        onToggleTheme={handleToggleTheme}
        onOpenAddTask={() => handleOpenAddTask('must_do')}
        overdueTasksCount={overdueTasks.length}
        onOpenMorningReview={() => setIsMorningReviewOpen(true)}
        googleUser={googleUser}
        isSyncing={isSyncing}
        onConnectGoogle={handleConnectGoogle}
        onSyncGoogle={() => syncGoogleServices()}
        onLogoutGoogle={handleLogoutGoogle}
        onOpenNotificationSettings={() => setIsNotificationSettingsOpen(true)}
        areNotificationsEnabled={notificationPrefs.enabled}
        onOpenVoiceTask={() => setIsVoiceModalOpen(true)}
        onOpenSecurityModal={() => setIsSecurityModalOpen(true)}
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
            allTasks={tasks}
            onToggleComplete={handleToggleComplete}
            onEditTask={handleEditTask}
            onDeleteRequest={handleDeleteRequest}
            onQuickAddTask={handleOpenAddTask}
            onRescheduleTask={handleRescheduleTask}
            onTasksSynced={handleTasksSynced}
            overdueTasksCount={overdueTasks.length}
            onOpenMorningReview={() => setIsMorningReviewOpen(true)}
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

      {/* Real-time Task Time Alert Modal */}
      <TaskAlertModal
        task={activeAlertTask}
        isOpen={Boolean(activeAlertTask)}
        onClose={() => setActiveAlertTask(null)}
        onToggleComplete={handleToggleComplete}
        onSnooze={handleSnoozeTask}
      />

      {/* Notification Preferences Settings Modal */}
      <NotificationSettingsModal
        isOpen={isNotificationSettingsOpen}
        preferences={notificationPrefs}
        onClose={() => setIsNotificationSettingsOpen(false)}
        onSavePreferences={(prefs) => setNotificationPrefs(prefs)}
      />

      {/* Voice Task Modal for Must Do */}
      <VoiceTaskModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onAddTask={handleSaveVoiceTask}
        currentDate={currentDate}
      />

      {/* Security, Disconnect & Emergency Local Wipe Modal */}
      <SecurityDisconnectModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        googleUser={googleUser}
        tasksCount={tasks.filter(t => !t.isDeleted).length}
        onDisconnectOnly={handleDisconnectOnly}
        onEmergencyWipe={handleEmergencyWipe}
      />

      {/* App Switcher & Background Privacy Shield */}
      <AppPrivacyShield enabled={true} />
    </div>
  );
};

export default App;
