"use client";

import React, { useState, useEffect } from 'react';

export default function Disclaimer({ onAccept }) {
    const [isVisible, setIsVisible] = useState(false);
    const [step, setStep] = useState(1);

    useEffect(() => {
        const accepted = localStorage.getItem('toir_disclaimer_accepted');
        if (!accepted) {
            setIsVisible(true);
        }
    }, []);

    const handleConfirm = () => {
        if (step === 1) {
            setStep(2);
        } else {
            localStorage.setItem('toir_disclaimer_accepted', 'true');
            setIsVisible(false);
            onAccept();
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="max-w-md w-full gost-card p-8 space-y-6">
                <div className="gost-header pb-2 text-xl">
                    Внимание / Disclaimer
                </div>

                <div className="text-slate-700 leading-relaxed font-medium">
                    {step === 1 ? (
                        <p>
                            Сервис предназначен для обучения и демонстрации возможностей ИИ.
                            <span className="text-red-600 block mt-2 font-bold">
                                Не вводите личные данные, персональную информацию или корпоративную тайну.
                            </span>
                        </p>
                    ) : (
                        <p>
                            Мы ничего не сохраняем на сервере. Ваш запрос передается напрямую в стороннюю языковую модель (LLM) для обработки и генерации ответа.
                        </p>
                    )}
                </div>

                <div className="flex gap-4 pt-4">
                    <button
                        onClick={handleConfirm}
                        className="flex-1 py-3 px-6 gost-button font-bold uppercase tracking-wider text-sm"
                    >
                        {step === 1 ? "ОК" : "Я все понимаю"}
                    </button>
                </div>
            </div>
        </div>
    );
}
