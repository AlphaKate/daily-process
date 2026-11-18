import React, { useState, useEffect } from 'react';
import { Task, TaskCategory } from '../types';
import { X, Link as LinkIcon, Milestone, AlertCircle } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  initialTask?: Task | null;
  defaultDate: string;
  defaultCategory?: TaskCategory;
  onClose: () => void;
  onSave: (taskData: Partial<Task>) => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  initialTask,
  defaultDate,
  defaultCategory = 'must_do',
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>(defaultCategory);
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<string>('');
  const [milestoneTitle, setMilestoneTitle] = useState('');
  const [link, setLink] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description || '');
      setCategory(initialTask.category);
      setDate(initialTask.date);
      setTime(initialTask.time || '');
      setDurationMinutes(initialTask.durationMinutes ? String(initialTask.durationMinutes) : '');
      setMilestoneTitle(initialTask.milestoneTitle || '');
      setLink(initialTask.link || '');
    } else {
      setTitle('');
      setDescription('');
      setCategory(defaultCategory);
      setDate(defaultDate);
      setTime('');
      setDurationMinutes('');
      setMilestoneTitle('');
      setLink('');
    }
    setError('');
  }, [initialTask, isOpen, defaultDate, defaultCategory]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('נא להזין כותרת למשימה');
      return;
    }

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      date,
      time: time || undefined,
      durationMinutes: durationMinutes ? Number(durationMinutes) : undefined,
      milestoneTitle: milestoneTitle.trim() || undefined,
      link: link.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {initialTask ? 'עריכת משימה' : 'הוספת משימה חדשה'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              רמת משימה (קטגוריה)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCategory('must_do')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  category === 'must_do'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                🔴 Must Do
              </button>
              <button
                type="button"
                onClick={() => setCategory('goals')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  category === 'goals'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                🟢 Goals (יעדים)
              </button>
              <button
                type="button"
                onClick={() => setCategory('casual')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                  category === 'casual'
                    ? 'bg-sky-50 border-sky-500 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                🔵 Casual (שוטף)
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              כותרת המשימה *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="לדוגמה: למידת פרק 3, פגישת בוקר, להזמין תור..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 dark:text-white"
              autoFocus
            />
          </div>

          {/* Milestone for Goals */}
          {category === 'goals' && (
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3.5 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/50 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <Milestone className="w-4 h-4" />
                <span>שיוך לאבן דרך בהתפתחות האישית</span>
              </div>
              <input
                type="text"
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                placeholder="למשל: שיפור כושר גופני, סיום קורס פייתון, קריאת ספר..."
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* Time, Duration & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                תאריך
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                שעה (אופציונלי)
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                משך זמן בדקות
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  step="5"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  placeholder="למשל: 30"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Link */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              לינק למסמך / קישור רלוונטי
            </label>
            <div className="relative">
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full px-3 py-2 pl-8 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none"
              />
              <LinkIcon className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              תיאור או הערות נוספות
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="פירוט המשימה, דגשים חשובים..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none"
            />
          </div>

          {/* Submit buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-md shadow-emerald-600/25 transition-all"
            >
              {initialTask ? 'שמור שינויים' : 'הוסף משימה'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
