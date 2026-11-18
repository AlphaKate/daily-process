import React, { useState, useEffect } from 'react';
import { Task, TaskCategory, AppSettings } from './types';
import {
  getStoredTasks,
  saveStoredTasks,
  getTodayDateString,
  getAppSettings,
  saveAppSettings,
  checkUnfinishedPreviousTasks,
} from './services/storage';
import { Header } from './components/Header';
import { DailyProcess } from './components/DailyProcess';
import { StatsView } from './components/StatsView';
import { TaskModal } from './components/TaskModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { MorningReviewModal } from './components/MorningReviewModal';

export const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState<string>(getTodayDateString());
  const [activeView, setActiveView] = useState<'process' | 'stats'>('process');
  
  // Theme state
  const [settings, setSettings] = useState<AppSettings>(getAppSettings);
  const [isDark, setIsDark] = useState<boolean>(false);

  // Modals state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultCategoryForNew, setDefaultCategoryForNew] = useState<TaskCategory>('must_do');

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Morning Review / Rollover state
  const [overdueTasks, setOverdueTasks] = useState<Task[]>([]);
  const [isMorningReviewOpen, setIsMorningReviewOpen] = useState(false);

  // Initialize data and check day rollover
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
  }, []);

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
    setTasks(updated);
    saveStoredTasks(updated);
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
      // Update existing
      const updated = tasks.map(t =>
        t.id === editingTask.id
          ? {
              ...t,
              ...taskData,
              updatedAt: new Date().toISOString()
            }
          : t
      );
      setTasks(updated);
      saveStoredTasks(updated);
    } else {
      // Add new
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
      setTasks(updated);
      saveStoredTasks(updated);
    }
  };

  const handleDeleteRequest = (task: Task) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!taskToDelete) return;
    const updated = tasks.filter(t => t.id !== taskToDelete.id);
    setTasks(updated);
    saveStoredTasks(updated);
    setTaskToDelete(null);
  };

  // Morning Review Rollover
  const handleConfirmRollover = (selectedTaskIds: string[], completedTaskIds: string[]) => {
    const today = getTodayDateString();
    let updated = [...tasks];

    // Mark tasks marked as completed
    if (completedTaskIds.length > 0) {
      const now = new Date().toISOString();
      updated = updated.map(t =>
        completedTaskIds.includes(t.id)
          ? { ...t, completed: true, completedAt: now, updatedAt: now }
          : t
      );
    }

    // Rollover selected tasks to today
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

    setTasks(updated);
    saveStoredTasks(updated);
    setCurrentDate(today);
  };

  // Tasks for the selected date
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
      />

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

      {/* Morning Review Modal (Carried over tasks from previous days) */}
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
