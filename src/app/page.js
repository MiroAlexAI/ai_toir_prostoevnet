"use client";

import React, { useState, useEffect } from 'react';
import Disclaimer from './components/Disclaimer';
import EquipmentInput from './components/EquipmentInput';
import TableGenerator from './components/TableGenerator';

export default function Home() {
  const [appState, setAppState] = useState('loading'); // loading, disclaimer, input, generating
  const [equipment, setEquipment] = useState(null);
  const [abbreviation, setAbbreviation] = useState('');
  const [analogues, setAnalogues] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDataModified, setIsDataModified] = useState(false);

  const generateAbbreviation = (data) => {
    const site = data.site.substring(0, 3).toUpperCase();
    const type = data.type.substring(0, 3).toUpperCase();
    const model = data.model.replace(/\s/g, '').substring(0, 4).toUpperCase();
    const year = data.year.toString().slice(-2);
    return `${site}-${type}-${model}-${year}`;
  };

  useEffect(() => {
    const accepted = localStorage.getItem('toir_disclaimer_accepted');
    if (accepted) {
      setAppState('input');
    } else {
      setAppState('disclaimer');
    }
  }, []);

  const handleDisclaimerAccept = () => {
    setAppState('input');
  };

  const handleEquipmentSubmit = async (data) => {
    setIsLoading(true);
    setError(null);

    try {
      const prompt = `Проанализируй оборудование: 
Участок: ${data.site}
Тип: ${data.type}
Модель: ${data.model}
Год: ${data.year}
Производитель: ${data.manufacturer}

Задание:
1. Проверь валидность оборудования (valid/invalid).
2. Найди 3 реальных ближайших аналога этого оборудования.

Ответь СТРОГО В ФОРМАТЕ JSON следующей структуры:
{
  "status": "valid" или "invalid",
  "reason": "причина если invalid",
  "analogues": ["Модель 1 (Название)", "Модель 2 (Название)", "Модель 3 (Название)"]
}`;

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      const parsed = JSON.parse(result.result.replace(/```json|```/g, '').trim());

      if (parsed.status === 'valid') {
        setEquipment(data);
        setAbbreviation(generateAbbreviation(data));
        setAnalogues(parsed.analogues || []);
        setAppState('generating');
        setIsDataModified(false);
      } else {
        setError(`Оборудование не нацдено: ${parsed.reason || "укажите аналог"}`);
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

      {appState === 'disclaimer' && (
        <Disclaimer onAccept={handleDisclaimerAccept} />
      )}

      <div className="space-y-8">
        {(appState === 'input' || appState === 'generating') && (
          <EquipmentInput
            onSubmit={handleEquipmentSubmit}
            isLoading={isLoading}
            hasAnalysis={appState === 'generating' && isDataModified}
            isModified={onFormChange}
          />
        )}

        {error && (
          <div className="max-w-4xl mx-auto mt-4 p-4 bg-red-50 border border-red-200 text-red-600 text-xs font-bold uppercase rounded">
            {error}
          </div>
        )}

        {appState === 'generating' && (
          <div className="space-y-8">
            <div className="max-w-4xl mx-auto p-4 bg-blue-50 border-l-4 border-blue-600 animate-in fade-in duration-700">
              <p className="text-[10px] uppercase font-bold text-blue-800 mb-2">Найдено 3 ближайших аналога:</p>
              <div className="flex gap-4">
                {analogues.map((a, i) => (
                  <div key={i} className="px-3 py-1 bg-white border border-blue-200 text-[10px] font-bold text-blue-900 rounded shadow-sm">
                    {a}
                  </div>
                ))}
              </div>
            </div>

            <div className={isDataModified ? "opacity-50 grayscale pointer-events-none transition-all duration-300" : "transition-all duration-300"}>
              <TableGenerator equipment={equipment} abbreviation={abbreviation} reset={isDataModified} />
            </div>
          </div>
        )}
      </div>

      <footer className="max-w-5xl mx-auto mt-20 pt-8 border-t border-slate-200 text-center">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          Разработано для образовательных целей компании Простоев.НЕТ
        </p>
      </footer>
    </main>
  );
}
