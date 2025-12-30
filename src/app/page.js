"use client";

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import Disclaimer from './components/Disclaimer';
import EquipmentInput from './components/EquipmentInput';
import TableGenerator from './components/TableGenerator';

export default function Home() {
  const [appState, setAppState] = useState('input'); // input, generating
  const [equipment, setEquipment] = useState(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [pendingData, setPendingData] = useState(null);
  const [abbreviation, setAbbreviation] = useState('');
  const [analogues, setAnalogues] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDataModified, setIsDataModified] = useState(false);
  const [inputPrefill, setInputPrefill] = useState(null);

  const handleAnalogClick = (analog) => {
    // Формат аналога предполагается как "Модель (Тип)" или просто "Модель"
    // Извлекаем тип если он есть в скобках
    const typeMatch = analog.match(/\((.*)\)/);
    const type = typeMatch ? typeMatch[1] : (equipment?.type || "");
    const model = analog.replace(/\s*\(.*\)/, "").trim();

    setInputPrefill({
      type: type,
      model: model
    });

    // Прокручиваем к форме
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const generateAbbreviation = (data) => {
    const site = data.site.substring(0, 3).toUpperCase();
    const type = data.type.substring(0, 3).toUpperCase();
    const model = data.model.replace(/\s/g, '').substring(0, 4).toUpperCase();
    const year = data.year.toString().slice(-2);
    return `${site}-${type}-${model}-${year}`;
  };

  const handleEquipmentSubmit = (data) => {
    setPendingData(data);
    setShowDisclaimer(true);
  };

  const processAnalysis = async (data) => {
    setShowDisclaimer(false);
    setIsLoading(true);
    setError(null);
    setEquipment(data);

    try {
      const prompt = `Данные: Отрасль: ${data.site}, Оборудование/Агрегат: ${data.type}, Модель: ${data.model}, Производитель: ${data.manufacturer}
Задание (будь КРАТОК):
1. Валидация (status: valid/invalid).
2. 3 реальных аналога (analogues). Формат: "Модель (Тип)".
3. Технические характеристики (purpose) в виде ПРОСТОГО СПИСКА (Параметр: Значение).

ВАЖНО: Ответ должен быть СТРОГИМ JSON. ОБЯЗАТЕЛЬНО экранируй переносы строк как \\n внутри JSON-строк. Не используй реальные переносы строк или символы табуляции внутри значений.

JSON формат:
{
  "status": "valid"|"invalid",
  "reason": "...",
  "purpose": "Характеристика 1: Значение\\nХарактеристика 2: Значение",
  "analogues": ["Модель 1 (Тип)", "Модель 2 (Тип)", "Модель 3 (Тип)"]
}`;

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      // Очистка и нормализация JSON от ИИ
      let cleanResult = result.result.replace(/```json|```/g, '').trim();

      // Исправление типичной ошибки ИИ: неэкранированные переносы строк внутри JSON-строк
      // Находим содержимое между кавычками и заменяем реальные переносы на \n
      cleanResult = cleanResult.replace(/"([^"]*)"/g, (match, p1) => {
        return '"' + p1.replace(/\n/g, '\\n').replace(/\r/g, '\\r') + '"';
      });

      const parsed = JSON.parse(cleanResult);

      if (parsed.status === 'valid') {
        const abbr = generateAbbreviation(data);
        setEquipment({ ...data, purpose: parsed.purpose });
        setAbbreviation(abbr);
        setAnalogues(parsed.analogues || []);
        setAppState('generating');
        setIsDataModified(false);
      } else {
        setError(`Оборудование не найдено: ${parsed.reason || "некорректные данные"}. Попробуйте корректные данные.`);
      }
    } catch (err) {
      setError("Ошибка при проверке оборудования: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onFormChange = () => {
    if (appState === 'generating') {
      setIsDataModified(true);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-slate-50">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8 flex justify-between items-end border-b-4 border-blue-600 pb-4">
        <div>
          <h1 className="text-2xl font-black text-blue-900 uppercase tracking-tighter">
            Инженер по надёжности и НСИ для Простоев.НЕТ
          </h1>
          <p className="text-blue-600 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">
            Система интеллектуального анализа ТОиР
          </p>
        </div>
      </div>

      {showDisclaimer && (
        <Disclaimer onAccept={() => processAnalysis(pendingData)} />
      )}

      <div className="space-y-8">
        <EquipmentInput
          onSubmit={handleEquipmentSubmit}
          isLoading={isLoading}
          hasAnalysis={appState === 'generating' && isDataModified}
          isModified={onFormChange}
          initialData={inputPrefill}
        />



        {error && (
          <div className="max-w-4xl mx-auto mt-4 p-4 bg-red-50 border border-red-200 text-red-600 text-xs font-bold uppercase rounded">
            {error}
          </div>
        )}

        {appState === 'generating' && (
          <div className="space-y-8">
            <div className="max-w-4xl mx-auto p-4 bg-blue-50 border-l-4 border-blue-600 animate-in fade-in duration-700">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-black text-blue-900 mb-2">Технические характеристики:</p>
                  <pre className="whitespace-pre-wrap font-sans text-[11px] text-blue-800 leading-tight">
                    {equipment?.purpose}
                  </pre>
                </div>
                <div className="bg-blue-900 text-white px-3 py-1 rounded font-mono text-xs font-bold shadow-md">
                  ID: {abbreviation}
                </div>
              </div>
            </div>

            <div className={isDataModified ? "opacity-50 grayscale pointer-events-none transition-all duration-300" : "transition-all duration-300"}>
              <TableGenerator
                equipment={equipment}
                abbreviation={abbreviation}
                reset={isDataModified}
                analogues={analogues}
                onAnalogClick={handleAnalogClick}
              />
            </div>
          </div>
        )}
      </div>

      <footer className="max-w-5xl mx-auto mt-20 pt-8 border-t border-slate-200 text-center">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          Разработано для образовательных целей компании Простоев.НЕТ
        </p>
      </footer>
    </main >
  );
}
