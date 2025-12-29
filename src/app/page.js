"use client";

import React, { useState, useEffect } from 'react';
import Disclaimer from './components/Disclaimer';
import EquipmentInput from './components/EquipmentInput';

export default function Home() {
  const [appState, setAppState] = useState('loading'); // loading, disclaimer, input, generating
  const [equipment, setEquipment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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

    // В будущем здесь будет вызов API для валидации
    // Имитируем задержку для согласования интерфейса
    try {
      console.log("Submit equipment:", data);
      await new Promise(r => setTimeout(r, 1500));

      // Для теста считаем всё валидным
      setEquipment(data);
      // setAppState('generating'); // Перейдем на следующий этап позже
      alert("Оборудование принято: " + data.model + ". Теперь мы можем перейти к генерации таблиц.");
    } catch (err) {
      setError("Ошибка при проверке оборудования");
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
            Инженер по надёжности и НСИ
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

      {error && (
        <div className="max-w-2xl mx-auto mt-4 p-4 bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Progress placeholder for later */}
      {equipment && (
        <div className="max-w-2xl mx-auto mt-8 p-6 bg-blue-50 border-l-4 border-blue-600 opacity-60">
          <p className="text-xs uppercase font-bold text-blue-800">Активное оборудование:</p>
          <p className="text-lg font-medium text-blue-900">{equipment.manufacturer} {equipment.model} ({equipment.type})</p>
        </div>
      )}
    </main>
  );
}
