"use client";

import React, { useState, useEffect } from 'react';

export default function TableGenerator({ equipment, abbreviation, reset }) {
    const [activeStep, setActiveStep] = useState(0);
    const [tables, setTables] = useState({
        parts: [],
        fmea: [],
        rcm: [],
        plan: ""
    });
    const [models, setModels] = useState({
        parts: "",
        fmea: "",
        rcm: "",
        plan: ""
    });
    const [loadingStep, setLoadingStep] = useState(null);
    const [error, setError] = useState(null);

    const WARNING_TEXT = "Данные запрещено использовать в реальной работе.!Всё является учебной имитацией на основе ИИ!";

    // Очистка при обновлении данных
    useEffect(() => {
        if (reset) {
            setTables({ parts: [], fmea: [], rcm: [], plan: "" });
            setModels({ parts: "", fmea: "", rcm: "", plan: "" });
            setActiveStep(0);
        }
    }, [reset]);

    const generateStep = async (stepToGen) => {
        setLoadingStep(stepToGen);
        setError(null);
        try {
            let prompt = "";
            const equipStr = `${equipment.manufacturer || ''} ${equipment.model} (${equipment.type}) [ID: ${abbreviation}]`;

            if (stepToGen === 1) {
                prompt = `Для оборудования ${equipStr} сгенерируй таблицу основных узлов и частей (5 строк). 
Верни ответ СТРОГО В ФОРМАТЕ JSON массива объектов с полями: "Название", "Описание", "Функция".
Не добавляй никакого лишнего текста, только JSON массив.`;
            } else if (stepToGen === 2) {
                const nodes = tables.parts.length > 0 ? tables.parts.map(p => p.Название).join(", ") : "основные узлы";
                prompt = `Сгенерируй FMEA таблицу для ${equipStr}, используя узлы: ${nodes}. 
Столбцы: "Узел", "Вид отказа", "Причина", "Последствия", "O" (Вероятность 1-10), "S" (Серьезность 1-10), "D" (Обнаруживаемость 1-10).
Верни ответ СТРОГО В ФОРМАТЕ JSON массива объектов.`;
            } else if (stepToGen === 3) {
                const fmeaCtx = tables.fmea.length > 0 ? JSON.stringify(tables.fmea.slice(0, 3)) : "данные FMEA";
                prompt = `Сгенерируй RCM таблицу для ${equipStr} на основе: ${fmeaCtx}.
Столбцы: "Узел", "Функция", "Вид отказа", "Критичность" (Высокая/Средняя/Низкая), "Рекомендуемая стратегия".
Верни ответ СТРОГО В ФОРМАТЕ JSON массива объектов.`;
            } else if (stepToGen === 4) {
                const rcmCtx = tables.rcm.length > 0 ? JSON.stringify(tables.rcm.slice(0, 3)) : "данные RCM";
                prompt = `На основе данных анализа для портала ${equipStr} составь отчет.
ТРЕБОВАНИЯ:
1. Вывод только в виде обычного текста БЕЗ MARKDOWN.
2. Описание общих особенностей эксплуатации оборудования.
3. Короткий анализ данных RCM и FMEA.
4. В конце добавь текстовую таблицу с финальными рекомендациями по стратегии ТОиР для узлов.
5. Закончи фразой: 'Для проверки данных свяжитесь с компанией Простоев.НЕТ'.`;
            }

            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            const key = stepToGen === 1 ? 'parts' : stepToGen === 2 ? 'fmea' : stepToGen === 3 ? 'rcm' : 'plan';
            setModels(prev => ({ ...prev, [key]: data.model }));

            if (stepToGen <= 3) {
                let jsonStr = data.result.replace(/```json|```/g, '').trim();
                const parsed = JSON.parse(jsonStr);
                if (stepToGen === 2) {
                    parsed.forEach(item => {
                        item.RPN = (item.O || item["Вероятность"] || 1) * (item.S || item["Серьезность"] || 1) * (item.D || item["Обнаруживаемость"] || 1);
                    });
                }
                const tableKey = stepToGen === 1 ? 'parts' : stepToGen === 2 ? 'fmea' : 'rcm';
                setTables(prev => ({ ...prev, [tableKey]: parsed }));
            } else {
                setTables(prev => ({ ...prev, plan: data.result }));
            }
            setActiveStep(stepToGen);
        } catch (err) {
            setError(`Ошибка этапа ${stepToGen}: ${err.message}`);
        } finally {
            setLoadingStep(null);
        }
    };

    const exportToCSV = (data, filename) => {
        if (!data || data.length === 0) return;
        const headers = Object.keys(data[0]);
        const csvContent = ["\uFEFF" + headers.join(','), ...data.map(row => headers.map(h => `"${row[h]}"`).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}_${abbreviation}.csv`;
        link.click();
    };

    const stepButtons = [
        { id: 1, label: "01. Узлы и части", desc: "Определение состава оборудования и его функций" },
        { id: 2, label: "02. Анализ FMEA", desc: "Анализ видов, причин и последствий отказов (RPN)" },
        { id: 3, label: "03. Анализ RCM", desc: "Выбор стратегии обслуживания на основе критичности" },
        { id: 4, label: "04. План ТОиР", desc: "Финальные рекомендации и план эксплуатации" }
    ];

    return (
        <div className="w-full max-w-4xl mx-auto space-y-10">

            {/* Navigation Steps */}
            <div className="bg-white shadow-sm border border-slate-200 p-4 space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-900 border-b pb-2 mb-2">
                    <span className="bg-blue-900 text-white px-2 py-0.5">Инфо</span>
                    Рекомендованный порядок: 01 → 02 → 03 → 04
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
                    {stepButtons.map((s, idx) => (
                        <React.Fragment key={s.id}>
                            <div className="relative group">
                                <button
                                    onClick={() => generateStep(s.id)}
                                    disabled={!!loadingStep}
                                    title={s.desc}
                                    className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest border-2 transition-all ${loadingStep === s.id ? 'bg-blue-600 text-white animate-pulse border-blue-600' :
                                        activeStep === s.id ? 'bg-blue-900 text-white border-blue-900 shadow-lg' :
                                            activeStep > s.id ? 'bg-white text-blue-900 border-blue-900' : 'bg-slate-50 text-slate-400 border-slate-200'
                                        } hover:border-blue-900 hover:text-blue-900 hover:bg-blue-50`}
                                >
                                    {loadingStep === s.id ? 'Загрузка...' : s.label}
                                </button>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-black text-white text-[9px] lowercase font-bold text-center rounded z-50 pointer-events-none">
                                    {s.desc}
                                </div>
                            </div>
                            {idx < 3 && <span className="text-slate-300 font-bold hidden md:inline">→</span>}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-[10px] font-bold uppercase text-center rounded">
                    {error}
                </div>
            )}

            {/* Content Area */}
            <div className="space-y-12 pb-20">

                {/* Step 1 Table */}
                {tables.parts.length > 0 && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex justify-between items-center border-b border-blue-600 pb-1">
                            <h3 className="text-xs font-black text-blue-900 uppercase">Этап 1: Состав оборудования ({equipment.type})</h3>
                            <span className="text-[8px] text-red-500 italic font-bold">{WARNING_TEXT}</span>
                        </div>
                        <div className="gost-card overflow-x-auto">
                            <table className="gost-table">
                                <thead><tr><th>Название</th><th>Функция</th><th>Описание</th></tr></thead>
                                <tbody>
                                    {tables.parts.map((p, i) => (
                                        <tr key={i}><td className="font-bold">{p.Название}</td><td>{p.Функция}</td><td className="text-[10px] text-slate-600">{p.Описание}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-2 bg-slate-50 flex justify-between items-center px-4">
                                <span className="text-[9px] font-mono text-slate-400 italic">Core: {models.parts}</span>
                                <button onClick={() => exportToCSV(tables.parts, 'parts')} className="px-3 py-1 border border-slate-300 text-[9px] font-bold uppercase bg-white hover:bg-slate-100">Скачать CSV</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2 Table */}
                {tables.fmea.length > 0 && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex justify-between items-center border-b border-blue-600 pb-1">
                            <h3 className="text-xs font-black text-blue-900 uppercase">Этап 2: Анализ FMEA ({equipment.type})</h3>
                            <span className="text-[8px] text-red-500 italic font-bold">{WARNING_TEXT}</span>
                        </div>
                        <div className="text-[9px] text-slate-500 font-mono mb-1">
                            O (Occurrence) - Вероятность | S (Severity) - Серьезность | D (Detection) - Обнаруживаемость | RPN = O*S*D
                        </div>
                        <div className="gost-card overflow-x-auto">
                            <table className="gost-table">
                                <thead><tr><th>Узел</th><th>Вид отказа</th><th className="w-10">O</th><th className="w-10">S</th><th className="w-10">D</th><th className="w-10">RPN</th></tr></thead>
                                <tbody>
                                    {tables.fmea.map((f, i) => (
                                        <tr key={i}>
                                            <td className="font-bold">{f.Узел}</td>
                                            <td className="text-[10px]">{f["Вид отказа"] || f.ВидОтказа}</td>
                                            <td className="text-center">{f.O}</td><td className="text-center">{f.S}</td><td className="text-center">{f.D}</td>
                                            <td className="text-center font-bold text-red-600">{f.RPN}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-2 bg-slate-50 flex justify-between items-center px-4">
                                <span className="text-[9px] font-mono text-slate-400 italic">Core: {models.fmea}</span>
                                <button onClick={() => exportToCSV(tables.fmea, 'fmea')} className="px-3 py-1 border border-slate-300 text-[9px] font-bold uppercase bg-white hover:bg-slate-100">Скачать CSV</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3 Table */}
                {tables.rcm.length > 0 && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex justify-between items-center border-b border-blue-600 pb-1">
                            <h3 className="text-xs font-black text-blue-900 uppercase">Этап 3: Анализ RCM ({equipment.type})</h3>
                            <span className="text-[8px] text-red-500 italic font-bold">{WARNING_TEXT}</span>
                        </div>
                        <div className="gost-card overflow-x-auto">
                            <table className="gost-table">
                                <thead><tr><th>Узел</th><th>Функция</th><th className="w-24">Критичность</th><th>Стратегия</th></tr></thead>
                                <tbody>
                                    {tables.rcm.map((r, i) => (
                                        <tr key={i}>
                                            <td className="font-bold">{r.Узел}</td>
                                            <td className="text-[10px]">{r.Функция}</td>
                                            <td className="text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase ${String(r.Критичность).includes('Выс') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                    }`}>{r.Критичность}</span>
                                            </td>
                                            <td className="text-[10px]">{r["Рекомендуемая стратегия"] || r.Стратегия}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-2 bg-slate-50 flex justify-between items-center px-4">
                                <span className="text-[9px] font-mono text-slate-400 italic">Core: {models.rcm}</span>
                                <button onClick={() => exportToCSV(tables.rcm, 'rcm')} className="px-3 py-1 border border-slate-300 text-[9px] font-bold uppercase bg-white hover:bg-slate-100">Скачать CSV</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4 Plan */}
                {tables.plan && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex justify-between items-center border-b border-blue-600 pb-1">
                            <h3 className="text-xs font-black text-blue-900 uppercase">Этап 4: Результаты и Рекомендации ({equipment.type})</h3>
                            <span className="text-[8px] text-red-500 italic font-bold">{WARNING_TEXT}</span>
                        </div>
                        <div className="gost-card p-6 bg-white border-l-4 border-l-blue-900">
                            <pre className="whitespace-pre-wrap font-sans text-slate-800 leading-relaxed text-[11px]">
                                {tables.plan}
                            </pre>
                            <div className="mt-4 pt-2 border-t flex justify-between items-center">
                                <span className="text-[9px] font-mono text-slate-400 italic">Core: {models.plan}</span>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
