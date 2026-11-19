import React, { useState } from 'react';
import { Task } from '../types';
import {
  X,
  Brain,
  Plus,
  Trash2,
  ExternalLink,
  Edit2,
  Check,
  ArrowDownToLine,
  BookOpen,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  LearningNotebook,
  NotebookStage,
  getStoredNotebooks,
  addLearningNotebook,
  updateLearningNotebook,
  deleteLearningNotebook,
  parseRawStagesText
} from '../services/notebookStorage';

interface NotebookManagerModalProps {
  isOpen: boolean;
  currentDate: string;
  allTasks: Task[];
  onClose: () => void;
  onScheduleStage: (task: Task) => void;
}

export const NotebookManagerModal: React.FC<NotebookManagerModalProps> = ({
  isOpen,
  currentDate,
  allTasks,
  onClose,
  onScheduleStage,
}) => {
  const [notebooks, setNotebooks] = useState<LearningNotebook[]>(() => getStoredNotebooks());
  const [activeTab, setActiveTab] = useState<'list' | 'view_edit' | 'add'>('list');
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>(() => {
    const list = getStoredNotebooks();
    return list.length > 0 ? list[0].id : '';
  });

  // Add Notebook Form State
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newMilestone, setNewMilestone] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [rawStagesInput, setRawStagesInput] = useState('');
  const [newManualStages, setNewManualStages] = useState<NotebookStage[]>([]);

  // Edit Stage State
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editStageTitle, setEditStageTitle] = useState('');
  const [editStageDesc, setEditStageDesc] = useState('');
  const [editStageDuration, setEditStageDuration] = useState<number>(20);

  // New stage inside current notebook
  const [newStageText, setNewStageText] = useState('');
  const [newStageDuration, setNewStageDuration] = useState<number>(20);

  if (!isOpen) return null;

  const selectedNotebook = notebooks.find(n => n.id === selectedNotebookId) || notebooks[0];

  // Refresh local list from storage
  const refreshNotebooks = () => {
    const fresh = getStoredNotebooks();
    setNotebooks(fresh);
  };

  // Check if a stage is already scheduled for today
  const isStageScheduledForDate = (stageTitle: string, date: string): boolean => {
    return allTasks.some(
      t => !t.isDeleted && t.date === date && t.title.trim().toLowerCase() === stageTitle.trim().toLowerCase()
    );
  };

  // Check if a stage has been completed anywhere
  const isStageCompleted = (stageTitle: string): boolean => {
    return allTasks.some(
      t => !t.isDeleted && t.completed && t.title.trim().toLowerCase() === stageTitle.trim().toLowerCase()
    );
  };

  // Quick schedule a stage onto a date
  const handleScheduleStage = (notebook: LearningNotebook, stage: NotebookStage, targetDate: string) => {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: `nb-task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: stage.title,
      description: stage.description,
      category: 'goals',
      completed: false,
      date: targetDate,
      durationMinutes: stage.durationMinutes || 20,
      milestoneTitle: notebook.milestoneTitle || notebook.title,
      link: notebook.url,
      createdAt: now,
      updatedAt: now
    };

    onScheduleStage(newTask);
  };

  // Add New Notebook submit
  const handleCreateNotebook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    let finalStages = newManualStages;
    if (rawStagesInput.trim()) {
      const parsed = parseRawStagesText(rawStagesInput.trim());
      finalStages = [...finalStages, ...parsed];
    }

    if (finalStages.length === 0) {
      finalStages = [
        {
          id: `stg-1-${Date.now()}`,
          title: 'שלב 1: היכרות עם נושא הלמידה וסקירת חומרים',
          description: `מתוך מחברת ${newTitle.trim()}`,
          durationMinutes: 20
        }
      ];
    }

    const created = addLearningNotebook({
      title: newTitle.trim(),
      url: newUrl.trim() || 'https://notebooklm.google.com/',
      milestoneTitle: newMilestone.trim() || `${newTitle.trim()} (GoogleLM)`,
      description: newDescription.trim() || undefined,
      stages: finalStages
    });

    refreshNotebooks();
    setSelectedNotebookId(created.id);
    setActiveTab('view_edit');

    // Reset Form
    setNewTitle('');
    setNewUrl('');
    setNewMilestone('');
    setNewDescription('');
    setRawStagesInput('');
    setNewManualStages([]);
  };

  // Add stage to existing notebook
  const handleAddStageToCurrent = () => {
    if (!newStageText.trim() || !selectedNotebook) return;

    const newStage: NotebookStage = {
      id: `stg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newStageText.trim(),
      description: `מתוך מחברת ${selectedNotebook.title}`,
      durationMinutes: newStageDuration || 20
    };

    const updatedStages = [...selectedNotebook.stages, newStage];
    updateLearningNotebook(selectedNotebook.id, { stages: updatedStages });
    refreshNotebooks();
    setNewStageText('');
  };

  // Save stage edits
  const handleSaveStageEdit = (stageId: string) => {
    if (!selectedNotebook || !editStageTitle.trim()) return;

    const updatedStages = selectedNotebook.stages.map(stg =>
      stg.id === stageId
        ? {
            ...stg,
            title: editStageTitle.trim(),
            description: editStageDesc.trim() || undefined,
            durationMinutes: editStageDuration
          }
        : stg
    );

    updateLearningNotebook(selectedNotebook.id, { stages: updatedStages });
    refreshNotebooks();
    setEditingStageId(null);
  };

  // Delete stage from existing notebook
  const handleDeleteStage = (stageId: string) => {
    if (!selectedNotebook) return;
    const updatedStages = selectedNotebook.stages.filter(s => s.id !== stageId);
    updateLearningNotebook(selectedNotebook.id, { stages: updatedStages });
    refreshNotebooks();
  };

  // Delete whole notebook
  const handleDeleteNotebook = (id: string, title: string) => {
    if (window.confirm(`האם את בטוחה שברצונך להסיר את המחברת "${title}" מרשימת המחברות?`)) {
      const remaining = deleteLearningNotebook(id);
      setNotebooks(remaining);
      if (remaining.length > 0) {
        setSelectedNotebookId(remaining[0].id);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/70 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-md">
              <Brain className="w-6 h-6 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold leading-tight">
                  ניהול מחברות למידה & GoogleLM
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-purple-100 font-bold">
                  {notebooks.length} מחברות
                </span>
              </div>
              <p className="text-xs text-purple-200 hidden sm:block">
                צפייה, עריכה ושילוב שלבי למידה ממספר מחברות ונושאים בכל יום
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>המחברות שלי ({notebooks.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('view_edit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'view_edit'
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>צפייה ועריכת שלבים</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('add')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'add'
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>מחברת חדשה +</span>
            </button>
          </div>

          {activeTab === 'view_edit' && notebooks.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">בחר מחברת:</span>
              <select
                value={selectedNotebookId}
                onChange={(e) => setSelectedNotebookId(e.target.value)}
                className="px-2.5 py-1 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-purple-700 dark:text-purple-300"
              >
                {notebooks.map(nb => (
                  <option key={nb.id} value={nb.id}>
                    {nb.title} ({nb.stages.length} שלבים)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* ======================================================== */}
          {/* TAB 1: ALL NOTEBOOKS OVERVIEW */}
          {/* ======================================================== */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    כל מחברות הלמידה שלך ב-GoogleLM
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    באפשרותך לבחור מחברת, לצפות בשלביה, ולשבץ שלבים מכל אחת מהן ישירות להיום
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('add')}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>הוסף מחברת חדשה</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {notebooks.map((nb) => {
                  const completedCount = nb.stages.filter(s => isStageCompleted(s.title)).length;
                  const totalCount = nb.stages.length;
                  const totalMinutes = nb.stages.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
                  const isAssertiveDefault = nb.id === 'notebook-assertive-default';

                  return (
                    <div
                      key={nb.id}
                      className="p-4 bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/90 dark:border-slate-800 flex flex-col justify-between gap-3 shadow-2xs hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                              <Brain className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                {nb.title}
                              </h4>
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                {nb.milestoneTitle}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {nb.url && (
                              <a
                                href={nb.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/60 rounded-lg transition-colors"
                                title="פתח מחברת ב-NotebookLM"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {!isAssertiveDefault && (
                              <button
                                type="button"
                                onClick={() => handleDeleteNotebook(nb.id, nb.title)}
                                className="p-1.5 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                                title="הסר מחברת"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {nb.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                            {nb.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                          <span>{totalCount} שלבי תרגול</span>
                          <span>•</span>
                          <span>⏱️ {totalMinutes} דק׳ מוערכות</span>
                          {completedCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 font-bold">
                                {completedCount} הושלמו ✓
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNotebookId(nb.id);
                            setActiveTab('view_edit');
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>צפה בשלבים ושבץ להיום</span>
                        </button>

                        <a
                          href={nb.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-slate-500 hover:text-purple-600 font-semibold flex items-center gap-1"
                        >
                          <span>ב-NotebookLM</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: VIEW & EDIT STAGES OF SELECTED NOTEBOOK */}
          {/* ======================================================== */}
          {activeTab === 'view_edit' && selectedNotebook && (
            <div className="space-y-4">
              {/* Selected Notebook Top Banner */}
              <div className="p-4 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl border border-purple-200/80 dark:border-purple-800/60 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {selectedNotebook.title}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                        {selectedNotebook.stages.length} שלבים
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      אבן דרך: <strong>{selectedNotebook.milestoneTitle}</strong> • לחצי על <strong>"שבץ להיום"</strong> לשילוב שלב זה בסדר היום הנוכחי
                    </p>
                  </div>
                </div>

                <a
                  href={selectedNotebook.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs hover:bg-purple-50 transition-colors"
                >
                  <span>פתח מחברת ב-NotebookLM 🧠</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Stages List */}
              <div className="space-y-2.5">
                {selectedNotebook.stages.map((stage, idx) => {
                  const isScheduledToday = isStageScheduledForDate(stage.title, currentDate);
                  const isDone = isStageCompleted(stage.title);
                  const isEditingThis = editingStageId === stage.id;

                  return (
                    <div
                      key={stage.id}
                      className={`p-3 bg-white dark:bg-slate-850 rounded-2xl border transition-all ${
                        isScheduledToday
                          ? 'border-purple-400 dark:border-purple-600 ring-1 ring-purple-500/30 bg-purple-50/20'
                          : 'border-slate-200/90 dark:border-slate-800 hover:border-purple-300'
                      }`}
                    >
                      {isEditingThis ? (
                        /* Edit Stage Form */
                        <div className="space-y-2 text-xs">
                          <input
                            type="text"
                            value={editStageTitle}
                            onChange={(e) => setEditStageTitle(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-purple-400 rounded-xl font-bold dark:text-white"
                          />
                          <textarea
                            value={editStageDesc}
                            onChange={(e) => setEditStageDesc(e.target.value)}
                            rows={2}
                            placeholder="תיאור והנחיות לתרגול..."
                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl dark:text-white"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1 text-xs">
                              <span>משך זמן (דקות):</span>
                              <input
                                type="number"
                                value={editStageDuration}
                                onChange={(e) => setEditStageDuration(parseInt(e.target.value, 10) || 20)}
                                className="w-16 px-2 py-1 bg-slate-50 dark:bg-slate-900 border rounded-lg"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingStageId(null)}
                                className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 rounded-lg"
                              >
                                ביטול
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveStageEdit(stage.id)}
                                className="px-3 py-1 bg-emerald-600 text-white font-bold rounded-lg"
                              >
                                שמור שינויים
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* View Stage Item */
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center flex-wrap gap-2">
                                <h4 className={`text-xs sm:text-sm font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                                  {stage.title}
                                </h4>
                                {stage.durationMinutes && (
                                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                                    ⏱️ {stage.durationMinutes} דק׳
                                  </span>
                                )}
                                {isScheduledToday && (
                                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                                    מתוכנן להיום ✓
                                  </span>
                                )}
                                {isDone && (
                                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300">
                                    הושלם ✓
                                  </span>
                                )}
                              </div>
                              {stage.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                  {stage.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Scheduling & Edit Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Schedule To Today Button */}
                            <button
                              type="button"
                              onClick={() => handleScheduleStage(selectedNotebook, stage, currentDate)}
                              className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                              title="הוסף שלב זה לתוכנית של היום"
                            >
                              <ArrowDownToLine className="w-3 h-3" />
                              <span>{isScheduledToday ? 'שבץ שוב' : 'להיום'}</span>
                            </button>

                            {/* Schedule To Bank */}
                            <button
                              type="button"
                              onClick={() => handleScheduleStage(selectedNotebook, stage, 'backlog')}
                              className="px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                              title="שמור בבנק היעדים"
                            >
                              <span>לבנק</span>
                            </button>

                            {/* Edit Stage Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStageId(stage.id);
                                setEditStageTitle(stage.title);
                                setEditStageDesc(stage.description || '');
                                setEditStageDuration(stage.durationMinutes || 20);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              title="ערוך שלב"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Stage Button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteStage(stage.id)}
                              className="p-1 text-slate-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="מחק שלב"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add New Stage Bar */}
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-2">
                <input
                  type="text"
                  value={newStageText}
                  onChange={(e) => setNewStageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddStageToCurrent();
                    }
                  }}
                  placeholder="הוסף שלב תרגול חדש למחברת זו..."
                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
                <div className="flex items-center gap-1 text-xs shrink-0">
                  <span className="text-[11px] text-slate-400">דק׳:</span>
                  <input
                    type="number"
                    value={newStageDuration}
                    onChange={(e) => setNewStageDuration(parseInt(e.target.value, 10) || 20)}
                    className="w-14 px-2 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddStageToCurrent}
                  disabled={!newStageText.trim()}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>הוסף שלב</span>
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: ADD NEW GOOGLE LM NOTEBOOK */}
          {/* ======================================================== */}
          {activeTab === 'add' && (
            <form onSubmit={handleCreateNotebook} className="space-y-4">
              <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 rounded-2xl border border-purple-200/80 dark:border-purple-800/60">
                <h3 className="text-sm font-bold text-purple-950 dark:text-purple-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>הוספת מחברת GoogleLM / NotebookLM חדשה</span>
                </h3>
                <p className="text-xs text-purple-800/80 dark:text-purple-300/80 mt-1">
                  הזיני את קישור המחברת והדביקי את השלבים מתוך קובץ התוכנית. המערכת תפרק אותם מיד לשלבים עצמאיים.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    שם המחברת / נושא הלמידה *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="למשל: Machine Learning Fundamentals, אנגלית עסקית..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    אבן דרך (Milestone)
                  </label>
                  <input
                    type="text"
                    value={newMilestone}
                    onChange={(e) => setNewMilestone(e.target.value)}
                    placeholder="למשל: Machine Learning (GoogleLM)"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  קישור ישיר למחברת ב-NotebookLM
                </label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://notebooklm.link.google/... או https://notebooklm.google.com/notebook/..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  תיאור קצר (אופציונלי)
                </label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="מטרת התוכנית, חומרים נלווים ויעדים מרכזיים"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none"
                />
              </div>

              {/* Raw stages paste area */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900 dark:text-white">
                    פירוק שלבים מתוך הקובץ שבמחברת (הדבקה מהירה)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    שורה נפרדת לכל שלב (למשל: "שלב 1: מבוא לרשתות נוירונים (30 דק')")
                  </span>
                </div>
                <textarea
                  value={rawStagesInput}
                  onChange={(e) => setRawStagesInput(e.target.value)}
                  rows={4}
                  placeholder={`הדביקי כאן את רשימת השלבים מתוך הקובץ במחברת:\n1. שלב ראשון: הגדרת מטרות (20 דק')\n2. שלב שני: קריאת מאמר יסוד ופתרון תרגיל\n3. שלב שלישי: יישום בפועל`}
                  className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>שמור מחברת חדשה ושלבים 🚀</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
