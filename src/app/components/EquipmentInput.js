"use client";

import React, { useState } from 'react';

export default function EquipmentInput({ onSubmit, isLoading }) {
    const [formData, setFormData] = useState({
        site: '',
        type: '',
        model: '',
        year: '',
        manufacturer: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="gost-card p-8">
                <div className="gost-header pb-4 mb-6 text-2xl flex items-center gap-3">
                    <span className="bg-blue-600 text-white w-8 h-8 flex items-center justify-center rounded-sm text-sm">01</span>
                    Ввод данных оборудования
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Технологический участок</label>
                            <input
                                required
                                name="site"
                                value={formData.site}
                                onChange={handleChange}
                                placeholder="Например: Цех №1, Установка ГФУ"
                                className="w-full p-3 border border-slate-300 focus:border-blue-600 outline-none transition-colors rounded-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Тип оборудования</label>
                            <input
                                required
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                placeholder="Например: Насос центробежный"
                                className="w-full p-3 border border-slate-300 focus:border-blue-600 outline-none transition-colors rounded-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Модель</label>
                            <input
                                required
                                name="model"
                                value={formData.model}
                                onChange={handleChange}
                                placeholder="Например: НК 200/120"
                                className="w-full p-3 border border-slate-300 focus:border-blue-600 outline-none transition-colors rounded-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Год производства</label>
                            <input
                                required
                                name="year"
                                type="number"
                                value={formData.year}
                                onChange={handleChange}
                                placeholder="2018"
                                className="w-full p-3 border border-slate-300 focus:border-blue-600 outline-none transition-colors rounded-sm"
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-500">Производитель</label>
                            <input
                                required
                                name="manufacturer"
                                value={formData.manufacturer}
                                onChange={handleChange}
                                placeholder="Например: ОАО 'Волгограднефтемаш'"
                                className="w-full p-3 border border-slate-300 focus:border-blue-600 outline-none transition-colors rounded-sm"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            disabled={isLoading}
                            type="submit"
                            className="w-full py-4 px-6 gost-button font-bold uppercase tracking-widest text-base flex items-center justify-center gap-3"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                    Проверка LLM...
                                </>
                            ) : (
                                "Анализировать оборудование"
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <div className="text-center text-slate-400 text-xs uppercase tracking-widest">
                Reliability Engineering System v1.0
            </div>
        </div>
    );
}
