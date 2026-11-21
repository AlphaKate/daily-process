// Core service for Learning Notebooks & Goals lifecycle, activation, re-decomposition, and cleanup

import { GoalLifecycleStatus, LearningNotebook, NotebookStage, Task } from '../types';
import {
  getStoredNotebooks,
  saveStoredNotebooks,
  updateLearningNotebook,
  deleteLearningNotebook,
  parsePlanContentToStages,
  decomposeNotebookPlan
} from './notebookStorage';
import { getStoredTasks, saveStoredTasks, getTodayDateString } from './storage';

export interface ActivateProgramOptions {
  scheduleMode?: 'spread' | 'backlog';
  startDate?: string;
  scheduleDays?: number; // default: 7 days
}

export interface ReDecomposeProgramParams {
  notebookId: string;
  newText?: string;
  newDocUrl?: string;
  mode: 'replace' | 'append';
  scheduleMode?: 'spread' | 'backlog';
  startDate?: string;
}

export interface DeleteProgramOptions {
  notebookId: string;
  cleanPurge?: boolean;
}

/**
 * Check if a task belongs to a specific learning notebook.
 */
export const isTaskBelongingToNotebook = (task: Task, notebook: LearningNotebook): boolean => {
  if (task.goalDocumentId && task.goalDocumentId === notebook.id) {
    return true;
  }
  if (task.link && notebook.url && task.link.trim() === notebook.url.trim()) {
    return true;
  }
  const nbMilestone = (notebook.milestoneTitle || notebook.title || '').trim().toLowerCase();
  if (nbMilestone && task.milestoneTitle && task.milestoneTitle.trim().toLowerCase() === nbMilestone) {
    return true;
  }
  if (
    notebook.stages &&
    notebook.stages.length > 0 &&
    notebook.stages.some(
      s => s.title.trim().toLowerCase() === task.title.trim().toLowerCase()
    )
  ) {
    return true;
  }
  return false;
};

/**
 * Retrieve all tasks associated with a notebook ID.
 */
export const getNotebookTasks = (notebookId: string, existingTasks?: Task[]): Task[] => {
  const notebooks = getStoredNotebooks();
  const notebook = notebooks.find(n => n.id === notebookId);
  if (!notebook) return [];

  const tasks = existingTasks || getStoredTasks();
  return tasks.filter(t => !t.isDeleted && isTaskBelongingToNotebook(t, notebook));
};

/**
 * Creates a program with full lifecycle support.
 * If status is 'in_preparation' or scheduleMode is 'none', tasks are not injected into schedule.
 */
export const createProgram = (params: {
  title: string;
  url?: string;
  milestoneTitle?: string;
  description?: string;
  rawContent?: string;
  status?: GoalLifecycleStatus;
  scheduleMode?: 'spread' | 'backlog' | 'none';
  startDate?: string;
}): { notebook: LearningNotebook; newTasks: Task[] } => {
  const now = new Date().toISOString();
  const url = (params.url || '').trim() || 'https://notebooklm.google.com/';
  const milestoneTitle = (params.milestoneTitle || '').trim() || params.title.trim();
  const status: GoalLifecycleStatus = params.status || 'active';

  let stages: NotebookStage[] = [];
  if (params.rawContent && params.rawContent.trim()) {
    stages = parsePlanContentToStages(params.rawContent.trim());
  }
  if (stages.length === 0) {
    stages = decomposeNotebookPlan(url, params.title, params.rawContent, true);
  }

  const notebookId = `nb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const notebook: LearningNotebook = {
    id: notebookId,
    title: params.title.trim(),
    url,
    milestoneTitle,
    description: params.description?.trim(),
    stages,
    status,
    createdAt: now,
    updatedAt: now
  };

  const currentNotebooks = getStoredNotebooks();
  saveStoredNotebooks([notebook, ...currentNotebooks]);

  // If in_preparation or scheduleMode is none, do NOT inject tasks into the schedule
  if (status === 'in_preparation' || params.scheduleMode === 'none') {
    return { notebook, newTasks: [] };
  }

  // Otherwise, schedule tasks into week or backlog
  const { newTasks } = scheduleNotebookStagesInternal(notebook, stages, {
    scheduleMode: params.scheduleMode || 'spread',
    startDate: params.startDate
  });

  return { notebook, newTasks };
};

/**
 * Internal helper to convert stages into Task objects and save them.
 */
const scheduleNotebookStagesInternal = (
  notebook: LearningNotebook,
  stagesToSchedule: NotebookStage[],
  options?: {
    scheduleMode?: 'spread' | 'backlog';
    startDate?: string;
    scheduleDays?: number;
  }
): { newTasks: Task[] } => {
  if (stagesToSchedule.length === 0) return { newTasks: [] };

  const mode = options?.scheduleMode || 'spread';
  const start = options?.startDate || getTodayDateString();
  const now = new Date().toISOString();
  const [sy, sm, sd] = start.split('-').map(Number);
  const baseDate = new Date(sy, sm - 1, sd);

  const newTasks: Task[] = stagesToSchedule.map((stg, i) => {
    let targetDate = 'backlog';
    if (mode === 'spread') {
      const targetObj = new Date(baseDate);
      targetObj.setDate(baseDate.getDate() + i);
      const y = targetObj.getFullYear();
      const m = String(targetObj.getMonth() + 1).padStart(2, '0');
      const d = String(targetObj.getDate()).padStart(2, '0');
      targetDate = `${y}-${m}-${d}`;
    }

    return {
      id: `nb-task-${notebook.id}-${stg.id}-${Date.now()}-${i}`,
      title: stg.title,
      description: stg.description,
      category: 'goals',
      completed: false,
      date: targetDate,
      durationMinutes: stg.durationMinutes || 20,
      milestoneTitle: notebook.milestoneTitle || notebook.title,
      link: notebook.url,
      goalDocumentId: notebook.id,
      goalStatus: 'active',
      createdAt: now,
      updatedAt: now
    };
  });

  const allTasks = getStoredTasks();
  saveStoredTasks([...newTasks, ...allTasks]);
  return { newTasks };
};

/**
 * Activate an in_preparation or paused program:
 * - Switches status to 'active'
 * - Injects unscheduled stages into the weekly schedule or backlog
 */
export const activateProgram = (
  notebookId: string,
  optionsOrScheduleDays?: number | string[] | ActivateProgramOptions
): { notebook: LearningNotebook; newTasks: Task[] } => {
  const notebooks = getStoredNotebooks();
  const notebook = notebooks.find(n => n.id === notebookId);
  if (!notebook) {
    throw new Error(`Notebook with id "${notebookId}" not found`);
  }

  // Update notebook status
  const updatedNotebook: LearningNotebook = {
    ...notebook,
    status: 'active',
    updatedAt: new Date().toISOString()
  };
  updateLearningNotebook(notebookId, { status: 'active' });

  // Determine schedule options
  let scheduleMode: 'spread' | 'backlog' = 'spread';
  let startDate = getTodayDateString();

  if (typeof optionsOrScheduleDays === 'number') {
    scheduleMode = 'spread';
  } else if (Array.isArray(optionsOrScheduleDays)) {
    scheduleMode = 'spread';
  } else if (optionsOrScheduleDays && typeof optionsOrScheduleDays === 'object') {
    scheduleMode = optionsOrScheduleDays.scheduleMode || 'spread';
    startDate = optionsOrScheduleDays.startDate || startDate;
  }

  // Find existing tasks to prevent duplicate scheduling
  const allTasks = getStoredTasks();
  const existingActiveNotebookTasks = allTasks.filter(
    t => !t.isDeleted && isTaskBelongingToNotebook(t, notebook)
  );

  // Filter stages that aren't already scheduled/completed
  const stagesToSchedule = notebook.stages.filter(stg => {
    return !existingActiveNotebookTasks.some(
      t => t.title.trim().toLowerCase() === stg.title.trim().toLowerCase()
    );
  });

  const { newTasks } = scheduleNotebookStagesInternal(updatedNotebook, stagesToSchedule, {
    scheduleMode,
    startDate
  });

  return { notebook: updatedNotebook, newTasks };
};

/**
 * Re-decomposes an existing program's plan:
 * - 'replace': Soft-deletes uncompleted future tasks belonging to this notebook,
 *   preserves ALL completed tasks for historical stats, parses new stages, and schedules them.
 * - 'append': Preserves all existing tasks, parses new stages from text, and appends them.
 */
export const reDecomposeProgram = (
  params: ReDecomposeProgramParams
): {
  notebook: LearningNotebook;
  updatedTasks: Task[];
  newTasks: Task[];
} => {
  const { notebookId, newText, newDocUrl, mode, scheduleMode = 'spread', startDate } = params;
  const notebooks = getStoredNotebooks();
  const notebook = notebooks.find(n => n.id === notebookId);
  if (!notebook) {
    throw new Error(`Notebook with id "${notebookId}" not found`);
  }

  // Parse new stages
  let parsedStages: NotebookStage[] = [];
  if (newText && newText.trim()) {
    parsedStages = parsePlanContentToStages(newText.trim());
  }
  if (parsedStages.length === 0) {
    parsedStages = decomposeNotebookPlan(
      newDocUrl || notebook.url,
      notebook.title,
      newText,
      true
    );
  }

  const allTasks = getStoredTasks();
  const now = new Date().toISOString();

  let finalNotebookStages: NotebookStage[] = [];
  let updatedTaskList: Task[] = [...allTasks];
  let stagesToSchedule: NotebookStage[] = [];

  if (mode === 'replace') {
    // 1. Identify tasks belonging to this notebook
    // Keep completed tasks intact! Soft-delete uncompleted tasks!
    updatedTaskList = allTasks.map(t => {
      if (isTaskBelongingToNotebook(t, notebook)) {
        if (!t.completed) {
          return {
            ...t,
            isDeleted: true,
            updatedAt: now
          };
        }
      }
      return t;
    });

    // Check which previous stages were already completed
    const completedTasksForNotebook = allTasks.filter(
      t => !t.isDeleted && t.completed && isTaskBelongingToNotebook(t, notebook)
    );
    const completedStages = notebook.stages.filter(s =>
      completedTasksForNotebook.some(
        t => t.title.trim().toLowerCase() === s.title.trim().toLowerCase()
      )
    );

    // Filter out stages from new parsed stages that match already completed stages
    const trulyNewStages = parsedStages.filter(
      ns =>
        !completedStages.some(
          cs => cs.title.trim().toLowerCase() === ns.title.trim().toLowerCase()
        )
    );

    finalNotebookStages = [...completedStages, ...trulyNewStages];
    stagesToSchedule = trulyNewStages;
  } else {
    // mode === 'append'
    // Keep all existing tasks as is
    finalNotebookStages = [...notebook.stages, ...parsedStages];
    stagesToSchedule = parsedStages;
  }

  // Update notebook in storage
  const notebookUpdates: Partial<LearningNotebook> = {
    stages: finalNotebookStages,
    updatedAt: now
  };
  if (newDocUrl && newDocUrl.trim()) {
    notebookUpdates.url = newDocUrl.trim();
  }
  const updatedNotebooks = updateLearningNotebook(notebookId, notebookUpdates);
  const updatedNotebook = updatedNotebooks.find(n => n.id === notebookId) || {
    ...notebook,
    ...notebookUpdates
  };

  // Create new task records for stages to schedule
  const start = startDate || getTodayDateString();
  const [sy, sm, sd] = start.split('-').map(Number);
  const baseDate = new Date(sy, sm - 1, sd);

  const newTasks: Task[] = stagesToSchedule.map((stg, i) => {
    let targetDate = 'backlog';
    if (scheduleMode === 'spread') {
      const targetObj = new Date(baseDate);
      targetObj.setDate(baseDate.getDate() + i);
      const y = targetObj.getFullYear();
      const m = String(targetObj.getMonth() + 1).padStart(2, '0');
      const d = String(targetObj.getDate()).padStart(2, '0');
      targetDate = `${y}-${m}-${d}`;
    }

    return {
      id: `nb-task-${notebook.id}-${stg.id}-${Date.now()}-${i}`,
      title: stg.title,
      description: stg.description,
      category: 'goals',
      completed: false,
      date: targetDate,
      durationMinutes: stg.durationMinutes || 20,
      milestoneTitle: updatedNotebook.milestoneTitle || updatedNotebook.title,
      link: updatedNotebook.url,
      goalDocumentId: updatedNotebook.id,
      goalStatus: updatedNotebook.status || 'active',
      createdAt: now,
      updatedAt: now
    };
  });

  const finalTasks = [...newTasks, ...updatedTaskList];
  saveStoredTasks(finalTasks);

  return {
    notebook: updatedNotebook,
    updatedTasks: finalTasks,
    newTasks
  };
};

/**
 * Delete a program with zero restrictions:
 * - Works on ALL programs (including built-in default Assertive Practice)
 * - cleanPurge: true removes the notebook AND soft-deletes (isDeleted: true) all associated tasks
 * - cleanPurge: false removes the notebook but leaves existing tasks as standalone items
 */
export function deleteProgram(
  params: DeleteProgramOptions
): { remainingNotebooks: LearningNotebook[]; updatedTasks: Task[] };
export function deleteProgram(
  notebookId: string,
  cleanPurge?: boolean
): { remainingNotebooks: LearningNotebook[]; updatedTasks: Task[] };
export function deleteProgram(
  arg1: string | DeleteProgramOptions,
  arg2?: boolean
): { remainingNotebooks: LearningNotebook[]; updatedTasks: Task[] } {
  let notebookId: string;
  let cleanPurge = false;

  if (typeof arg1 === 'string') {
    notebookId = arg1;
    cleanPurge = Boolean(arg2);
  } else {
    notebookId = arg1.notebookId;
    cleanPurge = Boolean(arg1.cleanPurge);
  }

  const notebooks = getStoredNotebooks();
  const targetNotebook = notebooks.find(n => n.id === notebookId);

  // If this is the default assertive notebook, permanently flag it so it won't be resurrected
  if (
    notebookId === 'notebook-assertive-default' ||
    targetNotebook?.title?.toLowerCase().includes('assertive') ||
    targetNotebook?.milestoneTitle?.toLowerCase().includes('assertive')
  ) {
    try {
      localStorage.setItem('daily_proc_assertive_deleted', 'true');
    } catch {
      // ignore in environments without localStorage
    }
  }

  // Remove the notebook
  const remainingNotebooks = deleteLearningNotebook(notebookId);

  let updatedTasks = getStoredTasks();
  if (cleanPurge && targetNotebook) {
    const now = new Date().toISOString();
    updatedTasks = updatedTasks.map(t => {
      if (isTaskBelongingToNotebook(t, targetNotebook)) {
        return {
          ...t,
          isDeleted: true,
          updatedAt: now
        };
      }
      return t;
    });
    saveStoredTasks(updatedTasks);
  }

  return { remainingNotebooks, updatedTasks };
}

/**
 * Set program lifecycle status (e.g. 'archived', 'in_preparation', 'active', 'completed').
 */
export const setProgramStatus = (
  notebookId: string,
  status: GoalLifecycleStatus
): LearningNotebook | null => {
  const updatedNotebooks = updateLearningNotebook(notebookId, { status });
  return updatedNotebooks.find(n => n.id === notebookId) || null;
};

export const archiveProgram = (notebookId: string): LearningNotebook | null => {
  return setProgramStatus(notebookId, 'archived');
};

export const unarchiveProgram = (notebookId: string): LearningNotebook | null => {
  return setProgramStatus(notebookId, 'active');
};

export const completeProgram = (notebookId: string): LearningNotebook | null => {
  return setProgramStatus(notebookId, 'completed');
};
