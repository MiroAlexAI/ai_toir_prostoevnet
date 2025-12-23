"use client";

import { useState } from "react";
import Image from "next/image";

export default function Home() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(null);

  const handleAction = async (actionType) => {
    if (!url) {
      alert("Пожалуйста, введите URL статьи");
      return;
    }

    setLoading(true);
    setActiveAction(actionType);
    setResult("");

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

      // Display parsed data based on action type
      let displayResult = "";

      switch (actionType) {
        case "summary":
          displayResult = `**📄 Информация о статье:**\n\n**Заголовок:** ${articleData.title}\n\n**Дата публикации:** ${articleData.date}\n\n**Контент (фрагмент):**\n${articleData.content.substring(0, 500)}${articleData.content.length > 500 ? '...' : ''}`;
          break;
        case "theses":
          displayResult = `**📋 Структурированные данные:**\n\n\`\`\`json\n${JSON.stringify(articleData, null, 2)}\n\`\`\``;
          break;
        case "telegram":
          displayResult = `**📱 Данные для Telegram-поста:**\n\n**Заголовок:** ${articleData.title}\n**Дата:** ${articleData.date}\n**URL:** ${url}\n\n**Превью контента:**\n${articleData.content.substring(0, 300)}...`;
          break;
        case "translate":
          // Call translation API
          setResult("🔄 Выполняется перевод статьи...");

          const translateResponse = await fetch('/api/translate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: articleData.content,
              title: articleData.title
            }),
          });

          if (!translateResponse.ok) {
            const errorData = await translateResponse.json();
            throw new Error(errorData.error || 'Ошибка при переводе');
          }

          const translationData = await translateResponse.json();
          displayResult = `**📊 Анализ и влияние на рынки:**\n\n${translationData.translation}`;
          break;
        default:
          displayResult = JSON.stringify(articleData, null, 2);
      }

      setResult(displayResult);
    } catch (error) {
      setResult(`❌ **Ошибка:** ${error.message}\n\nПроверьте корректность URL и доступность сайта.`);
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#ededed] font-sans selection:bg-blue-500 selection:text-white flex flex-col relative overflow-hidden">

      {/* Background decorations */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />

      <main className="flex-grow flex flex-col items-center justify-center p-6 sm:p-24 relative z-10 text-center">

        <div className="mb-12 space-y-4">
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
            AI <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">Reader</span>
          </h1>
          <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto">
            Превращаем длинные статьи в понятные инсайты за секунды.
          </p>
        </div>

        <div className="w-full max-w-3xl bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl ring-1 ring-white/10 transition-all duration-300 hover:shadow-blue-500/10">

          <div className="space-y-6">
            <div className="relative group">
              <input
                type="url"
                placeholder="Вставьте ссылку на статью (https://...)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all group-hover:bg-black/30"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -z-10 blur-sm" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ActionButton
                label="О чем статья?"
                onClick={() => handleAction("summary")}
                isLoading={loading && activeAction === "summary"}
                disabled={loading}
                color="blue"
              />
              <ActionButton
                label="Тезисы"
                onClick={() => handleAction("theses")}
                isLoading={loading && activeAction === "theses"}
                disabled={loading}
                color="purple"
              />
              <ActionButton
                label="Пост для Telegram"
                onClick={() => handleAction("telegram")}
                isLoading={loading && activeAction === "telegram"}
                disabled={loading}
                color="pink"
              />
              <ActionButton
                label="Перевод"
                onClick={() => handleAction("translate")}
                isLoading={loading && activeAction === "translate"}
                disabled={loading}
                color="green"
              />
            </div>
          </div>

          {/* Result Block */}
          {(result || loading) && (
            <div className={`mt-8 p-6 rounded-xl border border-white/10 text-left transition-all duration-500 ${loading ? 'bg-white/5 animate-pulse h-32' : 'bg-black/20'}`}>
              {loading ? (
                <div className="flex items-center justify-center h-full text-gray-400 gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span>Анализируем контент...</span>
                </div>
              ) : (
                <div className="prose prose-invert max-w-none">
                  <div className="whitespace-pre-wrap leading-relaxed text-gray-200">
                    {result}
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                    <button
                      onClick={() => navigator.clipboard.writeText(result)}
                      className="text-xs text-gray-500 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                      Копировать
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      <footer className="py-6 text-center text-gray-600 text-sm relative z-10">
        <p>Antigravity AI Agent • Built with Next.js & Tailwind</p>
      </footer>
    </div>
  );
}

function ActionButton({ label, onClick, isLoading, disabled, color }) {
  const colorStyles = {
    blue: "from-blue-600 to-blue-400 hover:shadow-blue-500/25",
    purple: "from-violet-600 to-violet-400 hover:shadow-violet-500/25",
    pink: "from-fuchsia-600 to-pink-400 hover:shadow-pink-500/25",
    green: "from-emerald-600 to-green-400 hover:shadow-emerald-500/25",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative overflow-hidden group rounded-xl p-[1px] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] disabled:opacity-50 disabled:cursor-not-allowed
        ${disabled ? '' : 'hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200'}
      `}
    >
      <span className={`absolute inset-0 bg-gradient-to-br ${colorStyles[color]} opacity-70 group-hover:opacity-100 transition-opacity`} />
      <div className="relative h-full bg-[#0a0a0a]/90 backdrop-blur-xl rounded-xl px-4 py-3 flex items-center justify-center gap-2 group-hover:bg-[#0a0a0a]/70 transition-colors">
        <span className="font-medium text-white text-sm sm:text-base">
          {label}
        </span>
        {isLoading && (
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
      </div>
    </button>
  );
}
