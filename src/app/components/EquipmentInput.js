"use client";

import React, { useState } from 'react';

export default function EquipmentInput({ onSubmit, isLoading, hasAnalysis, isModified }) {
    const [formData, setFormData] = useState({
        site: '',
        type: '',
        model: '',
        year: '',
        manufacturer: ''
    });

    const handleChange = (e) => {
        const newData = { ...formData, [e.target.name]: e.target.value };
        setFormData(newData);
        if (isModified) isModified(); // Уведомляем родителя об изменении
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className={`gost-card p-6 transition-all duration-300 ${hasAnalysis && !isLoading ? 'opacity-90' : 'opacity-100'}`}>
                <div className="gost-header pb-3 mb-6 text-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-sm text-xs font-bold">01</span>
                        ВВОД данных оборудования
                    </div>
                    {hasAnalysis && (
                        <span className="text-[10px] font-mono text-blue-500 uppercase">Данные подтверждены</span>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Технологический участок</label>
                            <input
                                required
                                name="site"
                                value={formData.site}
                                onChange={handleChange}
                                placeholder="Цех №1"
                                className="w-full p-2 text-sm border border-slate-300 focus:border-blue-600 outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Тип оборудования</label>
                            <input
                                required
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                placeholder="Насос"
                                className="w-full p-2 text-sm border border-slate-300 focus:border-blue-600 outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Модель</label>
                            <input
                                required
                                name="model"
                                value={formData.model}
                                onChange={handleChange}
                                placeholder="НК 200/120"
                                className="w-full p-2 text-sm border border-slate-300 focus:border-blue-600 outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Год производства</label>
                            <input
                                required
                                name="year"
                                type="number"
                                value={formData.year}
                                onChange={handleChange}
                                placeholder="2018"
                                className="w-full p-2 text-sm border border-slate-300 focus:border-blue-600 outline-none transition-colors"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Производитель (упрощено)</label>
                            <input
                                name="manufacturer"
                                value={formData.manufacturer}
                                onChange={handleChange}
                                placeholder="Завод-изготовитель"
                                className="w-full p-2 text-sm border border-slate-300 focus:border-blue-600 outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            disabled={isLoading}
                            type="submit"
                            className={`w-full py-3 px-6 gost-button font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${isLoading ? 'bg-slate-300 text-slate-500 cursor-not-allowed border-slate-400' :
                                    hasAnalysis ? 'bg-white text-blue-900 animate-pulse border-2 border-blue-900 shadow-xl' : 'bg-blue-900 text-white hover:bg-black font-black'
                                }`}
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                                    Обработка запроса (до 10 сек)...
                                </>
                            ) : (
                                "Анализировать оборудование"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
