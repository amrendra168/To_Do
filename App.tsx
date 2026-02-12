
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Task, Priority, FilterStatus, TaskStats, AppView, User } from './types';
import { STORAGE_KEY } from './constants';
import { capitalize, determinePriority, determineTags, isWithinLast30Days, isToday } from './utils/helpers';
import TaskItem from './components/TaskItem';
import FilterBar from './components/FilterBar';
import StatsOverview from './components/StatsOverview';
import ThemeToggle from './components/ThemeToggle';
import Navigation from './components/Navigation';
import RecordsView from './components/RecordsView';
import AuthView from './components/AuthView';

const THEME_KEY = 'smart_task_pro_theme';
const SESSION_KEY = 'smart_task_pro_session';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    return savedSession ? JSON.parse(savedSession) : null;
  });

  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  
  // Use a derived key for storage based on username
  const userStorageKey = currentUser ? `${STORAGE_KEY}_${currentUser.username}` : '';

  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Load tasks when user changes
  useEffect(() => {
    if (currentUser && userStorageKey) {
      const saved = localStorage.getItem(userStorageKey);
      const parsed = saved ? JSON.parse(saved) : [];
      
      const cleaned = parsed
        .filter((t: any) => isWithinLast30Days(t.createdAt))
        .map((t: any) => ({
          ...t,
          timeSpent: t.timeSpent || 0,
          isTimerRunning: !!t.isTimerRunning
        }));
      setTasks(cleaned);
    } else {
      setTasks([]);
    }
  }, [currentUser, userStorageKey]);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [filter, setFilter] = useState<FilterStatus>(FilterStatus.ALL);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Theme Sync
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDarkMode]);

  // Persistence
  useEffect(() => {
    if (currentUser && userStorageKey) {
      localStorage.setItem(userStorageKey, JSON.stringify(tasks));
    }
  }, [tasks, userStorageKey, currentUser]);

  // Session persistence
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [currentUser]);

  // Global Timer Logic
  useEffect(() => {
    if (!currentUser) return;
    const activeTasksCount = tasks.filter(t => t.isTimerRunning).length;
    if (activeTasksCount === 0) return;

    const interval = setInterval(() => {
      setTasks(prev => prev.map(t => 
        t.isTimerRunning ? { ...t, timeSpent: t.timeSpent + 1 } : t
      ));
    }, 1000);

    return () => clearInterval(interval);
  }, [tasks.some(t => t.isTimerRunning), currentUser]);

  const addTask = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const trimmedText = inputValue.trim();
    if (!trimmedText) {
      setError('Please enter a valid task description.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    const newTask: Task = {
      id: crypto.randomUUID(),
      text: capitalize(trimmedText),
      completed: false,
      createdAt: new Date().toISOString(),
      priority: determinePriority(trimmedText),
      tags: determineTags(trimmedText),
      timeSpent: 0,
      isTimerRunning: false
    };

    setTasks(prev => [newTask, ...prev]);
    setInputValue('');
    setError(null);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView(AppView.DASHBOARD);
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id 
        ? { ...t, completed: !t.completed, isTimerRunning: !t.completed ? false : t.isTimerRunning } 
        : t
    ));
  };

  const toggleTimer = (id: string) => {
    setTasks(prev => prev.map(t => 
      t.id === id 
        ? { ...t, isTimerRunning: !t.isTimerRunning } 
        : t
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const editTask = (id: string, newText: string) => {
    if (!newText.trim()) return;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, text: capitalize(newText.trim()) } : t));
  };

  const clearCompleted = () => {
    setTasks(prev => prev.filter(t => !t.completed));
  };

  const filteredTasks = useMemo(() => {
    switch (filter) {
      case FilterStatus.PENDING: return tasks.filter(t => !t.completed);
      case FilterStatus.COMPLETED: return tasks.filter(t => t.completed);
      default: return tasks;
    }
  }, [tasks, filter]);

  // Monthly stats
  const monthlyStats: TaskStats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter(t => !t.completed).length,
    completed: tasks.filter(t => t.completed).length
  }), [tasks]);

  // Daily stats
  const dailyStats: TaskStats = useMemo(() => {
    const pendingCount = tasks.filter(t => !t.completed).length;
    const completedTodayCount = tasks.filter(t => t.completed && isToday(t.createdAt)).length;
    
    return {
      total: pendingCount + completedTodayCount,
      pending: pendingCount,
      completed: completedTodayCount
    };
  }, [tasks]);

  const activeStats = currentView === AppView.DASHBOARD ? dailyStats : monthlyStats;
  const statsTitle = currentView === AppView.DASHBOARD ? "Daily Window Insights" : "Monthly Window Insights";

  if (!currentUser) {
    return (
      <div className="min-h-screen transition-colors duration-500 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-6xl mx-auto px-4 py-8 relative">
           <div className="absolute right-4 top-4">
              <ThemeToggle isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
            </div>
          <AuthView onLogin={setCurrentUser} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-500 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-20">
        <header className="mb-6 flex flex-col items-center relative">
          {/* Logout Option only on the Left */}
          <div className="absolute left-0 top-0 hidden sm:block animate-in fade-in slide-in-from-left-4 duration-500">
             <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
             >
               <i className="fa-solid fa-right-from-bracket"></i>
               Logout
             </button>
          </div>

          {/* Theme Toggle on the Right */}
          <div className="absolute right-0 top-0">
            <ThemeToggle isDarkMode={isDarkMode} onToggle={() => setIsDarkMode(!isDarkMode)} />
          </div>
          
          <div className="text-center mt-12 sm:mt-0 px-20">
            <h1 className="text-4xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight mb-2">
              SmartTask <span className="text-blue-600 dark:text-blue-500">Pro</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm sm:text-base">Performance tracking & productivity management.</p>
          </div>

          {/* Mobile Logout (Simplified) */}
          <div className="sm:hidden mt-6 flex items-center gap-3 px-3 py-1.5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
             <button onClick={handleLogout} className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
               <i className="fa-solid fa-right-from-bracket"></i>
               Logout
             </button>
          </div>
        </header>

        <Navigation currentView={currentView} setView={setCurrentView} />

        <StatsOverview stats={activeStats} title={statsTitle} />

        {currentView === AppView.DASHBOARD ? (
          <main className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/60 dark:shadow-none overflow-hidden border border-slate-100 dark:border-slate-800">
            <form onSubmit={addTask} className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Type a task (e.g. 'Meeting with client')..."
                    className={`w-full px-4 py-3 bg-white dark:bg-slate-800 border ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 dark:border-slate-700 focus:ring-4 focus:ring-blue-100/50 dark:focus:ring-blue-900/20 focus:border-blue-400 dark:focus:border-blue-600'} rounded-xl outline-none transition-all text-slate-700 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500`}
                  />
                  {error && (
                    <span className="absolute -bottom-6 left-1 text-xs font-semibold text-red-500 animate-pulse">
                      {error}
                    </span>
                  )}
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-blue-900/20 active:scale-95 transition-all flex items-center gap-2"
                >
                  <i className="fa-solid fa-plus"></i>
                  <span className="hidden sm:inline">Add Task</span>
                </button>
              </div>
            </form>

            <FilterBar 
              currentFilter={filter} 
              setFilter={setFilter} 
              onClearCompleted={clearCompleted}
              hasCompleted={tasks.filter(t => t.completed).length > 0}
            />

            <div className="divide-y divide-slate-50 dark:divide-slate-800 max-h-[500px] overflow-y-auto custom-scrollbar">
              {filteredTasks.length > 0 ? (
                filteredTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onToggle={toggleTask} 
                    onToggleTimer={toggleTimer}
                    onDelete={deleteTask}
                    onEdit={editTask}
                  />
                ))
              ) : (
                <div className="py-16 px-6 text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400 dark:text-slate-500">
                    <i className="fa-solid fa-clipboard-list text-2xl"></i>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300">No tasks found</h3>
                  <p className="text-slate-400 dark:text-slate-500 text-sm">Add some tasks to get started!</p>
                </div>
              )}
            </div>
          </main>
        ) : (
          <RecordsView tasks={tasks} />
        )}

        <footer className="mt-8 flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-full text-[10px] font-bold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
            <i className="fa-solid fa-shield-check text-blue-500"></i>
            ROLLING 30-DAY DATA PROTECTION ACTIVE
          </div>
          <p className="text-slate-400 dark:text-slate-600 text-xs">
            Personal data window active for <span className="text-slate-500 dark:text-slate-400 font-bold">{currentUser.username}</span>.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
