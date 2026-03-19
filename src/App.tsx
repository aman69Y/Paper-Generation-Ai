import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, 
  FileText, 
  Download, 
  User, 
  BookOpen, 
  GraduationCap, 
  Layers, 
  ChevronRight, 
  Loader2, 
  Trash2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  Settings,
  LogOut,
  Image as ImageIcon,
  Sparkles,
  Send,
  X,
  Bot,
  Bookmark,
  ImagePlus,
  XCircle,
  Mic,
  MicOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JoditEditor from 'jodit-react';
import { 
  PaperConfig, 
  QuestionPaper, 
  Question, 
  QuestionMix,
  generateQuestionPaper,
  fetchChapters,
  editPaperWithAI
} from './services/geminiService';
import { downloadHTMLAsPDF } from './services/pdfService';
import { generatePaperHTML } from './services/htmlGenerator';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AppState = 'onboarding' | 'dashboard' | 'create' | 'view' | 'bookmarks';

interface UserInfo {
  name: string;
  email: string;
  subject: string;
  board: string;
  classFrom: string;
  classTo: string;
}

export default function App() {
  const [state, setState] = useState<AppState>('onboarding');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [currentPaper, setCurrentPaper] = useState<QuestionPaper | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('fusion_user_v2');
    const savedPapers = localStorage.getItem('fusion_papers_v2');
    if (savedUser) {
      setUserInfo(JSON.parse(savedUser));
      setState('dashboard');
    }
    if (savedPapers) {
      setPapers(JSON.parse(savedPapers));
    }
  }, []);

  const handleOnboarding = (info: UserInfo) => {
    setUserInfo(info);
    localStorage.setItem('fusion_user_v2', JSON.stringify(info));
    setState('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('fusion_user_v2');
    setUserInfo(null);
    setState('onboarding');
  };

  const handleCreatePaper = async (config: Omit<PaperConfig, 'teacherName' | 'subject' | 'board'>) => {
    if (!userInfo) return;
    
    const fullConfig: PaperConfig = {
      ...config,
      teacherName: userInfo.name,
      subject: userInfo.subject,
      board: userInfo.board,
    };

    try {
      const questions = await generateQuestionPaper(fullConfig);
      const newPaper: QuestionPaper = {
        id: Math.random().toString(36).substr(2, 9),
        title: `${userInfo.subject} - Class ${config.classLevel} (${config.difficulty})`,
        config: fullConfig,
        questions,
        createdAt: new Date().toISOString(),
      };

      const updatedPapers = [newPaper, ...papers];
      setPapers(updatedPapers);
      localStorage.setItem('fusion_papers_v2', JSON.stringify(updatedPapers));
      setCurrentPaper(newPaper);
      setState('view');
    } catch (error) {
      console.error(error);
      alert("Failed to generate paper. Please try again.");
    }
  };

  const deletePaper = (id: string) => {
    const updated = papers.filter(p => p.id !== id);
    setPapers(updated);
    localStorage.setItem('fusion_papers_v2', JSON.stringify(updated));
  };

  const handleUpdatePaper = (updatedPaper: QuestionPaper) => {
    const updatedPapers = papers.map(p => p.id === updatedPaper.id ? updatedPaper : p);
    setPapers(updatedPapers);
    localStorage.setItem('fusion_papers_v2', JSON.stringify(updatedPapers));
    setCurrentPaper(updatedPaper);
  };

  const toggleBookmark = (id: string) => {
    const updatedPapers = papers.map(p => p.id === id ? { ...p, isBookmarked: !p.isBookmarked } : p);
    setPapers(updatedPapers);
    localStorage.setItem('fusion_papers_v2', JSON.stringify(updatedPapers));
  };

  if (state === 'onboarding') {
    return <OnboardingView onComplete={handleOnboarding} />;
  }

  return (
    <div className="min-h-screen flex bg-adobe-bg">
      {/* Sidebar (Desktop) */}
      <aside className="w-64 bg-adobe-sidebar text-white flex-col hidden md:flex shadow-xl z-10">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-lg shadow-sm">
            F
          </div>
          <span className="font-semibold tracking-wide text-lg">FusionAi</span>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          <button 
            onClick={() => setState('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
              state === 'dashboard' ? "bg-white/10 text-white shadow-sm" : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>
          <button 
            onClick={() => setState('bookmarks')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
              state === 'bookmarks' ? "bg-white/10 text-white shadow-sm" : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <Bookmark size={18} /> Bookmarks
          </button>
          <button 
            onClick={() => setState('create')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
              state === 'create' ? "bg-white/10 text-white shadow-sm" : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
          >
            <Plus size={18} /> Create Paper
          </button>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-white/5 rounded-xl">
            <div className="w-10 h-10 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center shrink-0">
              <User size={18} />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{userInfo?.name}</span>
              <span className="text-xs text-gray-400 truncate">{userInfo?.email}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative pb-16 md:pb-0">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-adobe-border p-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
              F
            </div>
            <span className="font-semibold text-adobe-text text-lg">FusionAi</span>
          </div>
          <button onClick={handleLogout} className="text-adobe-text-muted hover:text-adobe-text p-2 bg-gray-50 rounded-full">
            <LogOut size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
          <AnimatePresence mode="wait">
            {state === 'dashboard' && (
              <DashboardView 
                key="dashboard" 
                papers={papers} 
                onCreate={() => setState('create')} 
                onView={(p) => { setCurrentPaper(p); setState('view'); }}
                onDelete={deletePaper}
                onToggleBookmark={toggleBookmark}
              />
            )}
            {state === 'bookmarks' && (
              <DashboardView 
                key="bookmarks" 
                papers={papers} 
                onCreate={() => setState('create')} 
                onView={(p) => { setCurrentPaper(p); setState('view'); }}
                onDelete={deletePaper}
                onToggleBookmark={toggleBookmark}
                filter="bookmarks"
              />
            )}
            {state === 'create' && userInfo && (
              <CreatePaperView 
                key="create" 
                userInfo={userInfo}
                onSubmit={handleCreatePaper} 
                onBack={() => setState('dashboard')} 
              />
            )}
            {state === 'view' && currentPaper && (
              <PaperDetailView 
                key="view" 
                paper={currentPaper} 
                onBack={() => setState('dashboard')} 
                onUpdate={handleUpdatePaper}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-adobe-border flex items-center justify-around p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <button 
            onClick={() => setState('dashboard')}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl min-w-[64px]",
              state === 'dashboard' ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
            )}
          >
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <div className="relative flex flex-col items-center justify-end h-[50px] min-w-[64px]">
            <button 
              onClick={() => setState('create')}
              className="absolute -top-6 flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            >
              <Plus size={28} />
            </button>
            <span className="text-[10px] font-medium text-blue-600 mb-2">Create</span>
          </div>
          <button 
            onClick={() => setState('bookmarks')}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-xl min-w-[64px]",
              state === 'bookmarks' ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
            )}
          >
            <Bookmark size={20} />
            <span className="text-[10px] font-medium">Saved</span>
          </button>
        </nav>
      </main>
    </div>
  );
}

// --- VIEWS ---

function OnboardingView({ onComplete }: { onComplete: (info: UserInfo) => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<UserInfo>({
    name: '',
    email: '',
    subject: '',
    board: 'NCERT',
    classFrom: '1',
    classTo: '12'
  });

  const boards = ['NCERT', 'CBSE', 'ICSE', 'State Board (Maharashtra)', 'State Board (UP)', 'State Board (Other)'];
  const classes = Array.from({length: 12}, (_, i) => (i + 1).toString());

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) setStep(step + 1);
    else onComplete(formData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-adobe-bg p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md adobe-card p-6 md:p-10"
      >
        <div className="flex items-center justify-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
            F
          </div>
        </div>
        
        <h2 className="text-2xl font-semibold text-center mb-2 text-adobe-text">Create your workspace</h2>
        <p className="text-sm text-adobe-text-muted text-center mb-8">Step {step} of 3</p>

        <form onSubmit={handleNext} className="space-y-6">
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="space-y-4">
                <div>
                  <label className="adobe-label">Full Name</label>
                  <input 
                    required autoFocus
                    type="text" 
                    placeholder="e.g. Dr. Sarah Smith"
                    className="adobe-input"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="adobe-label">Email Address</label>
                  <input 
                    required
                    type="email" 
                    placeholder="sarah@school.edu"
                    className="adobe-input"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="space-y-4">
                <div>
                  <label className="adobe-label">Primary Subject</label>
                  <input 
                    required autoFocus
                    type="text" 
                    placeholder="e.g. Mathematics"
                    className="adobe-input"
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                  />
                </div>
                <div>
                  <label className="adobe-label">Educational Board</label>
                  <select 
                    className="adobe-input"
                    value={formData.board}
                    onChange={e => setFormData({...formData, board: e.target.value})}
                  >
                    {boards.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="space-y-4">
                <label className="adobe-label">Classes Taught</label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <span className="text-xs text-adobe-text-muted mb-1 block">From Class</span>
                    <select 
                      className="adobe-input"
                      value={formData.classFrom}
                      onChange={e => setFormData({...formData, classFrom: e.target.value})}
                    >
                      {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex-1">
                    <span className="text-xs text-adobe-text-muted mb-1 block">To Class</span>
                    <select 
                      className="adobe-input"
                      value={formData.classTo}
                      onChange={e => setFormData({...formData, classTo: e.target.value})}
                    >
                      {classes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex gap-3 pt-4">
            {step > 1 && (
              <button 
                type="button" 
                onClick={() => setStep(step - 1)}
                className="adobe-btn-secondary flex-1"
              >
                Back
              </button>
            )}
            <button type="submit" className="adobe-btn flex-1">
              {step === 3 ? 'Complete Setup' : 'Continue'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function DashboardView({ 
  papers, 
  onCreate, 
  onView,
  onDelete,
  onToggleBookmark,
  filter = 'all'
}: { 
  papers: QuestionPaper[], 
  onCreate: () => void, 
  onView: (p: QuestionPaper) => void,
  onDelete: (id: string) => void,
  onToggleBookmark: (id: string) => void,
  filter?: 'all' | 'bookmarks'
}) {
  const filteredPapers = filter === 'bookmarks' ? papers.filter(p => p.isBookmarked) : papers;
  
  const sortedPapers = [...filteredPapers].sort((a, b) => {
    if (a.isBookmarked && !b.isBookmarked) return -1;
    if (!a.isBookmarked && b.isBookmarked) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-adobe-text">
            {filter === 'bookmarks' ? 'Bookmarked Papers' : 'Recent Papers'}
          </h1>
          <p className="text-sm text-adobe-text-muted mt-1">
            {filter === 'bookmarks' ? 'Access your saved question papers.' : 'Manage your generated question papers.'}
          </p>
        </div>
      </div>

      {filteredPapers.length === 0 ? (
        <div className="adobe-card p-12 flex flex-col items-center justify-center text-center border-dashed">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
            {filter === 'bookmarks' ? <Bookmark size={24} /> : <FileText size={24} />}
          </div>
          <h3 className="text-base font-medium text-adobe-text mb-1">
            {filter === 'bookmarks' ? 'No bookmarked papers' : 'No papers generated yet'}
          </h3>
          <p className="text-sm text-adobe-text-muted mb-6">
            {filter === 'bookmarks' ? 'Bookmark a paper to see it here.' : 'Create your first AI-powered question paper.'}
          </p>
          {filter !== 'bookmarks' && (
            <button onClick={onCreate} className="adobe-btn">
              Create Paper
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-adobe-border rounded-2xl overflow-hidden shadow-sm">
          <div className="hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-adobe-border text-xs uppercase text-adobe-text-muted">
                <tr>
                  <th className="px-6 py-4 font-medium w-10"></th>
                  <th className="px-6 py-4 font-medium">Title</th>
                  <th className="px-6 py-4 font-medium">Class</th>
                  <th className="px-6 py-4 font-medium">Marks</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-adobe-border">
                {sortedPapers.map((paper) => (
                  <tr key={paper.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => onToggleBookmark(paper.id)}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          paper.isBookmarked ? "text-yellow-500 hover:text-yellow-600 bg-yellow-50" : "text-gray-300 hover:text-gray-400 opacity-0 group-hover:opacity-100"
                        )}
                      >
                        <Bookmark size={18} fill={paper.isBookmarked ? "currentColor" : "none"} />
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-adobe-text cursor-pointer hover:text-blue-600 transition-colors" onClick={() => onView(paper)}>
                        {paper.title}
                      </div>
                      <div className="text-xs text-adobe-text-muted mt-1">{paper.config.board}</div>
                    </td>
                    <td className="px-6 py-4 text-adobe-text-muted">Class {paper.config.classLevel}</td>
                    <td className="px-6 py-4 text-adobe-text-muted">{paper.config.totalMarks}</td>
                    <td className="px-6 py-4 text-adobe-text-muted">{new Date(paper.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            const html = paper.htmlContent || generatePaperHTML(paper);
                            downloadHTMLAsPDF(html, `${paper.config.subject}_Class${paper.config.classLevel}_Paper.pdf`);
                          }}
                          className="p-2 text-adobe-text-muted hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <Download size={16} />
                        </button>
                        <button 
                          onClick={() => onDelete(paper.id)}
                          className="p-2 text-adobe-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile List View */}
          <div className="md:hidden divide-y divide-adobe-border">
            {sortedPapers.map((paper) => (
              <div key={paper.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1" onClick={() => onView(paper)}>
                    <h3 className="font-medium text-adobe-text text-base leading-tight mb-1">{paper.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-adobe-text-muted">
                      <span className="bg-gray-100 px-2 py-0.5 rounded-md">{paper.config.board}</span>
                      <span>Class {paper.config.classLevel}</span>
                      <span>•</span>
                      <span>{paper.config.totalMarks} Marks</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => onToggleBookmark(paper.id)}
                    className={cn(
                      "p-2 rounded-lg transition-colors shrink-0",
                      paper.isBookmarked ? "text-yellow-500 bg-yellow-50" : "text-gray-400 bg-gray-50"
                    )}
                  >
                    <Bookmark size={18} fill={paper.isBookmarked ? "currentColor" : "none"} />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">{new Date(paper.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const html = paper.htmlContent || generatePaperHTML(paper);
                        downloadHTMLAsPDF(html, `${paper.config.subject}_Class${paper.config.classLevel}_Paper.pdf`);
                      }}
                      className="p-2 text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Download size={16} />
                    </button>
                    <button 
                      onClick={() => onDelete(paper.id)}
                      className="p-2 text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function CreatePaperView({ 
  userInfo,
  onSubmit, 
  onBack 
}: { 
  userInfo: UserInfo,
  onSubmit: (config: any) => Promise<void>, 
  onBack: () => void 
}) {
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFetchingChapters, setIsFetchingChapters] = useState(false);
  const [availableChapters, setAvailableChapters] = useState<string[]>([]);
  
  const [config, setConfig] = useState({
    classLevel: userInfo.classFrom,
    totalMarks: 50,
    timeDuration: '3 Hours',
    chapters: [] as string[],
    questionMix: [] as QuestionMix[],
    difficulty: 'Medium'
  });

  const qTypes = [
    'MCQ', 'Short Answer', 'Long Answer', 
    'True/False', 'Fill in the Blanks', 
    'Match the Following', 'Case Study/Paragraph'
  ];
  const difficulties = ['Easy', 'Medium', 'Hard'];

  // Generate class options based on teacher's range
  const classOptions = [];
  const start = parseInt(userInfo.classFrom);
  const end = parseInt(userInfo.classTo);
  for(let i = start; i <= end; i++) {
    classOptions.push(i.toString());
  }

  const handleFetchChapters = async () => {
    setIsFetchingChapters(true);
    try {
      const chapters = await fetchChapters(userInfo.board, userInfo.subject, config.classLevel);
      setAvailableChapters(chapters);
      setStep(2);
    } catch (error) {
      console.error("Error fetching chapters:", error);
      alert("Failed to fetch chapters. Please try again.");
    } finally {
      setIsFetchingChapters(false);
    }
  };

  const toggleChapter = (chapter: string) => {
    setConfig(prev => ({
      ...prev,
      chapters: prev.chapters.includes(chapter)
        ? prev.chapters.filter(c => c !== chapter)
        : [...prev.chapters, chapter]
    }));
  };

  const addQuestionMix = (type: string) => {
    if (!config.questionMix.find(m => m.type === type)) {
      setConfig(prev => ({
        ...prev,
        questionMix: [...prev.questionMix, { type, count: 1, marksPerQuestion: 1 }]
      }));
    }
  };

  const removeQuestionMix = (type: string) => {
    setConfig(prev => ({
      ...prev,
      questionMix: prev.questionMix.filter(m => m.type !== type)
    }));
  };

  const updateQuestionMix = (type: string, field: keyof QuestionMix, value: number) => {
    setConfig(prev => ({
      ...prev,
      questionMix: prev.questionMix.map(m => m.type === type ? { ...m, [field]: isNaN(value) ? 0 : value } : m)
    }));
  };

  const handleGenerate = async () => {
    if (config.questionMix.length === 0) {
      alert("Please select at least one question type.");
      return;
    }
    const configuredMarks = config.questionMix.reduce((acc, m) => acc + (m.count * m.marksPerQuestion), 0);
    if (configuredMarks !== config.totalMarks) {
      alert(`Configured marks (${configuredMarks}) do not match Total Marks (${config.totalMarks}). Please adjust the question mix.`);
      return;
    }
    setIsGenerating(true);
    await onSubmit(config);
    // isGenerating is handled by parent unmounting this component on success
  };

  if (isGenerating) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <Loader2 size={48} className="animate-spin text-adobe-blue mx-auto mb-6" />
        <h2 className="text-xl font-semibold text-adobe-text mb-2">Generating Paper...</h2>
        <p className="text-sm text-adobe-text-muted">
          Analyzing {config.chapters.length} chapters and generating {config.totalMarks} marks worth of questions. This may take up to 30 seconds.
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-3xl mx-auto"
    >
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 text-adobe-text-muted hover:bg-white rounded-sm border border-transparent hover:border-adobe-border transition-all">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-adobe-text">Configure Paper</h1>
          <p className="text-sm text-adobe-text-muted">Step {step} of 3</p>
        </div>
      </div>

      <div className="adobe-card p-8">
        {step === 1 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b border-adobe-border pb-2 mb-4">Basic Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="adobe-label">Target Class</label>
                <select 
                  className="adobe-input"
                  value={config.classLevel}
                  onChange={e => setConfig({...config, classLevel: e.target.value})}
                >
                  {classOptions.map(c => <option key={c} value={c}>Class {c}</option>)}
                </select>
              </div>
              <div>
                <label className="adobe-label">Time Duration</label>
                <input 
                  type="text" 
                  placeholder="e.g. 3 Hours"
                  className="adobe-input"
                  value={config.timeDuration}
                  onChange={e => setConfig({...config, timeDuration: e.target.value})}
                />
              </div>
              <div>
                <label className="adobe-label">Total Marks</label>
                <input 
                  type="number" 
                  min="10" max="100" step="5"
                  className="adobe-input"
                  value={config.totalMarks || ''}
                  onChange={e => {
                    const val = parseInt(e.target.value, 10);
                    setConfig({...config, totalMarks: isNaN(val) ? 0 : val});
                  }}
                />
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <button 
                onClick={handleFetchChapters} 
                disabled={isFetchingChapters}
                className="adobe-btn"
              >
                {isFetchingChapters ? <Loader2 size={16} className="animate-spin" /> : null}
                Next: Select Chapters
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium border-b border-adobe-border pb-2 mb-4">Select Chapters</h3>
            <p className="text-sm text-adobe-text-muted mb-4">
              Fetched from {userInfo.board} Class {config.classLevel} {userInfo.subject} syllabus.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto p-1">
              {availableChapters.length === 0 ? (
                <div className="col-span-2 text-center py-8 text-adobe-text-muted text-sm">
                  No chapters found. Please go back and try again.
                </div>
              ) : (
                availableChapters.map(chapter => (
                  <label 
                    key={chapter}
                    className={cn(
                      "flex items-start gap-3 p-3 border rounded-sm cursor-pointer transition-colors",
                      config.chapters.includes(chapter) 
                        ? "border-adobe-blue bg-blue-50/50" 
                        : "border-adobe-border hover:border-gray-300"
                    )}
                  >
                    <input 
                      type="checkbox" 
                      className="mt-1"
                      checked={config.chapters.includes(chapter)}
                      onChange={() => toggleChapter(chapter)}
                    />
                    <span className="text-sm leading-tight">{chapter}</span>
                  </label>
                ))
              )}
            </div>

            <div className="pt-6 flex justify-between">
              <button onClick={() => setStep(1)} className="adobe-btn-secondary">Back</button>
              <button 
                onClick={() => setStep(3)} 
                disabled={config.chapters.length === 0}
                className="adobe-btn"
              >
                Next: Configure Questions
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium border-b border-adobe-border pb-2 mb-4">Question Mix</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {qTypes.map(type => {
                  const isSelected = config.questionMix.some(m => m.type === type);
                  return (
                    <button
                      key={type}
                      onClick={() => isSelected ? removeQuestionMix(type) : addQuestionMix(type)}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium border transition-colors",
                        isSelected
                          ? "bg-adobe-text text-white border-adobe-text"
                          : "bg-white text-adobe-text-muted border-adobe-border hover:border-gray-400"
                      )}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
              
              {config.questionMix.length > 0 && (
                <div className="space-y-3 bg-gray-50 p-4 rounded-sm border border-adobe-border">
                  <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-adobe-text-muted uppercase tracking-wider mb-2">
                    <div className="col-span-6">Type</div>
                    <div className="col-span-3">Count</div>
                    <div className="col-span-3">Marks/Q</div>
                  </div>
                  {config.questionMix.map(mix => (
                    <div key={mix.type} className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-6 text-sm font-medium text-adobe-text">{mix.type}</div>
                      <div className="col-span-3">
                        <input 
                          type="number" min="1" className="adobe-input py-1 px-2 text-sm"
                          value={mix.count || ''} onChange={e => updateQuestionMix(mix.type, 'count', parseInt(e.target.value, 10))}
                        />
                      </div>
                      <div className="col-span-3">
                        <input 
                          type="number" min="1" className="adobe-input py-1 px-2 text-sm"
                          value={mix.marksPerQuestion || ''} onChange={e => updateQuestionMix(mix.type, 'marksPerQuestion', parseInt(e.target.value, 10))}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="pt-3 mt-3 border-t border-adobe-border flex justify-between text-sm font-medium">
                    <span>Total Configured Marks:</span>
                    <span className={cn(
                      config.questionMix.reduce((acc, m) => acc + (m.count * m.marksPerQuestion), 0) === config.totalMarks 
                        ? "text-green-600" : "text-red-600"
                    )}>
                      {config.questionMix.reduce((acc, m) => acc + (m.count * m.marksPerQuestion), 0)} / {config.totalMarks}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium border-b border-adobe-border pb-2 mb-4">Difficulty Level</h3>
              <div className="flex gap-3">
                {difficulties.map(d => (
                  <button
                    key={d}
                    onClick={() => setConfig({...config, difficulty: d})}
                    className={cn(
                      "flex-1 py-2 rounded-sm text-sm font-medium border transition-colors",
                      config.difficulty === d 
                        ? "border-adobe-blue text-adobe-blue bg-blue-50/50" 
                        : "border-adobe-border text-adobe-text-muted hover:border-gray-400"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-sm border border-adobe-border flex items-start gap-3">
              <ImageIcon size={20} className="text-adobe-text-muted shrink-0 mt-0.5" />
              <p className="text-xs text-adobe-text-muted leading-relaxed">
                <strong>AI Image Generation:</strong> If a question requires a diagram or illustration, our AI will automatically generate it and include it in the final PDF.
              </p>
            </div>

            <div className="pt-6 flex justify-between">
              <button onClick={() => setStep(2)} className="adobe-btn-secondary">Back</button>
              <button 
                onClick={handleGenerate} 
                disabled={config.questionMix.length === 0}
                className="adobe-btn"
              >
                Generate Paper
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  isProcessing?: boolean;
  image?: string;
}

function PaperDetailView({ paper, onBack, onUpdate }: { paper: QuestionPaper, onBack: () => void, onUpdate: (p: QuestionPaper) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [savedContent, setSavedContent] = useState(paper.htmlContent || generatePaperHTML(paper));
  const [htmlContent, setHtmlContent] = useState(savedContent);
  const [isDirty, setIsDirty] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    role: 'ai',
    content: "Hi! I'm your AI Assistant. I can help you edit this document. Try asking me to:\n\n• Make the questions harder\n• Translate the paper to Hindi\n• Add more multiple choice questions\n• Fix spelling and grammar"
  }]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef(null);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setAiPrompt(prev => prev + transcript + ' ');
          } else {
            currentTranscript += transcript;
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isAiProcessing]);

  const handleSave = () => {
    setSavedContent(htmlContent);
    setIsDirty(false);
    onUpdate({ ...paper, htmlContent });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAiEdit = async () => {
    if (!aiPrompt.trim() && !selectedImage) return;
    
    const userMsg: ChatMessage = { 
      id: Date.now().toString(), 
      role: 'user', 
      content: aiPrompt || "Please use this image.",
      image: selectedImage || undefined
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    setAiPrompt('');
    setSelectedImage(null);
    setIsAiProcessing(true);
    
    try {
      const newHtml = await editPaperWithAI(savedContent, userMsg.content, userMsg.image);
      setSavedContent(newHtml);
      setHtmlContent(newHtml);
      onUpdate({ ...paper, htmlContent: newHtml });
      
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "I've updated the document based on your instructions. Let me know if you need any further changes!"
      }]);
    } catch (error) {
      setChatMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "Sorry, I encountered an error while trying to apply those edits. Please try again."
      }]);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleExport = () => {
    downloadHTMLAsPDF(savedContent, `${paper.config.subject}_Class${paper.config.classLevel}_Paper.pdf`);
  };

  const editorConfig = useMemo(() => ({
    readonly: false,
    height: '100%',
    theme: 'default',
    enableDragAndDropFileToEditor: true,
    uploader: {
      insertImageAsBase64URI: true
    },
    style: {
      fontFamily: "'Inter', sans-serif",
      fontSize: '14px',
    },
    controls: {
      font: {
        list: {
          "'Inter', sans-serif": 'Inter',
          "'Roboto', sans-serif": 'Roboto',
          "'Open Sans', sans-serif": 'Open Sans',
          "'Lato', sans-serif": 'Lato',
          "'Montserrat', sans-serif": 'Montserrat',
          "'Merriweather', serif": 'Merriweather',
          "'Playfair Display', serif": 'Playfair Display',
          "'Times New Roman', Times, serif": 'Times New Roman',
          "Arial, Helvetica, sans-serif": 'Arial',
          "Georgia, serif": 'Georgia',
          "'Courier New', Courier, monospace": 'Courier New'
        }
      }
    },
    toolbarSticky: false,
    showCharsCounter: true,
    showWordsCounter: true,
    showXPathInStatusbar: false,
    buttons: [
      'undo', 'redo', '|',
      'font', 'fontsize', 'brush', 'paragraph', '|',
      'bold', 'strikethrough', 'underline', 'italic', '|',
      'ul', 'ol', '|',
      'outdent', 'indent', 'align', '|',
      'image', 'table', 'link', 'hr', '|',
      'eraser', 'copyformat', 'print', 'source'
    ]
  }), []);

  if (isEditing) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col">
        {/* Editor Topbar */}
        <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <button 
              onClick={() => {
                if (isDirty && !confirm("You have unsaved changes. Are you sure you want to exit?")) return;
                setIsEditing(false);
                setHtmlContent(savedContent);
                setIsDirty(false);
              }} 
              className="text-gray-500 hover:text-gray-800 flex items-center gap-2 font-medium transition-colors shrink-0"
            >
              <ArrowLeft size={18} /> <span className="hidden sm:inline">Exit Editor</span>
            </button>
            <div className="h-6 w-px bg-gray-300 shrink-0"></div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-gray-800 text-sm truncate">{paper.title}</span>
              <div className="flex items-center gap-2 mt-0.5">
                {isDirty ? (
                  <span className="flex items-center gap-1 text-amber-600 text-xs font-medium">
                    <AlertCircle size={12} /> <span className="hidden sm:inline">Unsaved changes</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                    <CheckCircle2 size={12} /> <span className="hidden sm:inline">Saved</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-2">
            <button 
              onClick={handleSave} 
              disabled={!isDirty} 
              className={cn(
                "px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
                isDirty 
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" 
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"
              )}
            >
              <CheckCircle2 size={16} /> <span className="hidden sm:inline">Save Document</span><span className="sm:hidden">Save</span>
            </button>
          </div>
        </div>

        {/* Editor Canvas */}
        <div className="flex-1 overflow-hidden flex flex-col bg-[#f3f4f6]">
          <JoditEditor
            ref={editorRef}
            value={htmlContent}
            config={editorConfig}
            onBlur={newContent => {
              setHtmlContent(newContent);
              if (newContent !== savedContent) setIsDirty(true);
            }}
            onChange={newContent => {
              setHtmlContent(newContent);
              if (newContent !== savedContent) setIsDirty(true);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("w-full mx-auto pb-20 transition-all duration-300", isAiChatOpen ? "md:pr-[400px] max-w-7xl" : "max-w-5xl")}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 mt-4 md:mt-8 px-4 md:px-8">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium text-adobe-text-muted hover:text-adobe-text transition-colors self-start">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div className="flex flex-wrap gap-2 md:gap-3">
          <button onClick={() => setIsAiChatOpen(!isAiChatOpen)} className="adobe-btn-secondary flex-1 md:flex-none flex items-center justify-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
            <Sparkles size={16} /> AI Edit
          </button>
          <button onClick={() => setIsEditing(true)} className="adobe-btn-secondary flex-1 md:flex-none flex items-center justify-center gap-2">
            <FileText size={16} /> Edit Paper
          </button>
          <button onClick={handleExport} className="adobe-btn flex-1 md:flex-none flex items-center justify-center gap-2">
            <Download size={16} /> Export PDF
          </button>
        </div>
      </div>

      <div className="px-4 md:px-8 transition-all duration-300">
        <div className="adobe-card overflow-hidden bg-white p-6 md:p-10 shadow-sm min-h-[800px]">
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: savedContent }}
          />
        </div>
      </div>

      <AnimatePresence>
        {isAiChatOpen && (
          <motion.div 
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-screen w-full md:w-[400px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200"
          >
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-3 text-gray-900 font-semibold">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M50 20 L80 50 L50 80 L20 50 Z" stroke="currentColor" strokeWidth="8" strokeLinejoin="round"/>
                    <path d="M50 35 L55 45 L65 50 L55 55 L50 65 L45 55 L35 50 L45 45 Z" fill="currentColor"/>
                  </svg>
                </div>
                <span>AI Edit</span>
              </div>
              <button 
                onClick={() => setIsAiChatOpen(false)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 p-5 overflow-y-auto bg-gray-50/50 flex flex-col gap-4">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-3 max-w-[90%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", 
                    msg.role === 'user' ? "bg-gray-200 text-gray-600" : "bg-gray-900 text-white"
                  )}>
                    {msg.role === 'user' ? <User size={16} /> : (
                      <svg width="16" height="16" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M50 20 L80 50 L50 80 L20 50 Z" stroke="currentColor" strokeWidth="8" strokeLinejoin="round"/>
                        <path d="M50 35 L55 45 L65 50 L55 55 L50 65 L45 55 L35 50 L45 45 Z" fill="currentColor"/>
                      </svg>
                    )}
                  </div>
                  <div className={cn("p-3 rounded-2xl text-sm whitespace-pre-wrap flex flex-col gap-2", 
                    msg.role === 'user' 
                      ? "bg-gray-100 text-gray-800 rounded-tr-sm" 
                      : "bg-white border border-gray-100 shadow-sm text-gray-700 rounded-tl-sm"
                  )}>
                    {msg.image && (
                      <img src={msg.image} alt="Uploaded" className="max-w-full rounded-lg border border-gray-200" />
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {isAiProcessing && (
                <div className="flex gap-3 max-w-[90%]">
                  <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M50 20 L80 50 L50 80 L20 50 Z" stroke="currentColor" strokeWidth="8" strokeLinejoin="round"/>
                      <path d="M50 35 L55 45 L65 50 L55 55 L50 65 L45 55 L35 50 L45 45 Z" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="p-4 rounded-2xl rounded-tl-sm bg-white border border-gray-100 shadow-sm flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-gray-900" />
                    <span className="text-sm text-gray-500 font-medium">Applying edits...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-gray-100 bg-white shrink-0">
              {selectedImage && (
                <div className="mb-3 relative inline-block">
                  <img src={selectedImage} alt="Preview" className="h-20 rounded-lg border border-gray-200" />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 bg-white rounded-full text-gray-500 hover:text-red-500 shadow-sm border border-gray-200"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              )}
              <div className="relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:border-gray-900 focus-within:ring-1 focus-within:ring-gray-900 transition-all">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 shrink-0 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Upload Image"
                >
                  <ImagePlus size={20} />
                </button>
                <button 
                  onClick={toggleListening}
                  className={cn(
                    "w-10 h-10 shrink-0 flex items-center justify-center rounded-lg transition-colors",
                    isListening ? "text-red-500 bg-red-50 hover:bg-red-100" : "text-gray-500 hover:text-gray-900 hover:bg-gray-200"
                  )}
                  title={isListening ? "Stop Listening" : "Start Voice Input"}
                >
                  {isListening ? <MicOff size={20} className="animate-pulse" /> : <Mic size={20} />}
                </button>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ask AI to change the document..."
                  className="w-full bg-transparent py-2.5 text-sm resize-none focus:outline-none min-h-[40px] max-h-[120px]"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAiEdit();
                    }
                  }}
                  disabled={isAiProcessing}
                />
                <button 
                  onClick={handleAiEdit}
                  disabled={isAiProcessing || (!aiPrompt.trim() && !selectedImage)}
                  className="w-10 h-10 shrink-0 flex items-center justify-center bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={18} className={isAiProcessing ? "opacity-0" : "opacity-100"} />
                  {isAiProcessing && <Loader2 size={18} className="animate-spin absolute" />}
                </button>
              </div>
              <div className="text-center mt-2">
                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">AI can make mistakes. Review edits carefully.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


