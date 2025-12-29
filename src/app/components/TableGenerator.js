"use client";

import React, { useState, useEffect } from 'react';

export default function TableGenerator({ equipment, abbreviation }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [tables, setTables] = useState({
        parts: [],
        fmea: [],
        rcm: [],
        plan: ""
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const WARNING_TEXT = "Данные запрещено использовать в реальной работе.!Всё является учебной имитацией на основе ИИ!";

    const generateStep = async (stepToGen) => {
        setIsLoading(true);
        setError(null);
        try {
            let prompt = "";
            const equipStr = `${equipment.manufacturer} ${equipment.model} (${equipment.type}) [ID: ${abbreviation}]`;

            if (stepToGen === 1) {
                prompt = `Для оборудования ${equipStr} сгенерируй таблицу основных узлов и частей (5 строк). 
Верни ответ СТРОГО В ФОРМАТЕ JSON массива объектов с полями: "Название", "Описание", "Функция".
Не добавляй никакого лишнего текста, только JSON массив.`;
            } else if (stepToGen === 2) {
                const nodes = tables.parts.map(p => p.Название).join(", ");
                prompt = `Сгенерируй FMEA таблицу для ${equipStr}, используя только следующие узлы: ${nodes}. 
Для каждого узла предложи минимум по 2 вида отказа.
Столбцы: "Узел", "Вид отказа", "Причина", "Последствия", "Вероятность" (O, 1-10), "Серьезность" (S, 1-10), "Обнаруживаемость" (D, 1-10).
Верни ответ СТРОГО В ФОРМАТЕ JSON массива объектов.`;
            } else if (stepToGen === 3) {
                const fmeaData = JSON.stringify(tables.fmea.slice(0, 5));
                prompt = `Сгенерируй RCM таблицу для ${equipStr} на основе данных FMEA: ${fmeaData}.
Используй те же узлы.
Столбцы: "Узел", "Функция", "Вид отказа", "Критичность" (Высокая/Средняя/Низкая), "Рекомендуемая стратегия".
Верни ответ СТРОГО В ФОРМАТЕ JSON массива объектов.`;
            } else if (stepToGen === 4) {
                const rcmData = JSON.stringify(tables.rcm.slice(0, 5));
                prompt = `На основе данных RCM: ${rcmData} для оборудования ${equipStr} составь отчет.
ТРЕБОВАНИЯ:
1. Вывод только в виде обычного текста БЕЗ MARKDOWN (без решеток, звездочек и т.д.).
2. Опиши коротко общие особенности эксплуатации этого оборудования.
3. Дай короткий анализ данных RCM и FMEA.
4. В конце добавь таблицу (псевдографикой или просто списком), где к узлам предложи финальные рекомендации по стратегии ТОиР.
5. Закончи фразой: 'Для проверки данных свяжитесь с компанией Простоев.НЕТ'.`;
            }

            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            if (stepToGen <= 3) {
                let jsonStr = data.result.replace(/```json|```/g, '').trim();
                const parsed = JSON.parse(jsonStr);

                if (stepToGen === 2) {
                    parsed.forEach(item => {
                        item.RPN = (item.Вероятность || 1) * (item.Серьезность || 1) * (item.Обнаруживаемость || 1);
                    });
                }

                const key = stepToGen === 1 ? 'parts' : stepToGen === 2 ? 'fmea' : 'rcm';
                setTables(prev => ({ ...prev, [key]: parsed }));
            } else {
                setTables(prev => ({ ...prev, plan: data.result }));
            }

            if (stepToGen === currentStep) {
                // Just finished the current step
            }
        } catch (err) {
            setError("Ошибка генерации: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        generateStep(1);
    }, []);

    const nextStep = () => {
        const nextS = currentStep + 1;
        setCurrentStep(nextS);
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
        link.setAttribute("download", `${filename}_${abbreviation}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="w-full max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20 px-4">

            {/* Step 1: Parts */}
            {(currentStep >= 1 && tables.parts.length > 0 || (currentStep === 1 && isLoading)) && (
                <div className="space-y-4">
                    <div className="flex justify-between items-end border-b-2 border-blue-600 pb-2">
                        <h2 className="text-xl font-black text-blue-900 uppercase">Этап 1: Узлы и части [ID: {abbreviation}]</h2>
                        <span className="text-[10px] text-red-500 font-bold max-w-[200px] text-right leading-tight italic">{WARNING_TEXT}</span>
                    </div>

                    {currentStep === 1 && isLoading ? (
                        <LoadingState />
                    ) : (
                        <div className="gost-card overflow-x-auto">
                            <table className="gost-table">
                                <thead>
                                    <tr><th>Название</th><th>Функция</th><th>Описание</th></tr>
                                </thead>
                                <tbody>
                                    {tables.parts.map((p, i) => (
                                        <tr key={i}><td className="font-bold">{p.Название}</td><td>{p.Функция}</td><td className="text-xs text-slate-600">{p.Описание}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-4 bg-slate-50 flex gap-4">
                                <button onClick={() => exportToCSV(tables.parts, 'parts')} className="px-4 py-2 border border-slate-300 text-[10px] font-bold uppercase bg-white">Экспорт CSV</button>
                                {currentStep === 1 && <button onClick={nextStep} className="px-6 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase ml-auto">Перейти к FMEA →</button>}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Step 2: FMEA */}
            {(currentStep >= 2 && (tables.fmea.length > 0 || isLoading)) && (
                <div className="space-y-4">
                    <div className="flex justify-between items-end border-b-2 border-blue-600 pb-2">
                        <h2 className="text-xl font-black text-blue-900 uppercase">Этап 2: Анализ FMEA [ID: {abbreviation}]</h2>
                        <span className="text-[10px] text-red-500 font-bold max-w-[200px] text-right leading-tight italic">{WARNING_TEXT}</span>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono bg-blue-50 p-2 border-l-4 border-blue-400">
                        О (Occurrence) - Вероятность | S (Severity) - Серьезность | D (Detection) - Обнаруживаемость | RPN = O * S * D
                    </div>

                    {currentStep === 2 && isLoading ? (
                        <LoadingState />
                    ) : (
                        <div className="gost-card overflow-x-auto">
                            <table className="gost-table">
                                <thead>
                                    <tr><th>Узел</th><th>Вид отказа</th><th className="w-12">O</th><th className="w-12">S</th><th className="w-12">D</th><th className="w-12">RPN</th></tr>
                                </thead>
                                <tbody>
                                    {tables.fmea.map((f, i) => (
                                        <tr key={i}>
                                            <td className="font-bold text-xs">{f.Узел}</td>
                                            <td className="text-xs">{f["Вид отказа"]}</td>
                                            <td className="text-center">{f["Вероятность"] || f.O}</td>
                                            <td className="text-center">{f["Серьезность"] || f.S}</td>
                                            <td className="text-center">{f["Обнаруживаемость"] || f.D}</td>
                                            <td className="text-center font-bold text-red-600">{f.RPN}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-4 bg-slate-50 flex gap-4">
                                <button onClick={() => exportToCSV(tables.fmea, 'fmea')} className="px-4 py-2 border border-slate-300 text-[10px] font-bold uppercase bg-white">Экспорт CSV</button>
                                {currentStep === 2 && <button onClick={nextStep} className="px-6 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase ml-auto">Перейти к RCM →</button>}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Step 3: RCM */}
            {(currentStep >= 3 && (tables.rcm.length > 0 || isLoading)) && (
                <div className="space-y-4">
                    <div className="flex justify-between items-end border-b-2 border-blue-600 pb-2">
                        <h2 className="text-xl font-black text-blue-900 uppercase">Этап 3: Анализ RCM [ID: {abbreviation}]</h2>
                        <span className="text-[10px] text-red-500 font-bold max-w-[200px] text-right leading-tight italic">{WARNING_TEXT}</span>
                    </div>

                    {currentStep === 3 && isLoading ? (
                        <LoadingState />
                    ) : (
                        <div className="gost-card overflow-x-auto">
                            <table className="gost-table">
                                <thead>
                                    <tr><th>Узел</th><th>Функция</th><th>Критичность</th><th>Стратегия</th></tr>
                                </thead>
                                <tbody>
                                    {tables.rcm.map((r, i) => (
                                        <tr key={i}>
                                            <td className="font-bold text-xs">{r.Узел}</td>
                                            <td className="text-xs">{r.Функция}</td>
                                            <td className="text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${r.Критичность?.includes('Высокая') ? 'bg-red-100 text-red-700' :
                                                        r.Критичность?.includes('Средняя') ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {r.Критичность}
                                                </span>
                                            </td>
                                            <td className="text-xs">{r["Рекомендуемая стратегия"]}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-4 bg-slate-50 flex gap-4">
                                <button onClick={() => exportToCSV(tables.rcm, 'rcm')} className="px-4 py-2 border border-slate-300 text-[10px] font-bold uppercase bg-white">Экспорт CSV</button>
                                {currentStep === 3 && <button onClick={nextStep} className="px-6 py-2 bg-blue-600 text-white text-[10px] font-bold uppercase ml-auto">План ТОиР →</button>}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Step 4: Final Plan */}
            {(currentStep >= 4 && (tables.plan || isLoading)) && (
                <div className="space-y-4">
                    <div className="flex justify-between items-end border-b-2 border-blue-600 pb-2">
                        <h2 className="text-xl font-black text-blue-900 uppercase">Этап 4: План эксплуатации [ID: {abbreviation}]</h2>
                        <span className="text-[10px] text-red-500 font-bold max-w-[200px] text-right leading-tight italic">{WARNING_TEXT}</span>
                    </div>

                    {currentStep === 4 && isLoading ? (
                        <LoadingState />
                    ) : (
                        <div className="gost-card p-8 bg-white border-l-8 border-l-blue-900">
                            <pre className="whitespace-pre-wrap font-sans text-slate-800 leading-relaxed text-sm">
                                {tables.plan}
                            </pre>
                            <div className="mt-8 pt-4 border-t flex justify-center">
                                <button onClick={() => window.location.reload()} className="px-12 py-4 bg-blue-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-colors shadow-lg">
                                    Новый цикл анализа
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => generateStep(currentStep)} className="underline font-bold text-xs uppercase">Повторить</button>
                </div>
            )}
        </div>
    );
}

function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-white/50 border border-dashed border-blue-200">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-blue-600 font-bold text-[10px] uppercase tracking-widest animate-pulse">Анализ данных...</p>
        </div>
    );
}
