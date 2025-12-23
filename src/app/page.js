"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const [headlines, setHeadlines] = useState([]);
  const [loadingHeadlines, setLoadingHeadlines] = useState(true);
  const [newsCategory, setNewsCategory] = useState("global"); // "global" or "industry"

  const fetchHeadlines = async (category) => {
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
  };

  useEffect(() => {
    fetchHeadlines(newsCategory);
  }, [newsCategory]);

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
      setResult(actionType === 'telegram' ? "✍️ Генерируем Telegram-пост..." : "🧐 Анализируем влияние на рынки...");

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

      setResult({
        text: displayResult,
        model: aiData.model
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
    setResult("🕵️‍♂️ Изучаем информационную повестку...");

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

      setResult({
        text: `**🔍 Анализ влияния мировых СМИ:**\n\n${aiData.translation}`,
        model: aiData.model
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

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-[#d4d4d4] font-sans selection:bg-orange-500/30 selection:text-white flex flex-col relative overflow-hidden">

      {/* Background decorations - Desert Vibes */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-orange-900/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-stone-800/10 rounded-full blur-[120px] pointer-events-none" />

      <main className="flex-grow flex flex-col items-center justify-start p-6 sm:p-24 relative z-10 text-center">

        <div className="mb-12 space-y-4">
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight uppercase">
            Новостной <span className="bg-gradient-to-r from-orange-500 via-amber-200 to-stone-400 bg-clip-text text-transparent">аналитик</span>
          </h1>
          <p className="text-stone-600 text-[10px] font-black uppercase tracking-[0.5em] mt-2">
            Новостные заголовки за {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-stone-500 text-lg sm:text-xl font-medium max-w-2xl mx-auto pt-2">
            Осмысленный обзор мировых событий и их последствий.
          </p>
        </div>

        {/* Dynamic Headlines Block - Simple List */}
        <div className="w-full max-w-4xl mb-12 text-left">
          <div className="flex items-center justify-between mb-4 px-2 border-b border-stone-800 pb-2">
            <div className="flex gap-4">
              <button
                onClick={() => setNewsCategory("global")}
                className={`text-[10px] font-black uppercase tracking-[0.4em] transition-colors ${newsCategory === "global" ? "text-orange-700 underline underline-offset-8" : "text-stone-700 hover:text-stone-500"}`}
              >
                Глобальная повестка
              </button>
              <button
                onClick={() => setNewsCategory("industry")}
                className={`text-[10px] font-black uppercase tracking-[0.4em] transition-colors ${newsCategory === "industry" ? "text-orange-700 underline underline-offset-8" : "text-stone-700 hover:text-stone-500"}`}
              >
                Промышленность
              </button>
            </div>
            {loadingHeadlines && <div className="w-2 h-2 bg-orange-600 rounded-full animate-ping"></div>}
          </div>

          <div className="space-y-1">
            {headlines.length > 0 ? (
              headlines.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setUrl(item.link)}
                  className="w-full group flex items-center gap-4 py-3 px-4 hover:bg-stone-900/40 transition-colors border-b border-stone-900/20 last:border-0 text-left"
                >
                  <span className="text-[9px] font-black text-stone-600 uppercase w-16 shrink-0 group-hover:text-orange-900 transition-colors">
                    {item.source}
                  </span>
                  <p className="text-sm font-medium text-stone-400 group-hover:text-stone-100 transition-colors line-clamp-1">
                    {item.title}
                  </p>
                </button>
              ))
            ) : !loadingHeadlines && (
              <div className="py-8 text-center text-stone-800 text-xs italic">
                Информационные каналы пусты. Введите URL вручную.
              </div>
            )}
          </div>
        </div>

        <div className="w-full max-w-3xl bg-stone-900/20 backdrop-blur-md border border-stone-800/50 rounded-sm p-8 shadow-2xl transition-all duration-500 hover:border-orange-900/20">

          <div className="space-y-6">
            <div className="text-left space-y-2">
              <label className="text-[10px] font-black text-orange-700 uppercase tracking-[0.2em] ml-1">
                Введите URL новостной статьи
              </label>
              <div className="relative group">
                <input
                  type="url"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-[#121212] border border-stone-800 rounded-sm px-4 py-4 pr-12 text-stone-300 placeholder-stone-800 focus:outline-none focus:border-orange-900/50 transition-all font-mono text-sm"
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
                label="Пост для Telegram"
                onClick={() => handleAction("telegram")}
                isLoading={loading && activeAction === "telegram"}
                disabled={loading}
                color="orange"
              />
              <ActionButton
                label="Аналитика"
                onClick={() => handleAction("analytics")}
                isLoading={loading && activeAction === "analytics"}
                disabled={loading}
                color="stone"
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
            <div className={`mt-8 p-8 rounded-sm border border-stone-800/50 text-left transition-all duration-700 ${loading ? 'bg-stone-900/10 animate-pulse h-32 text-stone-700' : 'bg-black/10'}`}>
              {loading ? (
                <div className="flex items-center justify-center h-full gap-3 text-[10px] font-bold uppercase tracking-widest text-stone-600">
                  <div className="w-1 h-1 bg-orange-900 rounded-full animate-ping" />
                  <span>Системный анализ...</span>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none">
                  <div className="whitespace-pre-wrap leading-relaxed text-stone-400 text-sm font-medium">
                    {result.text}
                  </div>
                  <div className="mt-4 flex flex-col gap-1 border-stone-900/40 pt-4 border-t">
                    <span className="text-[9px] font-black uppercase tracking-widest text-stone-700">
                      Использован: {result.model}
                    </span>
                    <span className="text-[9px] font-bold text-orange-900/60 uppercase tracking-widest italic">
                      Совет: если ответ отсутствует, повторите через 30-60 сек для восстановления лимитов или попробуйте другую ссылку.
                    </span>
                  </div>
                  <div className="mt-6 pt-6 border-t border-stone-800/50 flex justify-end">
                    <button
                      onClick={() => navigator.clipboard.writeText(result.text)}
                      className="text-[9px] font-black uppercase text-stone-700 hover:text-orange-600 transition-colors tracking-widest"
                    >
                      Копировать результат
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      <footer className="py-8 text-center text-stone-800 text-[9px] font-black tracking-[0.4em] uppercase relative z-10">
        <p>A.I. ANALYST • DESERT OPS • V1.5</p>
      </footer>
    </div>
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
      <div className="relative h-full bg-[#121212]/90 backdrop-blur-sm rounded-sm px-6 py-4 flex items-center justify-center gap-3 group-hover:bg-[#121212]/60 transition-colors border border-white/5">
        <span className="font-bold text-[11px] uppercase tracking-widest">
          {label}
        </span>
        {isLoading && (
          <div className="w-3 h-3 border-2 border-stone-500 border-t-orange-500 rounded-full animate-spin" />
        )}
      </div>
    </button>
  );
}
