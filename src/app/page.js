"use client";

import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [headlines, setHeadlines] = useState([]);
  const [loadingHeadlines, setLoadingHeadlines] = useState(true);
  const [newsCategory, setNewsCategory] = useState("global"); // "global" or "industry"

  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [stats, setStats] = useState({ total_requests: 0, telegram_posts: 0, analytics: 0, headlines: 0 });
  const [theme, setTheme] = useState("dark"); // "dark" or "light"
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(1.25); // 1.0, 1.25, 1.4
  const [availableVoices, setAvailableVoices] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const loadVoices = () => {
      if (!window.speechSynthesis) return;
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices.filter(v => v.lang.startsWith('ru')));
    };
    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const savedTheme = localStorage.getItem("app_theme") || "dark";
    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, [mounted]);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("app_theme", newTheme);
  };

  const toggleSpeech = (text) => {
    if (!text) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    // Принудительно останавливаем любой текущий синтез перед началом
    window.speechSynthesis.cancel();

    // Глубокая очистка текста от Markdown и лишних символов
    const cleanText = text
      .replace(/#{1,6}\s?/g, '') // Удаляем решетки заголовков ###
      .replace(/\*\*/g, '')      // Удаляем жирный шрифт **
      .replace(/\*/g, '')        // Удаляем курсив или маркеры *
      .replace(/__/g, '')        // Удаляем подчеркивание __
      .replace(/`/g, '')         // Удаляем код `
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Оставляем только текст ссылок
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Удаляем эмодзи
      .replace(/^\s*[-+*]\s+/gm, '. ') // Превращаем маркеры списков в начале строк в точки
      .replace(/\n+/g, '. ')     // Заменяем переносы строк на точки для пауз
      .replace(/\s+/g, ' ')      // Схлопываем лишние пробелы
      .trim();

    if (!cleanText) return;

    // Разбиваем текст на чанки (предложения)
    const chunks = cleanText.split(/(?<=[.!?])\s+(?=[А-ЯA-Z])|(?<=[.!?])\s*$/).filter(c => c.trim().length > 0);

    // Если split не сработал или текст короткий, используем весь текст
    const finalChunks = chunks.length > 0 ? chunks : [cleanText];

    const voices = window.speechSynthesis.getVoices();
    const russianVoices = voices.filter(v => v.lang.startsWith('ru'));
    const voice = russianVoices.find(v =>
      v.name.toLowerCase().includes('irina') ||
      v.name.toLowerCase().includes('katya') ||
      v.name.toLowerCase().includes('elena') ||
      v.name.toLowerCase().includes('google')
    ) || russianVoices[0];

    setIsSpeaking(true);

    // Запускаем с микро-задержкой, чтобы браузер успел обработать команду cancel()
    setTimeout(() => {
      chunks.forEach((chunk, index) => {
        const trimmedChunk = chunk.trim();
        if (!trimmedChunk) return;

        const utterance = new SpeechSynthesisUtterance(trimmedChunk);
        utterance.rate = voiceSpeed;
        utterance.pitch = 0.7; // Низкий тембр
        if (voice) utterance.voice = voice;

        // Сбрасываем флаг только на последнем фрагменте
        if (index === chunks.length - 1) {
          utterance.onend = () => setIsSpeaking(false);
        }

        utterance.onerror = (e) => {
          if (e.error !== 'interrupted' && e.error !== 'canceled') {
            console.error("Chunk Speech error:", e.error);
          }
          if (index === chunks.length - 1) setIsSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
      });
    }, 50);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (data.history) setHistory(data.history);
      }
    } catch (e) {
      console.error("Failed to fetch stats/history", e);
    }
  };

  const updateGlobalStats = async (type, entry) => {
    try {
      const res = await fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, entry })
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (data.history) setHistory(data.history);
      }
    } catch (e) {
      console.error("Failed to update stats/history", e);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const addToHistory = (text, model, sourceUrl, title) => {
    const newEntry = {
      id: Date.now(),
      text,
      model,
      url: sourceUrl,
      title: title || "Анализ",
      date: new Date().toLocaleString('ru-RU')
    };

    setHistory(prev => {
      const updated = [newEntry, ...prev].slice(0, 5);
      localStorage.setItem("news_history", JSON.stringify(updated));
      return updated;
    });
  };

  const handleAction = async (actionType) => {
    if (!url) {
      alert("Пожалуйста, введите URL статьи");
      return;
    }

    setLoading(true);
    setActiveAction(actionType);
    setResult(null);

    try {
      // First, parse the article
      const parseResponse = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!parseResponse.ok) {
        throw new Error('Ошибка при парсинге статьи');
      }

      const articleData = await parseResponse.json();

      if (articleData.error) {
        throw new Error(articleData.error);
      }

      // Call AI API for both actions
      setResult({
        text: actionType === 'telegram' ? "✍️ Генерируем Telegram-пост..." : "🧐 Анализируем влияние на рынки...",
        model: "Система"
      });

      const aiResponse = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: articleData.content,
          title: articleData.title,
          action: actionType
        }),
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json();
        const err = new Error(errorData.error || 'Ошибка при обработке AI');
        err.details = errorData.details;
        err.model = errorData.model;
        throw err;
      }

      const aiData = await aiResponse.json();

      let displayResult = "";
      if (actionType === "telegram") {
        displayResult = `**📱 Готовый пост для Telegram:**\n\n${aiData.translation}`;
      } else {
        displayResult = `**📊 Анализ и влияние на рынки:**\n\n${aiData.translation}`;
      }

      const selectedHeadline = headlines.find(h => h.link === url);
      const resultTitle = selectedHeadline ? selectedHeadline.title : (articleData.title || "Анализ статьи");
      const resultSource = selectedHeadline ? selectedHeadline.source : (new URL(url).hostname.replace('www.', '').split('.')[0].toUpperCase());

      const finalResult = {
        text: displayResult,
        model: aiData.model,
        title: resultTitle,
        source: resultSource
      };

      setResult(finalResult);
      updateGlobalStats(actionType, {
        id: Date.now(),
        text: displayResult,
        model: aiData.model,
        url: url,
        title: resultTitle,
        source: resultSource,
        date: new Date().toLocaleString('ru-RU')
      });

    } catch (error) {
      setResult({
        text: `❌ **Ошибка:** ${error.message}${error.details ? '\n\nДетали: ' + (typeof error.details === 'object' ? JSON.stringify(error.details) : error.details) : ''}\n\nПроверьте корректность URL и доступность сайта.`,
        model: error.model || "Системная ошибка"
      });
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const handleHeadlinesAnalysis = async () => {
    if (headlines.length === 0) {
      alert("Сначала дождитесь загрузки заголовков");
      return;
    }

    setLoading(true);
    setActiveAction("headlines_analysis");
    setResult({
      text: "🕵️‍♂️ Изучаем информационную повестку...",
      model: "Система"
    });
    try {
      const headlinesText = headlines.map(h => `- [${h.source}] ${h.title}`).join('\n');

      const aiResponse = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: headlinesText,
          title: "Сводка заголовков",
          action: "headlines_analysis"
        }),
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json();
        const err = new Error(errorData.error || 'Ошибка при анализе заголовков');
        err.details = errorData.details;
        err.model = errorData.model;
        throw err;
      }

      const aiData = await aiResponse.json();
      const displayResult = `**🔍 Анализ влияния мировых СМИ:**\n\n${aiData.translation}`;

      setResult({
        text: displayResult,
        model: aiData.model,
        title: "Сводка новостных заголовков",
        source: "GLOBAL MEDIA"
      });

      updateGlobalStats('headlines', {
        id: Date.now(),
        text: displayResult,
        model: aiData.model,
        url: `Новостные заголовки ${new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
        title: "Сводка заголовков",
        date: new Date().toLocaleString('ru-RU')
      });

    } catch (error) {
      setResult({
        text: `❌ **Ошибка:** ${error.message}${error.details ? '\n\nДетали: ' + (typeof error.details === 'object' ? JSON.stringify(error.details) : error.details) : ''}`,
        model: error.model || "Системная ошибка"
      });
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  const fetchHeadlines = useCallback(async (category) => {
    if (category === "history") return;
    setLoadingHeadlines(true);
    try {
      const response = await fetch(`/api/headlines?category=${category}`);
      if (response.ok) {
        const data = await response.json();
        setHeadlines(data);
      }
    } catch (error) {
      console.error("Failed to fetch headlines:", error);
    } finally {
      setLoadingHeadlines(false);
    }
  }, []);

  useEffect(() => {
    fetchHeadlines(newsCategory);
    fetchStats();
  }, [newsCategory, fetchHeadlines]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans selection:bg-orange-500/30 selection:text-white flex flex-col relative overflow-hidden transition-colors duration-500">

      {/* Background decorations - Desert Vibes */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-orange-900/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-stone-800/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Theme Toggle - Fixed for mobile accessibility */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 bg-[var(--card-bg)] backdrop-blur-lg border border-[var(--border-color)] rounded-full text-[10px] font-black uppercase tracking-widest hover:border-[var(--accent)] transition-all hover:scale-105 active:scale-95 shadow-xl"
        title="Переключить тему"
      >
        {theme === "dark" ? (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
            <span className="hidden sm:inline">День</span>
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-stone-700"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
            <span className="hidden sm:inline">Ночь</span>
          </>
        )}
      </button>

      <main className="flex-grow flex flex-col items-center justify-start p-6 sm:p-24 relative z-10 text-center">

        <div className="mb-12 space-y-4 relative group">

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight uppercase">
            Новостной <span className="bg-gradient-to-r from-orange-600 via-amber-600 to-stone-500 bg-clip-text text-transparent">аналитик</span>
          </h1>
          <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.5em] mt-2 opacity-60 h-[10px]">
            {mounted && `Новостные заголовки за ${new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`}
          </p>
          <p className="text-[var(--text-muted)] text-lg sm:text-xl font-medium max-w-2xl mx-auto pt-2">
            Осмысленный обзор мировых событий и их последствий.
          </p>
        </div>

        {/* Dynamic Headlines Block - Simple List */}
        <div className="w-full max-w-4xl mb-12 text-left">
          {/* Steps Indicator - Tooltip-like */}
          <div className="flex items-center gap-6 mb-4 px-2 border-b border-stone-800/30 pb-4">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-600 text-[10px] font-black text-white shrink-0">1</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-900/60">Выберите новость</span>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setNewsCategory("global")}
                className={`text-[10px] font-black uppercase tracking-[0.4em] transition-colors ${newsCategory === "global" ? "text-orange-700 underline underline-offset-8" : "text-stone-700 hover:text-stone-500"}`}
              >
                Глобальная
              </button>
              <button
                onClick={() => setNewsCategory("industry")}
                className={`text-[10px] font-black uppercase tracking-[0.4em] transition-colors ${newsCategory === "industry" ? "text-orange-700 underline underline-offset-8" : "text-stone-700 hover:text-stone-500"}`}
              >
                Отраслевая
              </button>
              <button
                onClick={() => setNewsCategory("history")}
                className={`text-[10px] font-black uppercase tracking-[0.4em] transition-colors ${newsCategory === "history" ? "text-orange-700 underline underline-offset-8" : "text-stone-700 hover:text-stone-500"}`}
              >
                Журнал
              </button>
            </div>
            {loadingHeadlines && newsCategory !== "history" && <div className="ml-auto w-2 h-2 bg-orange-600 rounded-full animate-ping"></div>}
          </div>

          {newsCategory === "history" && (
            <div className="grid grid-cols-4 gap-2 mb-6 px-4 py-3 bg-orange-950/10 border border-orange-900/10 rounded-sm">
              <div className="text-center">
                <p className="text-[10px] font-black text-orange-900 uppercase tracking-tighter">Всего</p>
                <p className="text-lg font-mono text-stone-200">{stats.total_requests}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-stone-600 uppercase tracking-tighter">TG Посты</p>
                <p className="text-lg font-mono text-stone-400">{stats.telegram_posts}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-stone-600 uppercase tracking-tighter">Анализ</p>
                <p className="text-lg font-mono text-stone-400">{stats.analytics}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] font-black text-stone-600 uppercase tracking-tighter">Сводки</p>
                <p className="text-lg font-mono text-stone-400">{stats.headlines}</p>
              </div>
            </div>
          )}

          <div className="space-y-1">
            {newsCategory === "history" ? (
              history.length > 0 ? (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="w-full group py-4 px-4 bg-stone-900/10 hover:bg-stone-900/40 transition-colors border-b border-stone-900/20 last:border-0 text-left"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-black text-orange-900 uppercase tracking-widest">
                        {item.date}
                      </span>
                      {item.url && (
                        item.url.startsWith('http') ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[9px] font-black text-stone-600 hover:text-orange-600 uppercase transition-colors"
                          >
                            Источник ↗
                          </a>
                        ) : (
                          <span className="text-[9px] font-black text-stone-700 uppercase tracking-tight">
                            {item.url}
                          </span>
                        )
                      )}
                    </div>
                    <p className="text-sm font-bold text-stone-200 mb-2">{item.title}</p>
                    <div
                      className="text-xs text-stone-500 line-clamp-3 cursor-pointer hover:text-stone-300 transition-colors markdown-content"
                      onClick={() => {
                        setResult({ text: item.text, model: item.model });
                        setNewsCategory("global"); // Switch back to show result in main area
                        setTimeout(() => {
                          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                        }, 100);
                      }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {item.text}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-stone-800 text-xs italic uppercase tracking-widest">
                  Журнал пуст. Начните анализ статей.
                </div>
              )
            ) : (
              headlines.length > 0 ? (
                headlines.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setUrl(item.link);
                      setTimeout(() => {
                        const target = document.getElementById('action-card');
                        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 100);
                    }}
                    className={`w-full group flex items-center gap-4 py-3 px-4 transition-all border-b border-stone-900/20 last:border-0 text-left ${url === item.link ? 'bg-orange-800/10 border-l-2 border-l-orange-600' : 'hover:bg-stone-900/40'}`}
                  >
                    <span className={`text-[9px] font-black uppercase w-16 shrink-0 transition-colors ${url === item.link ? 'text-orange-600' : 'text-stone-600 group-hover:text-orange-900'}`}>
                      {item.source}
                    </span>
                    <p className={`text-sm font-medium transition-colors line-clamp-1 ${url === item.link ? 'text-orange-100 font-bold' : 'text-stone-400 group-hover:text-stone-100'}`}>
                      {item.title}
                    </p>
                    {url === item.link && (
                      <div className="ml-auto w-1.5 h-1.5 bg-orange-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(234,88,12,0.6)]"></div>
                    )}
                  </button>
                ))
              ) : !loadingHeadlines && (
                <div className="py-8 text-center text-stone-800 text-xs italic">
                  Информационные каналы пусты. Введите URL вручную.
                </div>
              )
            )}
          </div>
        </div>

        <div id="action-card" className={`w-full max-w-3xl bg-[var(--card-bg)] backdrop-blur-md border border-[var(--border-color)] rounded-sm p-8 shadow-2xl transition-all duration-500 ${url && !result ? 'ring-2 ring-orange-600/30 shadow-[0_0_40px_rgba(234,88,12,0.1)]' : 'hover:border-orange-900/20'}`}>

          <div className="space-y-6">
            <div className="text-left space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black text-white shrink-0 transition-colors ${url ? 'bg-green-600' : 'bg-orange-600'}`}>
                  {url ? '✓' : '2'}
                </span>
                <label className="text-[10px] font-black text-[var(--accent)] uppercase tracking-[0.2em]">
                  {url ? 'Новость выбрана' : 'Выберите действие'}
                </label>
              </div>
              <div className="relative group">
                <input
                  type="url"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-sm px-4 py-4 pr-12 text-[var(--foreground)] placeholder-stone-600 focus:outline-none focus:border-[var(--accent)] transition-all font-mono text-sm"
                />
                {url && (
                  <button
                    onClick={() => setUrl("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-700 hover:text-orange-700 transition-colors p-1"
                    title="Очистить"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2m-6 9v-4m4 4v-4" /></svg>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ActionButton
                label="Сократить для Telegram"
                onClick={() => handleAction("telegram")}
                isLoading={loading && activeAction === "telegram"}
                disabled={loading}
                color="orange"
              />
              <ActionButton
                label="Подробная аналитика статьи"
                onClick={() => handleAction("analytics")}
                isLoading={loading && activeAction === "analytics"}
                disabled={loading}
                color="orange"
              />
            </div>

            <div className="pt-2">
              <ActionButton
                label="📊 Анализ новостных заголовков"
                onClick={handleHeadlinesAnalysis}
                isLoading={loading && activeAction === "headlines_analysis"}
                disabled={loading}
                color="orange"
              />
            </div>
          </div>

          {/* Result Block */}
          {(result || loading) && (
            <div className={`mt-8 p-8 rounded-sm border border-[var(--border-color)] text-left transition-all duration-700 ${loading ? 'bg-orange-900/5 animate-pulse h-32 text-[var(--text-muted)]' : 'bg-black/5'}`}>
              {loading ? (
                <div className="flex items-center justify-center h-full gap-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  <div className="w-1 h-1 bg-[var(--accent)] rounded-full animate-ping" />
                  <span>Системный анализ...</span>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none">
                  {result.title && (
                    <div className="mb-6 pb-4 border-b border-stone-800/50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 bg-orange-600/10 px-2 py-0.5 rounded-sm border border-orange-600/20">
                          {result.source || "ИСТОЧНИК"}
                        </span>
                        <span className="text-[9px] font-bold text-stone-600 uppercase tracking-widest">
                          {new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </div>
                      <h2 className="text-xl font-black text-stone-100 uppercase tracking-tight leading-tight">
                        {result.title}
                      </h2>
                    </div>
                  )}
                  <div className="leading-relaxed text-stone-400 text-sm font-medium markdown-content">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.text}
                    </ReactMarkdown>
                  </div>
                  <div className="mt-4 flex flex-col gap-1 border-stone-900/40 pt-4 border-t">
                    <span className="text-[9px] font-bold text-orange-900/60 uppercase tracking-widest italic">
                      Совет: если ответ отсутствует, повторите через 30-60 сек для восстановления лимитов или попробуйте другую ссылку.
                    </span>
                  </div>
                  <div className="mt-6 pt-6 border-t border-stone-800/50 flex flex-wrap items-center justify-end gap-x-8 gap-y-4">
                    {/* Voice Controls */}
                    <div className="flex items-center gap-6 bg-[var(--input-bg)]/50 px-5 py-2 rounded-full border border-[var(--border-color)]">
                      <span className="text-[8px] font-black text-stone-600 uppercase tracking-widest">Скорость</span>
                      <div className="flex gap-4">
                        {[1.0, 1.25, 1.4].map(speed => (
                          <button
                            key={speed}
                            onClick={() => setVoiceSpeed(speed)}
                            className={`text-[9px] font-black transition-all ${voiceSpeed === speed ? "text-orange-500 scale-110" : "text-stone-700 hover:text-stone-500"}`}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <button
                        onClick={() => toggleSpeech(result.text)}
                        className={`text-[9px] font-black uppercase flex items-center gap-2 transition-colors tracking-widest ${isSpeaking ? 'text-orange-500 animate-pulse' : 'text-stone-700 hover:text-orange-600'}`}
                        title={isSpeaking ? "Остановить" : "Прослушать"}
                      >
                        {isSpeaking ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                            Остановить
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                            Озвучить
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => navigator.clipboard.writeText(result.text)}
                        className="text-[9px] font-black uppercase text-stone-700 hover:text-orange-600 transition-colors tracking-widest flex items-center gap-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        Копировать
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main >

      <footer className="py-8 text-center space-y-2 relative z-10">
        <p className="text-[var(--text-muted)] text-[9px] font-black tracking-[0.4em] uppercase opacity-40">
          A.I. ANALYST • DESERT OPS • V1.5
        </p>
        <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest opacity-60">
          поблагодарить автора telegram <a href="https://t.me/krabig" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:opacity-80 transition-opacity">@krabig</a>
        </p>
      </footer>
    </div >
  );
}

function ActionButton({ label, onClick, isLoading, disabled, color }) {
  const colorStyles = {
    orange: "from-orange-800 to-orange-600 text-orange-50",
    stone: "from-stone-800 to-stone-700 text-stone-300",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative overflow-hidden group rounded-sm p-[1px] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300
        ${disabled ? '' : 'hover:scale-[1.01] active:scale-[0.99]'}
      `}
    >
      <span className={`absolute inset-0 bg-gradient-to-br ${colorStyles[color]} opacity-80 group-hover:opacity-100 transition-opacity`} />
      <div className="relative h-full bg-[var(--input-bg)]/90 backdrop-blur-sm rounded-sm px-6 py-4 flex items-center justify-center gap-3 group-hover:bg-[var(--input-bg)]/60 transition-colors border border-white/5">
        <span className="font-bold text-[11px] uppercase tracking-widest">
          {label}
        </span>
        {isLoading && (
          <div className="w-3 h-3 border-2 border-stone-500 border-t-[var(--accent)] rounded-full animate-spin" />
        )}
      </div>
    </button>
  );
}
