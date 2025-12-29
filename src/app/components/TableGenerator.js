"use client";

import React, { useState, useEffect } from 'react';

export default function TableGenerator({ equipment }) {
    const [step, setStep] = useState(1);
    const [tables, setTables] = useState({
        parts: [],
        fmea: [],
        rcm: [],
        plan: ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const generateStep = async (currentStep) => {
        setIsLoading(true);
        setError(null);
        try {
            let prompt = "";
            const equipStr = `${equipment.manufacturer} ${equipment.model} (${equipment.type})`;

            if (currentStep === 1) {
                prompt = `Для оборудования ${equipStr} сгенерируй таблицу основных узлов и частей (5 строк). 
Верни ответ СТРОГО В ФОРМАТЕ JSON массива объектов с полями: "Название", "Описание", "Функция".
Не добавляй никакого лишнего текста, только JSON массив.`;
            } else if (currentStep === 2) {
                prompt = `Сгенерируй FMEA таблицу для ${equipStr} (до 10 строк). 
Столбцы: "Вид отказа", "Причина", "Последствия", "Вероятность" (1-10), "Серьезность" (1-10), "Обнаруживаемость" (1-10).
Верни ответ СТРОГО В ФОРМАТЕ JSON массива объектов.`;
            } else if (currentStep === 3) {
                prompt = `Сгенерируй RCM таблицу для ${equipStr} (до 10 строк).
Столбцы: "Функция", "Вид отказа", "Критичность" (Высокая/Средняя/Низкая), "Рекомендуемая стратегия".
Верни ответ СТРОГО В ФОРМАТЕ JSON массива объектов.`;
            } else if (currentStep === 4) {
                prompt = `На основе данных RCM для ${equipStr} составь план ТОиР и стратегии обслуживания. 
Опиши кратко для каждого уровня критичности.
Верни ответ в свободном текстовом формате (Markdown).`;
            }

            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            if (currentStep <= 3) {
                let jsonStr = data.result.replace(/```json|```/g, '').trim();
                const parsed = JSON.parse(jsonStr);

                // Add RPN calculation for FMEA
                if (currentStep === 2) {
                    parsed.forEach(item => {
                        item.RPN = (item.Вероятность || 1) * (item.Серьезность || 1) * (item.Обнаруживаемость || 1);
                    });
                }

                const key = currentStep === 1 ? 'parts' : currentStep === 2 ? 'fmea' : 'rcm';
                setTables(prev => ({ ...prev, [key]: parsed }));
            } else {
                setTables(prev => ({ ...prev, plan: data.result }));
            }
        } catch (err) {
            console.error(err);
            setError("Ошибка генерации: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        generateStep(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const nextStep = () => {
        const nextS = step + 1;
        setStep(nextS);
        generateStep(nextS);
    };

    const exportToCSV = (data, filename) => {
        if (!data || data.length === 0) return;
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(h => `"${row[h]}"`).join(','))
        ].join('\n');

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getCritStyle = (crit) => {
        if (!crit) return "bg-slate-100 text-slate-700";
        if (crit.includes('Высокая')) return "bg-red-100 text-red-700";
        if (crit.includes('Средняя')) return "bg-orange-100 text-orange-700";
        return "bg-green-100 text-green-700";
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-4">
            <div className="gost-card p-6 border-l-8 border-l-blue-600">
                <h2 className="text-xl font-black text-blue-900 uppercase">
                    Этап {step}: {step === 1 ? "Узлы и части" : step === 2 ? "Анализ FMEA" : step === 3 ? "Анализ RCM" : "План ТОиР"}
                </h2>
                <p className="text-xs text-slate-500 font-mono mt-1">Оборудование: {equipment.manufacturer} {equipment.model}</p>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-blue-600 font-bold animate-pulse text-center">ИИ формирует технические данные...<br /><span className="text-xs font-normal opacity-70">Это может занять 10-15 секунд</span></p>
                </div>
            ) : error ? (
                <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded">
                    {error}
                    <button onClick={() => generateStep(step)} className="ml-4 underline font-bold">Повторить</button>
                </div>
            ) : (
                <div className="space-y-6">
                    {step === 1 && (
                        <div className="overflow-x-auto gost-card">
                            <table className="gost-table">
                                <thead>
                                    <tr>
                                        <th>Название</th>
                                        <th>Функция</th>
                                        <th>Описание</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tables.parts.map((p, i) => (
                                        <tr key={i}>
                                            <td className="font-bold">{p.Название}</td>
                                            <td>{p.Функция}</td>
                                            <td className="text-slate-600">{p.Описание}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-4">
                                <button onClick={() => exportToCSV(tables.parts, 'parts')} className="px-4 py-2 border border-slate-300 text-[10px] font-bold uppercase hover:bg-slate-100 bg-white">Экспорт CSV</button>
                                <div className="flex-1"></div>
                                <button onClick={nextStep} className="px-6 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase hover:bg-blue-700">Перейти к FMEA →</button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="overflow-x-auto gost-card">
                            <table className="gost-table">
                                <thead>
                                    <tr>
                                        <th>Вид отказа</th>
                                        <th>Причина</th>
                                        <th className="w-16">O</th>
                                        <th className="w-16">S</th>
                                        <th className="w-16">D</th>
                                        <th className="w-16">RPN</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tables.fmea.map((f, i) => (
                                        <tr key={i}>
                                            <td>{f["Вид отказа"]}</td>
                                            <td>{f["Причина"]}</td>
                                            <td className="text-center">{f["Вероятность"]}</td>
                                            <td className="text-center">{f["Серьезность"]}</td>
                                            <td className="text-center">{f["Обнаруживаемость"]}</td>
                                            <td className="text-center font-bold text-red-600">{f.RPN}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-4">
                                <button onClick={() => exportToCSV(tables.fmea, 'fmea')} className="px-4 py-2 border border-slate-300 text-[10px] font-bold uppercase hover:bg-slate-100 bg-white">Экспорт CSV</button>
                                <div className="flex-1"></div>
                                <button onClick={nextStep} className="px-6 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase hover:bg-blue-700">Перейти к RCM →</button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="overflow-x-auto gost-card">
                            <table className="gost-table">
                                <thead>
                                    <tr>
                                        <th>Функция</th>
                                        <th>Вид отказа</th>
                                        <th>Критичность</th>
                                        <th>Рекомендуемая стратегия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tables.rcm.map((r, i) => (
                                        <tr key={i}>
                                            <td>{r.Функция}</td>
                                            <td>{r["Вид отказа"]}</td>
                                            <td>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getCritStyle(r.Критичность)}`}>
                                                    {r.Критичность}
                                                </span>
                                            </td>
                                            <td>{r["Рекомендуемая стратегия"]}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-4">
                                <button onClick={() => exportToCSV(tables.rcm, 'rcm')} className="px-4 py-2 border border-slate-300 text-[10px] font-bold uppercase hover:bg-slate-100 bg-white">Экспорт CSV</button>
                                <div className="flex-1"></div>
                                <button onClick={nextStep} className="px-6 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase hover:bg-blue-700">План ТОиР →</button>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="gost-card p-8 bg-white border-l-8 border-l-blue-900">
                            <div className="prose prose-blue max-w-none">
                                <div className="whitespace-pre-wrap font-sans text-slate-800 leading-relaxed text-sm">
                                    {tables.plan}
                                </div>
                            </div>
                            <div className="mt-8 border-t pt-8 flex justify-between items-center">
                                <p className="text-[10px] text-slate-400 uppercase font-mono">Анализ завершен успешно</p>
                                <button onClick={() => window.location.reload()} className="px-8 py-3 bg-blue-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-colors">
                                    Новый анализ
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
