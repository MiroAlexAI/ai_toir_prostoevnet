"use client";

import React, { useState, useEffect } from 'react';
import Disclaimer from './components/Disclaimer';
import EquipmentInput from './components/EquipmentInput';
import TableGenerator from './components/TableGenerator';

export default function Home() {
  const [appState, setAppState] = useState('loading'); // loading, disclaimer, input, generating
  const [equipment, setEquipment] = useState(null);
  const [abbreviation, setAbbreviation] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
      const prompt = `Проверь, является ли это реальным промышленным оборудованием или его частью: 
Участок: ${data.site}
Тип: ${data.type}
Модель: ${data.model}
Год: ${data.year}
Производитель: ${data.manufacturer}

Твой ответ должен содержать ТОЛЬКО одно слово: 'valid' если это похоже на реальное оборудование, или 'invalid' если это абракадабра, шутка или не относится к технике. 
Если 'invalid', через запятую кратко напиши причину на русском.
Пример: invalid, это персонаж мультфильма`;

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const result = await response.json();

      if (result.error) throw new Error(result.error);

      const responseText = result.result.trim().toLowerCase();

      if (responseText.startsWith('valid')) {
        setEquipment(data);
        setAbbreviation(generateAbbreviation(data));
        setAppState('generating');
      } else {
        const reason = responseText.split(',')[1] || "укажите аналог или проверьте данные";
        setError(`Оборудование не найдено: ${reason}`);
      }
    } catch (err) {
      setError("Ошибка при проверке оборудования: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-12 flex justify-between items-end border-b-4 border-blue-600 pb-4">
        <div>
          <h1 className="text-3xl font-black text-blue-900 uppercase tracking-tighter">
            Инженер по надёжности и НСИ для Простоев.НЕТ
          </h1>
          <p className="text-blue-600 font-bold uppercase text-xs tracking-[0.2em] mt-1">
            Система интеллектуального анализа ТОиР
          </p>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-[10px] text-slate-400 font-mono uppercase">Status: Automated Analysis</div>
          <div className="text-[10px] text-slate-400 font-mono uppercase">Ref: RCM-FMEA-STD</div>
        </div>
      </div>

      {appState === 'disclaimer' && (
        <Disclaimer onAccept={handleDisclaimerAccept} />
      )}

      {appState === 'input' && (
        <EquipmentInput onSubmit={handleEquipmentSubmit} isLoading={isLoading} />
      )}

      {appState === 'generating' && (
        <TableGenerator equipment={equipment} abbreviation={abbreviation} />
      )}

      {error && (
        <div className="max-w-2xl mx-auto mt-4 p-4 bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Progress placeholder for later */}
      {equipment && appState === 'input' && (
        <div className="max-w-2xl mx-auto mt-8 p-6 bg-blue-50 border-l-4 border-blue-600 opacity-60">
          <p className="text-xs uppercase font-bold text-blue-800">Активное оборудование:</p>
          <p className="text-lg font-medium text-blue-900">{equipment.manufacturer} {equipment.model} ({equipment.type})</p>
        </div>
      )}
    </main>
  );
}
