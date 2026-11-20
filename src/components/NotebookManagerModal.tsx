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
  Wand2,
  Search,
  FileText,
  AlertCircle,
  Loader2,
  Calendar,
  CalendarDays,
  Inbox
} from 'lucide-react';
import {
  LearningNotebook,
  NotebookStage,
  getStoredNotebooks,
  addLearningNotebook,
  updateLearningNotebook,
  deleteLearningNotebook,
  decomposeNotebookPlan,
  parsePlanContentToStages,
  generateGenericStages,
  INITIAL_ASSERTIVE_NOTEBOOK
} from '../services/notebookStorage';
import {
  searchDriveFilesByName,
  fetchDriveFileContent,
  fetchGoogleDoc
} from '../services/googleDrive';
import { getStoredToken } from '../services/googleAuth';

export const DAYS_OF_WEEK = [
  { day: 0, label: 'א׳', name: 'ראשון' },
  { day: 1, label: 'ב׳', name: 'שני' },
  { day: 2, label: 'ג׳', name: 'שלישי' },
  { day: 3, label: 'ד׳', name: 'רביעי' },
  { day: 4, label: 'ה׳', name: 'חמישי' },
  { day: 5, label: 'ו׳', name: 'שישי' },
  { day: 6, label: 'ש׳', name: 'שבת' },
];

export const PRESETS = [
  { label: '5 ימים (א׳-ה׳)', days: [0, 1, 2, 3, 4] },
  { label: '6 ימים (א׳-ו׳)', days: [0, 1, 2, 3, 4, 5] },
  { label: '7 ימים (כל השבוע)', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: '3 ימים (א׳, ג׳, ה׳)', days: [0, 2, 4] },
  { label: '4 ימים (א׳, ב׳, ד׳, ה׳)', days: [0, 1, 3, 4] },
];

export const calculateDistributedDates = (
  count: number,
  startDateStr: string,
  allowedDaysOfWeek: number[]
): string[] => {
  if (count <= 0) return [];
  const validDays = allowedDaysOfWeek.length > 0 ? allowedDaysOfWeek : [0, 1, 2, 3, 4, 5, 6];
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const cursor = new Date(sy, sm - 1, sd);
  const result: string[] = [];

  let safety = 0;
  while (result.length < count && safety < 365) {
    safety++;
    const dayOfWeek = cursor.getDay();
    if (validDays.includes(dayOfWeek)) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      result.push(`${y}-${m}-${d}`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
};

export const formatHebrewDateDisplay = (dateStr: string): string => {
  if (!dateStr) return '';
  if (dateStr === 'backlog') return 'בנק היעדים';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const dayName = dayNames[dateObj.getDay()];
    return `יום ${dayName}, ${d}/${m}`;
  } catch {
    return dateStr;
  }
};

interface NotebookManagerModalProps {
  isOpen: boolean;
  currentDate: string;
  allTasks: Task[];
  onClose: () => void;
  onScheduleStage: (task: Task | Task[]) => void;
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

  // Add Notebook Form Wizard State
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newMilestone, setNewMilestone] = useState('');
  const [planFileName, setPlanFileName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [rawPastedContent, setRawPastedContent] = useState('');
  const [decomposedStages, setDecomposedStages] = useState<NotebookStage[]>([]);
  const [hasDecomposed, setHasDecomposed] = useState(false);
  // Distribution Configuration State (Add Form Wizard)
  const [distributionMode, setDistributionMode] = useState<'spread' | 'backlog' | 'none'>('spread');
  const [selectedPracticeDays, setSelectedPracticeDays] = useState<number[]>([0, 1, 2, 3, 4]); // Default Sun-Thu
  const [distributionStartDate, setDistributionStartDate] = useState<string>(currentDate);
  const [stageScheduleOverrides, setStageScheduleOverrides] = useState<Record<string, string>>({});

  // Bulk Distribution State for Existing Notebook (Tab 2)
  const [showTab2Distributor, setShowTab2Distributor] = useState(false);
  const [tab2PracticeDays, setTab2PracticeDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [tab2StartDate, setTab2StartDate] = useState<string>(currentDate);

  const [isSearchingDrive, setIsSearchingDrive] = useState(false);
  const [decomposeNotice, setDecomposeNotice] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

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

  const refreshNotebooks = () => {
    const fresh = getStoredNotebooks();
    setNotebooks(fresh);
  };

  const isStageScheduledForDate = (stageTitle: string, date: string): boolean => {
    return allTasks.some(
      t => !t.isDeleted && t.date === date && t.title.trim().toLowerCase() === stageTitle.trim().toLowerCase()
    );
  };

  const getStageScheduledDate = (stageTitle: string): string | null => {
    const found = allTasks.find(
      t => !t.isDeleted && t.title.trim().toLowerCase() === stageTitle.trim().toLowerCase()
    );
    return found ? found.date : null;
  };

  const isStageCompleted = (stageTitle: string): boolean => {
    return allTasks.some(
      t => !t.isDeleted && t.completed && t.title.trim().toLowerCase() === stageTitle.trim().toLowerCase()
    );
  };

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

  const handleBulkDistributeNotebookStages = (notebook: LearningNotebook, mode: 'spread' | 'backlog') => {
    if (!notebook.stages || notebook.stages.length === 0) return;

    const incompleteStages = notebook.stages.filter(s => !isStageCompleted(s.title));
    const targetStages = incompleteStages.length > 0 ? incompleteStages : notebook.stages;

    const now = new Date().toISOString();
    const newTasks: Task[] = [];

    if (mode === 'spread') {
      const dates = calculateDistributedDates(
        targetStages.length,
        tab2StartDate || currentDate,
        tab2PracticeDays
      );
      targetStages.forEach((stg, idx) => {
        newTasks.push({
          id: `nb-auto-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          title: stg.title,
          description: stg.description,
          category: 'goals',
          completed: false,
          date: dates[idx] || currentDate,
          durationMinutes: stg.durationMinutes || 20,
          milestoneTitle: notebook.milestoneTitle || notebook.title,
          link: notebook.url,
          createdAt: now,
          updatedAt: now
        });
      });
    } else {
      targetStages.forEach((stg, idx) => {
        newTasks.push({
          id: `nb-auto-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
          title: stg.title,
          description: stg.description,
          category: 'goals',
          completed: false,
          date: 'backlog',
          durationMinutes: stg.durationMinutes || 20,
          milestoneTitle: notebook.milestoneTitle || notebook.title,
          link: notebook.url,
          createdAt: now,
          updatedAt: now
        });
      });
    }

    if (newTasks.length > 0) {
      onScheduleStage(newTasks);
      setShowTab2Distributor(false);
    }
  };

  // 1. Open NotebookLM to pick a notebook
  const handleOpenNotebookLMForNotebook = () => {
    window.open('https://notebooklm.google.com/', '_blank');
  };

  // 2. Open NotebookLM to pick a plan file/note
  const handleOpenNotebookLMForPlan = () => {
    const target = newUrl.trim() || 'https://notebooklm.google.com/';
    window.open(target, '_blank');
  };

  // 3. Decompose plan into real sub-tasks based on pasted text, Drive search, or Doc URL
  const handleDecomposePlan = async (forceGenericFallback = false) => {
    setDecomposeNotice(null);
    setIsSearchingDrive(true);

    try {
      // 1. Check if user already pasted content into the textarea
      if (rawPastedContent.trim()) {
        const parsed = parsePlanContentToStages(rawPastedContent);
        if (parsed.length > 0) {
          setDecomposedStages(parsed);
          setHasDecomposed(true);
          setDecomposeNotice({
            type: 'success',
            message: `✓ חולצו ${parsed.length} שלבים אמיתיים מתוך תוכן התוכנית שהודבק!`
          });
          setIsSearchingDrive(false);
          return;
        }
      }

      // 2. Check if a Google Doc URL was pasted in newUrl or planFileName
      const combinedInputs = `${newUrl} ${planFileName}`;
      const docIdMatch = combinedInputs.match(/(?:document\/d\/|open\?id=)([a-zA-Z0-9-_]{20,})/);
      const token = getStoredToken();

      if (docIdMatch && token?.access_token) {
        const docId = docIdMatch[1];
        const fetchedDoc = await fetchGoogleDoc(docId, token.access_token);
        if (fetchedDoc && fetchedDoc.rawText) {
          const parsed = parsePlanContentToStages(fetchedDoc.rawText);
          if (parsed.length > 0) {
            setDecomposedStages(parsed);
            setHasDecomposed(true);
            setRawPastedContent(fetchedDoc.rawText);
            if (!newTitle.trim()) setNewTitle(fetchedDoc.title || 'תוכנית עבודה');
            setDecomposeNotice({
              type: 'success',
              message: `✓ מסמך Google Docs ("${fetchedDoc.title || 'תוכנית'}") נטען בהצלחה וחולצו ${parsed.length} שלבים אמיתיים!`
            });
            setIsSearchingDrive(false);
            return;
          }
        }
      }

      // 3. Search Google Drive by planFileName
      const effectiveFileName = planFileName.trim();
      if (effectiveFileName && token?.access_token) {
        const matches = await searchDriveFilesByName(effectiveFileName, token.access_token);
        if (matches.length > 0) {
          const bestMatch = matches.find(m => m.mimeType === 'application/vnd.google-apps.document') || matches[0];
          const contentObj = await fetchDriveFileContent(bestMatch.id, bestMatch.mimeType, token.access_token);
          if (contentObj.content && contentObj.content.trim()) {
            const parsed = parsePlanContentToStages(contentObj.content);
            if (parsed.length > 0) {
              setDecomposedStages(parsed);
              setHasDecomposed(true);
              setRawPastedContent(contentObj.content);
              if (!newTitle.trim()) setNewTitle(bestMatch.name);
              setDecomposeNotice({
                type: 'success',
                message: `✓ קובץ התוכנית "${bestMatch.name}" אותר ב-Google Drive וחולצו ${parsed.length} שלבים אמיתיים!`
              });
              setIsSearchingDrive(false);
              return;
            }
          }
        }
      }

      // 4. If this is the default Assertive Practice Plan
      if (
        newUrl.includes('0Uhj6QVmB40d') ||
        planFileName.toLowerCase().includes('assertive') ||
        newTitle.toLowerCase().includes('assertive') ||
        planFileName.includes('אסרטיב')
      ) {
        const stages = INITIAL_ASSERTIVE_NOTEBOOK.stages;
        setDecomposedStages(stages);
        setHasDecomposed(true);
        setDecomposeNotice({
          type: 'success',
          message: `✓ נטענו 7 שלבי התרגול המובנים של תוכנית התקשורת האסרטיבית!`
        });
        setIsSearchingDrive(false);
        return;
      }

      // 5. If user clicked to force generic fallback
      if (forceGenericFallback) {
        const stages = generateGenericStages(effectiveFileName || newTitle || 'תוכנית למידה');
        setDecomposedStages(stages);
        setHasDecomposed(true);
        setDecomposeNotice({
          type: 'warning',
          message: `נוצרו שלבים גנריים לדוגמה. מומלץ להעתיק את תוכן התוכנית האמיתית מ-NotebookLM ולהדביק בתיבה.`
        });
        setIsSearchingDrive(false);
        return;
      }

      // 6. Not found in Drive and no content pasted
      setDecomposedStages([]);
      setHasDecomposed(false);
      setDecomposeNotice({
        type: 'error',
        message: effectiveFileName
          ? `לא נמצא קובץ בשם "${effectiveFileName}" ב-Google Drive. כדי לפרק את התוכנית האמיתית: פתחי את המחברת ב-NotebookLM, העתיקי את הטקסט של התוכנית (Ctrl+C / העתק הערה), והדביקי כאן בתיבת הטקסט.`
          : `נא להדביק את תוכן התוכנית מתוך NotebookLM בתיבת הטקסט למטה, או לציין שם קובץ קיים ב-Google Drive.`
      });
    } catch (err: any) {
      console.warn('Decompose plan error:', err);
      setDecomposeNotice({
        type: 'error',
        message: `שגיאה בחיפוש הקובץ ב-Google Drive: ${err.message || 'שגיאת תקשורת'}. באפשרותך להעתיק ולהדביק את תוכן התוכנית ישירות מ-NotebookLM.`
      });
    } finally {
      setIsSearchingDrive(false);
    }
  };

  // Submit and create notebook + optional scheduling
  const handleCreateNotebook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    let finalStages = decomposedStages;
    if (finalStages.length === 0) {
      finalStages = decomposeNotebookPlan(newUrl, newTitle, rawPastedContent, true);
    }

    const created = addLearningNotebook({
      title: newTitle.trim(),
      url: newUrl.trim() || 'https://notebooklm.google.com/',
      milestoneTitle: newMilestone.trim() || `${newTitle.trim()} (GoogleLM)`,
      description: newDescription.trim() || (planFileName ? `מתוך תוכנית העבודה: ${planFileName}` : undefined),
      stages: finalStages
    });

    // Schedule tasks based on user distribution configuration
    if (finalStages.length > 0) {
      const now = new Date().toISOString();
      const newTasks: Task[] = [];

      if (distributionMode === 'spread') {
        const distributedDates = calculateDistributedDates(
          finalStages.length,
          distributionStartDate || currentDate,
          selectedPracticeDays
        );

        finalStages.forEach((stg, idx) => {
          const assignedDate = stageScheduleOverrides[stg.id] || distributedDates[idx] || currentDate;
          newTasks.push({
            id: `nb-auto-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
            title: stg.title,
            description: stg.description,
            category: 'goals',
            completed: false,
            date: assignedDate,
            durationMinutes: stg.durationMinutes || 20,
            milestoneTitle: created.milestoneTitle,
            link: created.url,
            createdAt: now,
            updatedAt: now
          });
        });
      } else if (distributionMode === 'backlog') {
        finalStages.forEach((stg, idx) => {
          const assignedDate = stageScheduleOverrides[stg.id] || 'backlog';
          newTasks.push({
            id: `nb-auto-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
            title: stg.title,
            description: stg.description,
            category: 'goals',
            completed: false,
            date: assignedDate,
            durationMinutes: stg.durationMinutes || 20,
            milestoneTitle: created.milestoneTitle,
            link: created.url,
            createdAt: now,
            updatedAt: now
          });
        });
      } else if (distributionMode === 'none') {
        finalStages.forEach((stg, idx) => {
          const assignedDate = stageScheduleOverrides[stg.id];
          if (assignedDate) {
            newTasks.push({
              id: `nb-auto-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
              title: stg.title,
              description: stg.description,
              category: 'goals',
              completed: false,
              date: assignedDate,
              durationMinutes: stg.durationMinutes || 20,
              milestoneTitle: created.milestoneTitle,
              link: created.url,
              createdAt: now,
              updatedAt: now
            });
          }
        });
      }

      if (newTasks.length > 0) {
        onScheduleStage(newTasks);
      }
    }

    refreshNotebooks();
    setSelectedNotebookId(created.id);
    setActiveTab('view_edit');

    // Reset Form
    setNewTitle('');
    setNewUrl('');
    setNewMilestone('');
    setPlanFileName('');
    setNewDescription('');
    setRawPastedContent('');
    setDecomposedStages([]);
    setHasDecomposed(false);
    setDistributionMode('spread');
    setSelectedPracticeDays([0, 1, 2, 3, 4]);
    setDistributionStartDate(currentDate);
    setStageScheduleOverrides({});
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
      <div className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/70 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[94vh]">
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
                פתיחת מחברות ב-NotebookLM, פירוק תוכניות עבודה לתתי-משימות ושילוב נושאים בכל יום
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
              <span>הוספת מחברת ופירוק שלבים 🪄</span>
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
                    באפשרותך לפתוח כל מחברת ב-NotebookLM, לצפות בשלביה, ולשבץ שלבים מכל אחת מהן ישירות להיום
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
                          <span>ב-NotebookLM ↗</span>
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

                <div className="flex items-center gap-2">
                  <a
                    href={selectedNotebook.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs hover:bg-purple-50 transition-colors"
                  >
                    <span>פתח מחברת ב-NotebookLM ↗</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Quick Bulk Distribution Toolbar for Existing Notebook */}
              <div className="p-3 bg-gradient-to-r from-purple-50/70 to-indigo-50/70 dark:from-purple-950/40 dark:to-indigo-950/40 rounded-2xl border border-purple-200/80 dark:border-purple-800/50 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <CalendarDays className="w-4 h-4 text-purple-600" />
                    <span>פיזור ושיבוץ מהיר של שלבי המחברת:</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowTab2Distributor(prev => !prev)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                    >
                      <CalendarDays className="w-3.5 h-3.5" />
                      <span>{showTab2Distributor ? 'סגור הגדרות פיזור' : 'פזר לאורך השבוע 📅'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBulkDistributeNotebookStages(selectedNotebook, 'backlog')}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Inbox className="w-3.5 h-3.5 text-purple-600" />
                      <span>העבר הכל לבנק היעדים 📥</span>
                    </button>
                  </div>
                </div>

                {showTab2Distributor && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-purple-200 dark:border-purple-800 space-y-2.5 animate-in fade-in duration-150 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        כמה ימים בשבוע מתוכנן התרגול?
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400">החל מתאריך:</span>
                        <input
                          type="date"
                          value={tab2StartDate}
                          onChange={(e) => setTab2StartDate(e.target.value)}
                          className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Preset pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {PRESETS.map((p) => {
                        const isSelected =
                          tab2PracticeDays.length === p.days.length &&
                          p.days.every(d => tab2PracticeDays.includes(d));
                        return (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => setTab2PracticeDays(p.days)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200 border-purple-300 dark:border-purple-700 font-bold'
                                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Day toggles */}
                    <div className="flex items-center gap-1 pt-1">
                      <span className="text-[11px] text-slate-400 shrink-0 ml-1">ימי השבוע:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {DAYS_OF_WEEK.map(({ day, label, name }) => {
                          const active = tab2PracticeDays.includes(day);
                          return (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                if (active) {
                                  if (tab2PracticeDays.length > 1) {
                                    setTab2PracticeDays(tab2PracticeDays.filter(d => d !== day));
                                  }
                                } else {
                                  setTab2PracticeDays([...tab2PracticeDays, day].sort());
                                }
                              }}
                              className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                                active
                                  ? 'bg-purple-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-200'
                              }`}
                              title={`יום ${name}`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-[11px] text-purple-600 dark:text-purple-400 font-bold mr-2">
                        ({tab2PracticeDays.length} ימים בשבוע)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleBulkDistributeNotebookStages(selectedNotebook, 'spread')}
                        className="mr-auto px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        החל פיזור כעת 🚀
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Stages List */}
              <div className="space-y-2.5">
                {selectedNotebook.stages.map((stage, idx) => {
                  const isScheduledToday = isStageScheduledForDate(stage.title, currentDate);
                  const scheduledDate = getStageScheduledDate(stage.title);
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
                                {scheduledDate === 'backlog' && (
                                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                    בבנק היעדים ✓
                                  </span>
                                )}
                                {isScheduledToday && (
                                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
                                    מתוכנן להיום ✓
                                  </span>
                                )}
                                {scheduledDate && scheduledDate !== currentDate && scheduledDate !== 'backlog' && (
                                  <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                                    משובץ ל-{formatHebrewDateDisplay(scheduledDate)} ✓
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
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                            <button
                              type="button"
                              onClick={() => handleScheduleStage(selectedNotebook, stage, currentDate)}
                              className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-xs shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                              title="הוסף שלב זה לתוכנית של היום"
                            >
                              <ArrowDownToLine className="w-3 h-3" />
                              <span>{isScheduledToday ? 'שבץ שוב' : 'להיום'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleScheduleStage(selectedNotebook, stage, 'backlog')}
                              className={`px-2 py-1 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                                scheduledDate === 'backlog'
                                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300'
                                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300'
                              }`}
                              title="שמור בבנק היעדים"
                            >
                              <span>לבנק</span>
                            </button>

                            <label
                              className="relative px-2 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="שבץ שלב זה ליום ספציפי"
                            >
                              <Calendar className="w-3 h-3 text-purple-600" />
                              <span>ליום...</span>
                              <input
                                type="date"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleScheduleStage(selectedNotebook, stage, e.target.value);
                                  }
                                }}
                              />
                            </label>

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
                  placeholder="הוסף שלב תרגול נוסף למחברת זו..."
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
          {/* TAB 3: ADD NEW GOOGLE LM NOTEBOOK & DECOMPOSE WIZARD */}
          {/* ======================================================== */}
          {activeTab === 'add' && (
            <form onSubmit={handleCreateNotebook} className="space-y-4">
              {/* Wizard Step 1: Open NotebookLM to pick a notebook */}
              <div className="p-3.5 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 rounded-2xl border border-purple-200/80 dark:border-purple-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-purple-950 dark:text-purple-100">
                      בחירת המחברת ב-NotebookLM
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenNotebookLMForNotebook}
                    className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>פתח את NotebookLM ↗</span>
                  </button>
                </div>

                <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80">
                  לחצי על הכפתור לפתיחת NotebookLM, בחרי את המחברת הרצויה, והדביקי כאן את הקישור שלה:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      קישור המחברת ב-NotebookLM *
                    </label>
                    <input
                      type="url"
                      required
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      placeholder="https://notebooklm.link.google/... או notebooklm.google.com/notebook/..."
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-xl text-xs dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      שם המחברת / נושא הלמידה *
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="למשל: Daily Assertive Practice Plan, Machine Learning..."
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    />
                  </div>
                </div>
              </div>

              {/* Wizard Step 2: Open NotebookLM to pick the plan file */}
              <div className="p-3.5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-2xl border border-indigo-200/80 dark:border-indigo-800/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                      2
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-100">
                      בחירת תוכנית הפעולה במחברת
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenNotebookLMForPlan}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>פתח את המחברת לבחירת התוכנית ↗</span>
                  </button>
                </div>

                <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80">
                  בתוך המחברת, אתרי את קובץ או הערת תוכנית הפעולה (למשל: <strong>Daily assertive practice plan</strong>). באפשרותך לציין את שם הקובץ (האפליקציה תחפש אותו ב-Google Drive) או להדביק ישירות את תוכן התוכנית:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                      <Search className="w-3 h-3 text-indigo-500" />
                      <span>שם קובץ התוכנית ב-Google Drive / NotebookLM</span>
                    </label>
                    <input
                      type="text"
                      value={planFileName}
                      onChange={(e) => setPlanFileName(e.target.value)}
                      placeholder="למשל: Daily assertive practice plan או שם קובץ Doc"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      אבן דרך (Milestone)
                    </label>
                    <input
                      type="text"
                      value={newMilestone}
                      onChange={(e) => setNewMilestone(e.target.value)}
                      placeholder="למשל: Daily Assertive Practice (GoogleLM)"
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-purple-500" />
                      <span>הדבקת תוכן התוכנית (מומלץ לפירוק מדויק ישירות מ-NotebookLM)</span>
                    </span>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-normal">
                      תומך בפורמט Markdown, שלבים, ימים ומשכי זמן
                    </span>
                  </label>
                  <textarea
                    value={rawPastedContent}
                    onChange={(e) => setRawPastedContent(e.target.value)}
                    rows={3}
                    placeholder="העתיקי את הטקסט של תוכנית הפעולה מ-NotebookLM והדביקי כאן... המערכת תפרק אותו אוטומטית לשלבים אמיתיים לפי ימים, שלבים או כותרות."
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  />
                </div>
              </div>

              {/* Wizard Step 3: Decompose button */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => handleDecomposePlan(false)}
                  disabled={isSearchingDrive}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:scale-98 disabled:opacity-60 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-purple-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isSearchingDrive ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>מאתר את הקובץ ב-Google Drive ומפרק שלבים...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 stroke-[2.5]" />
                      <span>פרק את התוכנית האמיתית לתתי משימות 🪄</span>
                    </>
                  )}
                </button>

                {/* Decompose feedback message / alert */}
                {decomposeNotice && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs leading-relaxed space-y-2 ${
                      decomposeNotice.type === 'success'
                        ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200'
                        : decomposeNotice.type === 'warning'
                        ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                        : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="flex-1 font-medium">{decomposeNotice.message}</div>
                    </div>

                    {decomposeNotice.type === 'error' && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleOpenNotebookLMForPlan}
                          className="px-2.5 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>פתח את NotebookLM להעתקת התוכנית ↗</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDecomposePlan(true)}
                          className="px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-semibold text-[11px] cursor-pointer transition-colors"
                        >
                          <span>צור שלבי תרגול לדוגמה בכל זאת</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Decomposed sub-tasks preview & Distribution controls */}
                {hasDecomposed && decomposedStages.length > 0 && (() => {
                  const distributedDates = calculateDistributedDates(
                    decomposedStages.length,
                    distributionStartDate || currentDate,
                    selectedPracticeDays
                  );

                  return (
                    <div className="p-3.5 bg-white dark:bg-slate-850 rounded-2xl border-2 border-emerald-400 dark:border-emerald-600 space-y-3.5 animate-in fade-in duration-200">
                      {/* Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>חולצו בהצלחה {decomposedStages.length} תתי-משימות אמיתיות לתוכנית:</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          ⏱️ סה״כ: {decomposedStages.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)} דקות
                        </span>
                      </div>

                      {/* Distribution Configuration Box */}
                      <div className="p-3 bg-gradient-to-r from-purple-50/80 to-indigo-50/80 dark:from-purple-950/40 dark:to-indigo-950/40 rounded-xl border border-purple-200/80 dark:border-purple-800/60 space-y-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <CalendarDays className="w-4 h-4 text-purple-600" />
                            <span>אופן פיזור ושיבוץ המשימות:</span>
                          </span>
                        </div>

                        {/* Mode Select Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setDistributionMode('spread')}
                            className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
                              distributionMode === 'spread'
                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5" />
                              <span>פיזור לאורך השבוע</span>
                            </div>
                            <span className={`text-[10px] font-normal ${distributionMode === 'spread' ? 'text-purple-100' : 'text-slate-400'}`}>
                              לפי ימי תרגול מוגדרים
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDistributionMode('backlog')}
                            className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
                              distributionMode === 'backlog'
                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              <Inbox className="w-3.5 h-3.5" />
                              <span>לבנק היעדים (Backlog)</span>
                            </div>
                            <span className={`text-[10px] font-normal ${distributionMode === 'backlog' ? 'text-purple-100' : 'text-slate-400'}`}>
                              כל המשימות ישמרו בבנק
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDistributionMode('none')}
                            className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 text-center transition-all cursor-pointer ${
                              distributionMode === 'none'
                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-purple-300'
                            }`}
                          >
                            <div className="flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5" />
                              <span>ללא שיבוץ כעת</span>
                            </div>
                            <span className={`text-[10px] font-normal ${distributionMode === 'none' ? 'text-purple-100' : 'text-slate-400'}`}>
                              שמירה במחברת בלבד
                            </span>
                          </button>
                        </div>

                        {/* When 'spread' is active: configuration for days per week */}
                        {distributionMode === 'spread' && (
                          <div className="p-3 bg-white/90 dark:bg-slate-900/90 rounded-xl border border-purple-200 dark:border-purple-800/70 space-y-2.5 animate-in fade-in duration-150">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-bold text-slate-700 dark:text-slate-300">
                                כמה ימים בשבוע מתוכנן התרגול?
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="text-[11px] text-slate-400">החל מתאריך:</span>
                                <input
                                  type="date"
                                  value={distributionStartDate}
                                  onChange={(e) => setDistributionStartDate(e.target.value)}
                                  className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 font-semibold focus:outline-none"
                                />
                              </div>
                            </div>

                            {/* Preset pills */}
                            <div className="flex flex-wrap gap-1.5">
                              {PRESETS.map((p) => {
                                const isSelected =
                                  selectedPracticeDays.length === p.days.length &&
                                  p.days.every(d => selectedPracticeDays.includes(d));
                                return (
                                  <button
                                    key={p.label}
                                    type="button"
                                    onClick={() => setSelectedPracticeDays(p.days)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-200 border-purple-300 dark:border-purple-700 font-bold'
                                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    {p.label}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Day toggles */}
                            <div className="flex items-center gap-1 pt-1 flex-wrap">
                              <span className="text-[11px] text-slate-400 shrink-0 ml-1">ימי השבוע:</span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {DAYS_OF_WEEK.map(({ day, label, name }) => {
                                  const active = selectedPracticeDays.includes(day);
                                  return (
                                    <button
                                      key={day}
                                      type="button"
                                      onClick={() => {
                                        if (active) {
                                          if (selectedPracticeDays.length > 1) {
                                            setSelectedPracticeDays(selectedPracticeDays.filter(d => d !== day));
                                          }
                                        } else {
                                          setSelectedPracticeDays([...selectedPracticeDays, day].sort());
                                        }
                                      }}
                                      className={`w-7 h-7 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                                        active
                                          ? 'bg-purple-600 text-white shadow-xs'
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-200'
                                      }`}
                                      title={`יום ${name}`}
                                    >
                                      {label}
                                    </button>
                                  );
                                })}
                              </div>
                              <span className="text-[11px] text-purple-600 dark:text-purple-400 font-bold mr-auto">
                                ({selectedPracticeDays.length} ימים בשבוע)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Stages preview list with destination date & per-stage actions */}
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {decomposedStages.map((stg, i) => {
                          const override = stageScheduleOverrides[stg.id];
                          const targetDate = override || (distributionMode === 'spread' ? distributedDates[i] : distributionMode === 'backlog' ? 'backlog' : null);

                          return (
                            <div
                              key={stg.id || i}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {i + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <span className="font-semibold text-slate-800 dark:text-slate-100 block truncate">
                                    {stg.title}
                                  </span>
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                                    ⏱️ {stg.durationMinutes} דק׳
                                  </span>
                                </div>
                              </div>

                              {/* Planned Date / Status Badge & Quick Actions */}
                              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                {targetDate ? (
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                                      targetDate === 'backlog'
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300'
                                        : 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300'
                                    }`}
                                  >
                                    {targetDate === 'backlog' ? '📥 בנק היעדים' : `📅 ${formatHebrewDateDisplay(targetDate)}`}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded border border-dashed border-slate-300">
                                    ללא שיבוץ
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => setStageScheduleOverrides(prev => ({ ...prev, [stg.id]: 'backlog' }))}
                                  className="px-2 py-0.8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 text-[10px] font-semibold cursor-pointer"
                                  title="שים שלב זה בבנק היעדים"
                                >
                                  לבנק
                                </button>

                                <label
                                  className="relative px-2 py-0.8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-600 dark:text-slate-300 text-[10px] font-semibold flex items-center gap-0.5 cursor-pointer"
                                  title="שבץ שלב זה ליום ספציפי"
                                >
                                  <Calendar className="w-2.5 h-2.5 text-purple-600" />
                                  <span>ליום...</span>
                                  <input
                                    type="date"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        setStageScheduleOverrides(prev => ({ ...prev, [stg.id]: e.target.value }));
                                      }
                                    }}
                                  />
                                </label>

                                <button
                                  type="button"
                                  onClick={() => setStageScheduleOverrides(prev => ({ ...prev, [stg.id]: currentDate }))}
                                  className="px-2 py-0.8 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 text-[10px] font-semibold cursor-pointer"
                                  title="שבץ שלב זה להיום"
                                >
                                  להיום
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Submit / Finish */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
                  className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>שמור מחברת זו והחל תוכנית 🚀</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
