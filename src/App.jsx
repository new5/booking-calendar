import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Upload, ChevronDown, ChevronUp, AlertCircle, ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCw, Download, ArrowLeftRight, ArrowDownUp, Plus, X, Clock, AlertTriangle } from 'lucide-react';

// Icons object definition
const Icons = {
    Upload,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    Calendar: CalendarIcon,
    RefreshCw,
    Download,
    ArrowLeftRight,
    ArrowDownUp,
    Plus,
    X,
    Clock,
    AlertTriangle
};

// --- Date Helpers ---
const DateUtils = {
    addDays: (date, days) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    },
    startOfDay: (date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    },
    startOfMonth: (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1);
    },
    endOfMonth: (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    },
    isSameMonth: (d1, d2) => {
        return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
    },
    parseDate: (dateStr) => {
        if (!dateStr) return new Date();
        const normalized = dateStr.replace(/-/g, '/');
        const parts = normalized.split('/');
        if (parts.length < 3) return new Date(); 
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    },
    formatDate: (date, formatStr) => {
        if (!date || isNaN(date.getTime())) return ''; 
        const y = date.getFullYear();
        const m = ('0' + (date.getMonth() + 1)).slice(-2);
        const d = ('0' + date.getDate()).slice(-2);
        const w = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
        
        if (formatStr === 'yyyy-MM-dd') return `${y}-${m}-${d}`;
        if (formatStr === 'yyyy年 MM月') return `${y}年 ${m}月`;
        if (formatStr === 'E') return w;
        if (formatStr === 'd') return date.getDate();
        if (formatStr === 'M/d') return `${parseInt(m)}/${parseInt(d)}`;
        return `${y}/${m}/${d}`;
    },
    isSameDay: (d1, d2) => {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }
};

// --- CSV Parser Helper ---
const parseCSV = (text) => {
    if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
    }
    const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const row = {};
        let currentVal = '';
        let insideQuote = false;
        let colIndex = 0;
        for (let charIndex = 0; charIndex < line.length; charIndex++) {
            const char = line[charIndex];
            if (char === '"') insideQuote = !insideQuote;
            else if (char === ',' && !insideQuote) {
                if (colIndex < headers.length) row[headers[colIndex]] = currentVal.replace(/^"|"$/g, '').trim();
                currentVal = '';
                colIndex++;
            } else currentVal += char;
        }
        if (colIndex < headers.length) row[headers[colIndex]] = currentVal.replace(/^"|"$/g, '').trim();
        if (Object.keys(row).length > 0) result.push(row);
    }
    return result;
};

// --- Static HTML Generator ---
const downloadStaticHtml = (activeReservations, cancelledReservations, modifiedReservations, rooms, generatedAtDate) => {
    const generatedAtStr = generatedAtDate ? generatedAtDate.toLocaleString() : new Date().toLocaleString();
    
    const embeddedData = JSON.stringify({
        activeReservations,
        cancelledReservations,
        modifiedReservations,
        rooms,
        generatedAt: generatedAtStr
    });

    const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reservation Calendar - Export</title>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        body { font-family: "Helvetica Neue", Arial, sans-serif; }
    </style>
</head>
<body class="bg-gray-50 text-gray-800">
    <div id="root"></div>
    <script id="calendar-data" type="application/json">${embeddedData}</script>
    <script type="text/babel">
        const { useState, useEffect, useMemo, useRef } = React;

        const Icons = {
            ChevronLeft: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
            ChevronRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
            ChevronDown: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>,
            ChevronUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>,
            AlertCircle: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>,
            AlertTriangle: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>,
            Calendar: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
            ArrowLeftRight: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>,
            ArrowDownUp: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>,
            Clock: () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        };

        const DateUtils = {
            addDays: (date, days) => { const r = new Date(date); r.setDate(r.getDate() + days); return r; },
            startOfDay: (date) => { const d = new Date(date); d.setHours(0,0,0,0); return d; },
            startOfMonth: (date) => new Date(date.getFullYear(), date.getMonth(), 1),
            endOfMonth: (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0),
            isSameMonth: (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth(),
            parseDate: (dateStr) => {
                if(!dateStr) return new Date();
                const normalized = dateStr.replace(/-/g, '/');
                const parts = normalized.split('/');
                if(parts.length<3) return new Date();
                return new Date(parseInt(parts[0],10), parseInt(parts[1],10)-1, parseInt(parts[2],10));
            },
            formatDate: (date, formatStr) => {
                if(!date || isNaN(date.getTime())) return '';
                const y=date.getFullYear(), m=('0'+(date.getMonth()+1)).slice(-2), d=('0'+date.getDate()).slice(-2);
                const w=['日','月','火','水','木','金','土'][date.getDay()];
                if(formatStr==='yyyy-MM-dd') return \`\${y}-\${m}-\${d}\`;
                if(formatStr==='yyyy年 MM月') return \`\${y}年 \${m}月\`;
                if(formatStr==='E') return w;
                if(formatStr==='d') return date.getDate();
                if(formatStr==='M/d') return \`\${parseInt(m)}/\${parseInt(d)}\`;
                return \`\${y}/\${m}/\${d}\`;
            },
            isSameDay: (d1, d2) => {
                if(!d1||!d2) return false;
                return d1.getFullYear()===d2.getFullYear() && d1.getMonth()===d2.getMonth() && d1.getDate()===d2.getDate();
            }
        };

        const CancellationList = ({ cancellations }) => {
            const [isOpen, setIsOpen] = useState(false);
            if (!cancellations || cancellations.length === 0) return null;
            return (
                <div className="mb-6 border border-red-200 rounded-lg bg-red-50 overflow-hidden">
                    <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 bg-red-100 hover:bg-red-200 text-red-800 font-medium">
                        <div className="flex items-center gap-2"><Icons.AlertCircle /><span>キャンセル一覧 ({cancellations.length}件)</span></div>{isOpen ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                    </button>
                    {isOpen && <div className="p-4 overflow-x-auto"><table className="min-w-full text-sm text-left"><thead className="text-xs text-gray-500 uppercase bg-red-50 border-b border-red-200"><tr><th className="px-4 py-2">チェックイン</th><th className="px-4 py-2">宿泊者名</th><th className="px-4 py-2">部屋タイプ</th><th className="px-4 py-2">予約サイト</th><th className="px-4 py-2">備考</th></tr></thead><tbody>{cancellations.map((c, i) => (<tr key={i} className="bg-white border-b border-red-100 hover:bg-red-50"><td className="px-4 py-2 font-medium">{c['チェックイン日']}</td><td className="px-4 py-2">{c['宿泊者氏名']}</td><td className="px-4 py-2 text-xs text-gray-600">{c['部屋タイプ名称']}</td><td className="px-4 py-2">{c['予約サイト名称']}</td><td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate">{c['備考1']||c['備考2']}</td></tr>))}</tbody></table></div>}
                </div>
            );
        };

        const ModifiedList = ({ modifications }) => {
            const [isOpen, setIsOpen] = useState(false);
            if (!modifications || modifications.length === 0) return null;
            return (
                <div className="mb-6 border border-yellow-200 rounded-lg bg-yellow-50 overflow-hidden">
                    <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-medium">
                        <div className="flex items-center gap-2"><Icons.AlertTriangle /><span>予約変更あり ({modifications.length}件)</span></div>{isOpen ? <Icons.ChevronUp /> : <Icons.ChevronDown />}
                    </button>
                    {isOpen && <div className="p-4 overflow-x-auto"><table className="min-w-full text-sm text-left"><thead className="text-xs text-gray-500 uppercase bg-yellow-50 border-b border-yellow-200"><tr><th className="px-4 py-2">チェックイン</th><th className="px-4 py-2">宿泊者名</th><th className="px-4 py-2">部屋タイプ</th><th className="px-4 py-2">予約サイト</th><th className="px-4 py-2">備考</th></tr></thead><tbody>{modifications.map((c, i) => (<tr key={i} className="bg-white border-b border-yellow-100 hover:bg-yellow-50"><td className="px-4 py-2 font-medium">{c['チェックイン日']}</td><td className="px-4 py-2">{c['宿泊者氏名']}</td><td className="px-4 py-2 text-xs text-gray-600">{c['部屋タイプ名称']}</td><td className="px-4 py-2">{c['予約サイト名称']}</td><td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate">{c['備考1']||c['備考2']}</td></tr>))}</tbody></table></div>}
                </div>
            );
        };

        const CalendarView = ({ reservations, rooms }) => {
            const [currentMonth, setCurrentMonth] = useState(new Date()); 
            const [isVertical, setIsVertical] = useState(false);
            const scrollContainerRef = useRef(null);
            const [scrollAction, setScrollAction] = useState('today'); 

            useEffect(() => {
                if (reservations.length > 0) {
                    setCurrentMonth(DateUtils.startOfMonth(new Date()));
                    setScrollAction('today');
                }
            }, [reservations]);

            const calendarDays = useMemo(() => {
                const days = [];
                const monthStart = DateUtils.startOfMonth(currentMonth);
                const monthEnd = DateUtils.endOfMonth(currentMonth);
                let curr = DateUtils.addDays(monthStart, -7);
                const end = DateUtils.addDays(monthEnd, 7);
                while (curr <= end) {
                    days.push(new Date(curr));
                    curr = DateUtils.addDays(curr, 1);
                }
                return days;
            }, [currentMonth]);

            useEffect(() => {
                if (!scrollAction || !scrollContainerRef.current) return;
                const container = scrollContainerRef.current;
                
                let targetId = null;
                let alignment = 'start'; 

                if (scrollAction === 'today') {
                    targetId = \`date-\${DateUtils.formatDate(new Date(), 'yyyy-MM-dd')}\`;
                    alignment = 'start'; 
                } else if (scrollAction === 'start') {
                    const monthStart = DateUtils.startOfMonth(currentMonth);
                    targetId = \`date-\${DateUtils.formatDate(monthStart, 'yyyy-MM-dd')}\`;
                    alignment = 'start';
                } else if (scrollAction === 'end') {
                    const monthEnd = DateUtils.endOfMonth(currentMonth);
                    targetId = \`date-\${DateUtils.formatDate(monthEnd, 'yyyy-MM-dd')}\`;
                    alignment = 'end';
                }

                const targetEl = document.getElementById(targetId);
                
                if (targetEl) {
                    if (isVertical) {
                        if (alignment === 'end') {
                            const top = targetEl.offsetTop - container.clientHeight + targetEl.clientHeight;
                            container.scrollTo({ top, behavior: 'smooth' });
                        } else {
                            container.scrollTo({ top: targetEl.offsetTop - container.offsetTop, behavior: 'smooth' });
                        }
                    } else {
                        const stickyHeaderWidth = 128; // w-32
                        if (alignment === 'end') {
                            const left = (targetEl.offsetLeft + targetEl.offsetWidth) - container.clientWidth;
                            container.scrollTo({ left, behavior: 'smooth' });
                        } else {
                            container.scrollTo({ left: targetEl.offsetLeft - stickyHeaderWidth, behavior: 'smooth' });
                        }
                    }
                } else if (scrollAction === 'today') {
                    const monthStart = DateUtils.startOfMonth(currentMonth);
                    const startEl = document.getElementById(\`date-\${DateUtils.formatDate(monthStart, 'yyyy-MM-dd')}\`);
                    if(startEl) container.scrollTo({ left: startEl.offsetLeft - 128, top: startEl.offsetTop - container.offsetTop, behavior: 'smooth'});
                }
                
                setScrollAction(null);
            }, [currentMonth, scrollAction, isVertical, calendarDays]);

            const handlePrevMonth = () => {
                const prev = new Date(currentMonth); prev.setMonth(prev.getMonth() - 1); setCurrentMonth(prev); setScrollAction('end');
            };
            const handleNextMonth = () => {
                const next = new Date(currentMonth); next.setMonth(next.getMonth() + 1); setCurrentMonth(next); setScrollAction('start');
            };

            const availabilityMap = useMemo(() => {
                const map = {}; rooms.forEach(r => map[r] = {});
                reservations.forEach(res => {
                    const room = res['部屋タイプ名称'];
                    if (!map[room]) map[room] = {};
                    const checkIn = DateUtils.parseDate(res['チェックイン日']);
                    const checkOut = DateUtils.parseDate(res['チェックアウト日']);
                    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) return;
                    let curr = checkIn, loop = 0;
                    while (curr <= checkOut && loop < 365) {
                        const k = DateUtils.formatDate(curr, 'yyyy-MM-dd');
                        const isCheckIn = DateUtils.isSameDay(curr, checkIn);
                        const isCheckOut = DateUtils.isSameDay(curr, checkOut);
                        if (map[room][k]) {
                            const ex = map[room][k];
                            if (ex.isCheckOut && isCheckIn) map[room][k] = { ...ex, isTurnover: true, nextGuest: res['宿泊者氏名'], type: 'turnover' };
                            else if (ex.isCheckIn && isCheckOut) map[room][k] = { ...ex, isTurnover: true, prevGuest: res['宿泊者氏名'], type: 'turnover' };
                        } else {
                            map[room][k] = { guest: res['宿泊者氏名'], isCheckIn, isCheckOut, type: isCheckIn ? 'start' : (isCheckOut ? 'end' : 'stay'), resData: res };
                        }
                        curr = DateUtils.addDays(curr, 1); loop++;
                    }
                });
                return map;
            }, [reservations, rooms]);

            const renderCell = (room, day) => {
                const k = DateUtils.formatDate(day, 'yyyy-MM-dd');
                const d = availabilityMap[room]?.[k];
                const isCurrentMonth = DateUtils.isSameMonth(day, currentMonth);
                
                // 修正: ベースのクラス定義（色は含まない）
                const baseClass = "h-full w-full text-[10px] p-1 border-r border-b border-gray-100 relative overflow-hidden flex flex-col justify-center";
                // 空セル用の背景色
                const bgEmpty = isCurrentMonth ? 'bg-white' : 'bg-gray-100';

                // データがない場合は空セル（背景色適用）
                if (!d) return <div className={\`\${baseClass} \${bgEmpty}\`}></div>;

                if (d.isTurnover) {
                    return <div className={\`\${baseClass} border-r-2 border-r-gray-400 group\`} style={{background: 'linear-gradient(135deg, #fecaca 50%, #bbf7d0 50%)'}}>
                        <div className="absolute inset-0 p-0.5 flex flex-col justify-between pointer-events-none">
                            <div className="text-[8px] leading-none text-red-900 truncate w-[90%] text-left font-bold" style={{textShadow:'0 0 2px rgba(255,255,255,0.8)'}}>OUT:{d.prevGuest||d.guest}</div>
                            <div className="text-[8px] leading-none text-green-900 truncate w-[90%] text-right self-end font-bold" style={{textShadow:'0 0 2px rgba(255,255,255,0.8)'}}>IN:{d.nextGuest||d.guest}</div>
                        </div>
                    </div>;
                } else if (d.type === 'start') {
                    return <div className={\`\${baseClass} bg-green-100 text-green-800 rounded-l-md ml-1 border-l-4 border-l-green-500\`}>
                        <span className="font-bold truncate">{d.guest}</span>
                        <span className="text-[9px]">IN</span>
                    </div>;
                } else if (d.type === 'end') {
                    return <div className={\`\${baseClass} bg-red-100 text-red-800 rounded-r-md mr-1 border-r-4 border-r-red-400\`}>
                        <span className="text-[9px] text-right">OUT</span>
                    </div>;
                }
                
                // STAY (bgEmptyを混ぜないように修正)
                return <div className={\`\${baseClass} bg-blue-100 text-blue-800\`}>
                    <div className="w-full h-1 bg-blue-300 rounded-full opacity-50"></div>
                </div>;
            };

            return (
                <div className="flex flex-col h-full bg-white shadow rounded-lg overflow-hidden">
                    <div className="p-4 border-b flex flex-wrap justify-between items-center bg-gray-50 gap-2">
                        <div className="flex gap-2">
                            <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-200 rounded"><Icons.ChevronLeft /></button>
                            <button onClick={() => { setCurrentMonth(DateUtils.startOfMonth(new Date())); setScrollAction('today'); }} className="px-3 py-1 bg-white border rounded text-sm hover:bg-gray-100">今日</button>
                            <button onClick={handleNextMonth} className="p-2 hover:bg-gray-200 rounded"><Icons.ChevronRight /></button>
                        </div>
                        <h2 className="text-lg font-bold">{DateUtils.formatDate(currentMonth, 'yyyy年 MM月')}</h2>
                        <button onClick={() => setIsVertical(!isVertical)} className="flex items-center gap-1 px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded text-sm hover:bg-blue-50">{isVertical ? <Icons.ArrowLeftRight /> : <Icons.ArrowDownUp />}{isVertical ? '横表示' : '縦表示'}</button>
                        <div className="flex gap-2 text-xs"><div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border border-green-500"></div>IN</div><div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-100"></div>STAY</div><div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-400"></div>OUT</div><div className="flex items-center gap-1"><div className="w-3 h-3" style={{background: 'linear-gradient(135deg, #fecaca 50%, #bbf7d0 50%)'}}></div>入替</div></div>
                    </div>
                    <div className="flex-1 overflow-auto relative" ref={scrollContainerRef}>
                        {isVertical ? (
                            <div className="min-w-fit">
                                <div className="flex sticky top-0 z-40 bg-white shadow-sm border-b">
                                    <div className="w-20 flex-shrink-0 p-3 font-bold bg-gray-100 border-r flex items-center justify-center text-sm text-gray-600 sticky left-0 z-50">日付</div>
                                    {rooms.map((r, i) => <div key={i} className="flex-1 min-w-[120px] max-w-[150px] p-2 text-sm font-medium border-r bg-gray-50 text-center break-words flex items-center justify-center relative z-40">{r}</div>)}
                                </div>
                                {calendarDays.map((d, i) => {
                                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                    const isToday = DateUtils.isSameDay(d, new Date());
                                    const isCurrent = DateUtils.isSameMonth(d, currentMonth);
                                    const bgHeader = isCurrent ? (isWeekend ? 'bg-orange-50 text-orange-800' : 'bg-white') : 'bg-gray-200 text-gray-500';
                                    return (
                                        <div key={i} id={\`date-\${DateUtils.formatDate(d, 'yyyy-MM-dd')}\`} className="flex border-b hover:bg-gray-50 transition-colors h-14">
                                            <div className={\`w-20 flex-shrink-0 p-1 text-sm text-center border-r sticky left-0 z-20 flex flex-col justify-center items-center shadow-sm \${bgHeader} \${isToday ? '!bg-blue-50 font-bold border-r-4 border-r-blue-500' : ''}\`}>
                                                <div className="text-[10px]">{DateUtils.formatDate(d,'E')}</div><div>{DateUtils.formatDate(d,'M/d')}</div>
                                            </div>
                                            {rooms.map((r, j) => <div key={j} className="flex-1 min-w-[120px] max-w-[150px] relative border-r border-gray-100">{renderCell(r, d)}</div>)}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="min-w-fit">
                                <div className="flex sticky top-0 z-40 bg-white shadow-sm border-b">
                                    <div className="w-32 flex-shrink-0 p-3 font-bold bg-gray-100 border-r flex items-center justify-center text-sm text-gray-600 sticky left-0 z-50">部屋名</div>
                                    {calendarDays.map((d, i) => {
                                        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                        const isToday = DateUtils.isSameDay(d, new Date());
                                        const isCurrent = DateUtils.isSameMonth(d, currentMonth);
                                        const bgHeader = isCurrent ? (isWeekend ? 'bg-orange-50 text-orange-800' : 'bg-white') : 'bg-gray-200 text-gray-500';
                                        return (
                                            <div key={i} id={\`date-\${DateUtils.formatDate(d, 'yyyy-MM-dd')}\`} className={\`flex-1 min-w-[60px] text-center border-r p-1 text-sm relative z-30 \${bgHeader} \${isToday ? '!bg-blue-50 font-bold border-b-2 border-blue-500' : ''}\`}>
                                                <div className="text-[10px]">{DateUtils.formatDate(d,'E')}</div><div>{DateUtils.formatDate(d,'d')}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {rooms.map((room, rowIndex) => (
                                    <div key={rowIndex} className="flex border-b hover:bg-gray-50 transition-colors h-14">
                                        <div className="w-32 flex-shrink-0 p-2 text-sm font-medium border-r bg-white sticky left-0 z-20 flex items-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{room}</div>
                                        {calendarDays.map((d, j) => <div key={j} className="flex-1 min-w-[60px] relative">{renderCell(room, d)}</div>)}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        };

        const ViewerApp = () => {
            const [data, setData] = useState({ activeReservations: [], cancelledReservations: [], modifiedReservations: [], rooms: [] });
            useEffect(() => {
                const embedded = document.getElementById('calendar-data');
                if (embedded) {
                    try { const json = JSON.parse(embedded.textContent); setData(json); } catch (e) { console.error("Data load failed", e); }
                }
            }, []);
            return (
                <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans text-gray-800">
                    <div className="max-w-7xl mx-auto space-y-6">
                        <header className="flex justify-between items-center gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><Icons.Calendar />宿泊予約管理カレンダー (参照用)</h1>
                                <p className="text-sm text-gray-500">生成日時: {data.generatedAt}</p>
                            </div>
                        </header>
                        <CancellationList cancellations={data.cancelledReservations} />
                        <ModifiedList modifications={data.modifiedReservations} />
                        <div className="h-[800px]">
                            <CalendarView reservations={data.activeReservations} rooms={data.rooms} />
                        </div>
                    </div>
                </div>
            );
        };
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<ViewerApp />);
    </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calendar_export_${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// --- Components ---

const ManualBookingModal = ({ isOpen, onClose, rooms, onAdd }) => {
    const [formData, setFormData] = useState({
        room: '',
        guestName: '',
        checkIn: '',
        checkOut: ''
    });

    useEffect(() => {
        if (isOpen && rooms.length > 0) {
            setFormData(prev => ({ ...prev, room: rooms[0] }));
        }
    }, [isOpen, rooms]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onAdd(formData);
        onClose();
        setFormData({ room: rooms[0] || '', guestName: '', checkIn: '', checkOut: '' });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg">予約手動追加</h3>
                    <button onClick={onClose}><Icons.X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">部屋タイプ</label>
                        <select 
                            name="room" 
                            value={formData.room} 
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            required
                        >
                            {rooms.map(r => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">宿泊者氏名</label>
                        <input 
                            type="text" 
                            name="guestName" 
                            value={formData.guestName} 
                            onChange={handleChange}
                            className="w-full p-2 border rounded"
                            placeholder="氏名を入力"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">チェックイン</label>
                            <input 
                                type="date" 
                                name="checkIn" 
                                value={formData.checkIn} 
                                onChange={handleChange}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">チェックアウト</label>
                            <input 
                                type="date" 
                                name="checkOut" 
                                value={formData.checkOut} 
                                onChange={handleChange}
                                className="w-full p-2 border rounded"
                                required
                            />
                        </div>
                    </div>
                    <div className="pt-2 flex justify-end gap-2">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-100 rounded"
                        >
                            キャンセル
                        </button>
                        <button 
                            type="submit" 
                            className="px-4 py-2 bg-blue-600 text-white rounded"
                        >
                            追加
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const FileUploader = ({ onDataLoaded }) => {
    const handleFileUpload = (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        // 個別のファイルを読み込む関数
        const readFile = (file, encoding) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(e);
                reader.readAsText(file, encoding);
            });
        };

        // 1つのファイルをパースする関数
        const processSingleFile = async (file) => {
             // 1. まずUTF-8で試す
             let text = await readFile(file, 'UTF-8');
             let parsedData = parseCSV(text);
             let headers = text.split(/\r\n|\n/)[0];

             // 2. 文字化けチェック
             if (headers && !headers.includes('予約区分') && !headers.includes('チェックイン日')) {
                 console.log(`UTF-8 check failed for ${file.name}. Retrying with Shift_JIS...`);
                 text = await readFile(file, 'Shift_JIS');
                 parsedData = parseCSV(text);
             }
             
             // データの検証
             const validData = parsedData.filter(row => row['予約区分'] && row['チェックイン日']);
             return validData;
        };

        const processFiles = async () => {
            try {
                const allDataPromises = files.map(file => processSingleFile(file));
                const results = await Promise.all(allDataPromises);
                
                // 配列の配列をフラットにする
                const flatData = results.flat();
                
                if (flatData.length === 0) {
                    alert("有効なデータが見つかりませんでした。ヘッダー形式などを確認してください。");
                    return;
                }
                
                onDataLoaded(flatData);

            } catch (error) {
                console.error("File processing error:", error);
                alert("ファイルの読み込み中にエラーが発生しました。");
            }
        };

        processFiles();
    };

    return (
        <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-white shadow-sm hover:bg-gray-50 transition-colors">
            <Icons.Upload className="w-8 h-8 text-gray-400" />
            <label className="mt-4 cursor-pointer">
                <span className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition">
                    CSVファイル（複数可）を選択
                </span>
                <input type="file" accept=".csv" multiple className="hidden" onChange={handleFileUpload} />
            </label>
            <p className="mt-2 text-sm text-gray-500">ReservationList.CSV をアップロードしてください</p>
        </div>
    );
};

const CancellationList = ({ cancellations }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!cancellations || cancellations.length === 0) return null;

    return (
        <div className="mb-6 border border-red-200 rounded-lg bg-red-50 overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-red-100 hover:bg-red-200 text-red-800 font-medium"
            >
                <div className="flex items-center gap-2">
                    <Icons.AlertCircle className="w-5 h-5" />
                    <span>キャンセル一覧 ({cancellations.length}件)</span>
                </div>
                {isOpen ? <Icons.ChevronUp className="w-5 h-5" /> : <Icons.ChevronDown className="w-5 h-5" />}
            </button>
            
            {isOpen && (
                <div className="p-4 overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-red-50 border-b border-red-200">
                            <tr>
                                <th className="px-4 py-2">チェックイン</th>
                                <th className="px-4 py-2">宿泊者名</th>
                                <th className="px-4 py-2">部屋タイプ</th>
                                <th className="px-4 py-2">予約サイト</th>
                                <th className="px-4 py-2">キャンセル理由/備考</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cancellations.map((c, idx) => (
                                <tr key={idx} className="bg-white border-b border-red-100 hover:bg-red-50">
                                    <td className="px-4 py-2 font-medium">{c['チェックイン日']}</td>
                                    <td className="px-4 py-2">{c['宿泊者氏名']}</td>
                                    <td className="px-4 py-2 text-xs text-gray-600">{c['部屋タイプ名称']}</td>
                                    <td className="px-4 py-2">{c['予約サイト名称']}</td>
                                    <td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate" title={c['備考1'] || c['備考2']}>
                                        {c['備考1'] || c['備考2']}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const ModifiedList = ({ modifications }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (!modifications || modifications.length === 0) return null;

    return (
        <div className="mb-6 border border-yellow-200 rounded-lg bg-yellow-50 overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 font-medium"
            >
                <div className="flex items-center gap-2">
                    <Icons.AlertTriangle className="w-5 h-5" />
                    <span>予約変更あり ({modifications.length}件)</span>
                </div>
                {isOpen ? <Icons.ChevronUp className="w-5 h-5" /> : <Icons.ChevronDown className="w-5 h-5" />}
            </button>
            
            {isOpen && (
                <div className="p-4 overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-yellow-50 border-b border-yellow-200">
                            <tr>
                                <th className="px-4 py-2">チェックイン</th>
                                <th className="px-4 py-2">宿泊者名</th>
                                <th className="px-4 py-2">部屋タイプ</th>
                                <th className="px-4 py-2">予約サイト</th>
                                <th className="px-4 py-2">備考</th>
                            </tr>
                        </thead>
                        <tbody>
                            {modifications.map((c, idx) => (
                                <tr key={idx} className="bg-white border-b border-yellow-100 hover:bg-yellow-50">
                                    <td className="px-4 py-2 font-medium">{c['チェックイン日']}</td>
                                    <td className="px-4 py-2">{c['宿泊者氏名']}</td>
                                    <td className="px-4 py-2 text-xs text-gray-600">{c['部屋タイプ名称']}</td>
                                    <td className="px-4 py-2">{c['予約サイト名称']}</td>
                                    <td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate" title={c['備考1'] || c['備考2']}>
                                        {c['備考1'] || c['備考2']}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const CalendarView = ({ reservations, rooms }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date()); 
    const [isVertical, setIsVertical] = useState(false);
    const scrollContainerRef = useRef(null);
    const [scrollAction, setScrollAction] = useState('today'); 

    useEffect(() => {
        if (reservations.length > 0) {
            setCurrentMonth(DateUtils.startOfMonth(new Date()));
            setScrollAction('today');
        }
    }, [reservations]);

    const calendarDays = useMemo(() => {
        const days = [];
        const monthStart = DateUtils.startOfMonth(currentMonth);
        const monthEnd = DateUtils.endOfMonth(currentMonth);
        
        let curr = DateUtils.addDays(monthStart, -7);
        const end = DateUtils.addDays(monthEnd, 7);

        while (curr <= end) {
            days.push(new Date(curr));
            curr = DateUtils.addDays(curr, 1);
        }
        return days;
    }, [currentMonth]);

    useEffect(() => {
        if (!scrollAction || !scrollContainerRef.current) return;

        const container = scrollContainerRef.current;
        let targetId = null;
        let alignment = 'start';

        if (scrollAction === 'today') {
            targetId = `date-${DateUtils.formatDate(new Date(), 'yyyy-MM-dd')}`;
            alignment = 'start';
        } else if (scrollAction === 'start') {
            const monthStart = DateUtils.startOfMonth(currentMonth);
            targetId = `date-${DateUtils.formatDate(monthStart, 'yyyy-MM-dd')}`;
            alignment = 'start';
        } else if (scrollAction === 'end') {
            const monthEnd = DateUtils.endOfMonth(currentMonth);
            targetId = `date-${DateUtils.formatDate(monthEnd, 'yyyy-MM-dd')}`;
            alignment = 'end';
        }

        const targetEl = document.getElementById(targetId);

        if (targetEl) {
            if (isVertical) {
                if (alignment === 'end') {
                    const top = targetEl.offsetTop - container.clientHeight + targetEl.clientHeight;
                    container.scrollTo({ top, behavior: 'smooth' });
                } else {
                    container.scrollTo({ top: targetEl.offsetTop - container.offsetTop, behavior: 'smooth' });
                }
            } else {
                const stickyHeaderWidth = 128; // w-32
                if (alignment === 'end') {
                    const left = (targetEl.offsetLeft + targetEl.offsetWidth) - container.clientWidth;
                    container.scrollTo({ left, behavior: 'smooth' });
                } else {
                    container.scrollTo({ left: targetEl.offsetLeft - stickyHeaderWidth, behavior: 'smooth' });
                }
            }
        } else if (scrollAction === 'today') {
            const monthStart = DateUtils.startOfMonth(currentMonth);
            const startId = `date-${DateUtils.formatDate(monthStart, 'yyyy-MM-dd')}`;
            const startEl = document.getElementById(startId);
            if(startEl) {
                 if (isVertical) {
                    container.scrollTo({ top: startEl.offsetTop - container.offsetTop, behavior: 'smooth' });
                 } else {
                    container.scrollTo({ left: startEl.offsetLeft - 128, behavior: 'smooth' });
                 }
            }
        }
        
        setScrollAction(null);
    }, [currentMonth, scrollAction, isVertical, calendarDays]);

    const handlePrevMonth = () => {
        const prev = new Date(currentMonth);
        prev.setMonth(prev.getMonth() - 1);
        setCurrentMonth(prev);
        setScrollAction('end');
    };

    const handleNextMonth = () => {
        const next = new Date(currentMonth);
        next.setMonth(next.getMonth() + 1);
        setCurrentMonth(next);
        setScrollAction('start');
    };

    const availabilityMap = useMemo(() => {
        const map = {}; rooms.forEach(r => map[r] = {});
        reservations.forEach(res => {
            const room = res['部屋タイプ名称'];
            if (!map[room]) map[room] = {};
            const checkIn = DateUtils.parseDate(res['チェックイン日']);
            const checkOut = DateUtils.parseDate(res['チェックアウト日']);
            if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) return;
            
            let curr = checkIn, loop = 0;
            while (curr <= checkOut && loop < 365) {
                const k = DateUtils.formatDate(curr, 'yyyy-MM-dd');
                const isCheckIn = DateUtils.isSameDay(curr, checkIn);
                const isCheckOut = DateUtils.isSameDay(curr, checkOut);
                if (map[room][k]) {
                    const ex = map[room][k];
                    if (ex.isCheckOut && isCheckIn) map[room][k] = { ...ex, isTurnover: true, nextGuest: res['宿泊者氏名'], type: 'turnover' };
                    else if (ex.isCheckIn && isCheckOut) map[room][k] = { ...ex, isTurnover: true, prevGuest: res['宿泊者氏名'], type: 'turnover' };
                } else {
                    map[room][k] = { guest: res['宿泊者氏名'], isCheckIn, isCheckOut, type: isCheckIn ? 'start' : (isCheckOut ? 'end' : 'stay'), resData: res };
                }
                curr = DateUtils.addDays(curr, 1); loop++;
            }
        });
        return map;
    }, [reservations, rooms]);

    const renderCell = (room, day) => {
        const k = DateUtils.formatDate(day, 'yyyy-MM-dd');
        const d = availabilityMap[room]?.[k];
        
        const isCurrentMonth = DateUtils.isSameMonth(day, currentMonth);
        
        // 変更: bgBase は空セルの場合のみ適用し、予約セルでは適用しない（または上書きされるようにする）
        const baseClass = "h-full w-full text-[10px] p-1 border-r border-b border-gray-100 relative overflow-hidden flex flex-col justify-center";
        const bgEmpty = isCurrentMonth ? 'bg-white' : 'bg-gray-100';

        if (!d) return <div className={`${baseClass} ${bgEmpty}`}></div>;
        
        if (d.isTurnover) {
            // 修正: style属性でグラデーションを指定
            return <div className={`${baseClass} border-r-2 border-r-gray-400 group`} style={{background: 'linear-gradient(135deg, #fecaca 50%, #bbf7d0 50%)'}}>
                <div className="absolute inset-0 p-0.5 flex flex-col justify-between pointer-events-none">
                    <div className="text-[8px] leading-none text-red-900 truncate w-[90%] text-left font-bold" style={{textShadow:'0 0 2px rgba(255,255,255,0.8)'}}>OUT:{d.prevGuest||d.guest}</div>
                    <div className="text-[8px] leading-none text-green-900 truncate w-[90%] text-right self-end font-bold" style={{textShadow:'0 0 2px rgba(255,255,255,0.8)'}}>IN:{d.nextGuest||d.guest}</div>
                </div>
                <div className="hidden group-hover:block absolute z-10 bottom-full left-0 bg-black text-white p-2 rounded text-xs w-48 shadow-lg pointer-events-none">
                    <p className="text-red-300">OUT: {d.guest || d.prevGuest}</p>
                    <p className="text-green-300">IN: {d.nextGuest || d.guest}</p>
                </div>
            </div>;
        } else if (d.type === 'start') {
            // 修正: 明示的に背景色クラスを付与
            return <div className={`${baseClass} bg-green-100 text-green-800 rounded-l-md ml-1 border-l-4 border-l-green-500`}>
                <span className="font-bold truncate">{d.guest}</span>
                <span className="text-[9px]">IN</span>
            </div>;
        } else if (d.type === 'end') {
            return <div className={`${baseClass} bg-red-100 text-red-800 rounded-r-md mr-1 border-r-4 border-r-red-400`}>
                <span className="text-[9px] text-right">OUT</span>
            </div>;
        }
        return <div className={`${baseClass} bg-blue-100 text-blue-800`}>
            <div className="w-full h-1 bg-blue-300 rounded-full opacity-50"></div>
        </div>;
    };

    return (
        <div className="flex flex-col h-full bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b flex flex-wrap justify-between items-center bg-gray-50 gap-2">
                <div className="flex gap-2">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-200 rounded"><Icons.ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={() => { setCurrentMonth(DateUtils.startOfMonth(new Date())); setScrollAction('today'); }} className="px-3 py-1 bg-white border rounded text-sm hover:bg-gray-100">今日</button>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-gray-200 rounded"><Icons.ChevronRight className="w-4 h-4" /></button>
                </div>
                <h2 className="text-lg font-bold">{DateUtils.formatDate(currentMonth, 'yyyy年 MM月')}</h2>
                <button onClick={() => setIsVertical(!isVertical)} className="flex items-center gap-1 px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded text-sm hover:bg-blue-50">{isVertical ? <Icons.ArrowLeftRight className="w-4 h-4" /> : <Icons.ArrowDownUp className="w-4 h-4" />}{isVertical ? '横表示' : '縦表示'}</button>
                <div className="flex gap-2 text-xs"><div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-100 border border-green-500"></div>IN</div><div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-100"></div>STAY</div><div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-100 border border-red-400"></div>OUT</div><div className="flex items-center gap-1"><div className="w-3 h-3" style={{background: 'linear-gradient(135deg, #fecaca 50%, #bbf7d0 50%)'}}></div>入替</div></div>
            </div>
            
            {/* Scroll Container */}
            <div className="flex-1 overflow-auto relative" ref={scrollContainerRef}>
                {isVertical ? (
                    <div className="min-w-fit">
                        <div className="flex sticky top-0 z-40 bg-white shadow-sm border-b">
                            <div className="w-20 flex-shrink-0 p-3 font-bold bg-gray-100 border-r flex items-center justify-center text-sm text-gray-600 sticky left-0 z-50">日付</div>
                            {rooms.map((r, i) => <div key={i} className="flex-1 min-w-[120px] max-w-[150px] p-2 text-sm font-medium border-r bg-gray-50 text-center break-words flex items-center justify-center relative z-40">{r}</div>)}
                        </div>
                        {calendarDays.map((d, i) => {
                            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                            const isToday = DateUtils.isSameDay(d, new Date());
                            const isCurrent = DateUtils.isSameMonth(d, currentMonth);
                            const bgHeader = isCurrent ? (isWeekend ? 'bg-orange-50 text-orange-800' : 'bg-white') : 'bg-gray-200 text-gray-500';
                            
                            return (
                                <div key={i} id={`date-${DateUtils.formatDate(d, 'yyyy-MM-dd')}`} className="flex border-b hover:bg-gray-50 transition-colors h-14">
                                    <div className={`w-20 flex-shrink-0 p-1 text-sm text-center border-r sticky left-0 z-20 flex flex-col justify-center items-center shadow-sm ${bgHeader} ${isToday ? '!bg-blue-50 font-bold border-r-4 border-r-blue-500' : ''}`}>
                                        <div className="text-[10px]">{DateUtils.formatDate(d,'E')}</div><div>{DateUtils.formatDate(d,'M/d')}</div>
                                    </div>
                                    {rooms.map((r, j) => <div key={j} className="flex-1 min-w-[120px] max-w-[150px] relative border-r border-gray-100">{renderCell(r, d)}</div>)}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="min-w-fit">
                        <div className="flex sticky top-0 z-40 bg-white shadow-sm border-b">
                            <div className="w-32 flex-shrink-0 p-3 font-bold bg-gray-100 border-r flex items-center justify-center text-sm text-gray-600 sticky left-0 z-50">部屋名</div>
                            {calendarDays.map((d, i) => {
                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                const isToday = DateUtils.isSameDay(d, new Date());
                                const isCurrent = DateUtils.isSameMonth(d, currentMonth);
                                const bgHeader = isCurrent ? (isWeekend ? 'bg-orange-50 text-orange-800' : 'bg-white') : 'bg-gray-200 text-gray-500';

                                return (
                                    <div key={i} id={`date-${DateUtils.formatDate(d, 'yyyy-MM-dd')}`} className={`flex-1 min-w-[60px] text-center border-r p-1 text-sm relative z-30 ${bgHeader} ${isToday ? '!bg-blue-50 font-bold border-b-2 border-blue-500' : ''}`}>
                                        <div className="text-[10px]">{DateUtils.formatDate(d,'E')}</div><div>{DateUtils.formatDate(d,'d')}</div>
                                    </div>
                                );
                            })}
                        </div>
                        {rooms.map((room, rowIndex) => (
                            <div key={rowIndex} className="flex border-b hover:bg-gray-50 transition-colors h-14">
                                <div className="w-32 flex-shrink-0 p-2 text-sm font-medium border-r bg-white sticky left-0 z-20 flex items-center shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{room}</div>
                                {calendarDays.map((d, j) => <div key={j} className="flex-1 min-w-[60px] relative">{renderCell(room, d)}</div>)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// App Container
export default function App() {
    const [data, setData] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [activeReservations, setActiveReservations] = useState([]);
    const [cancelledReservations, setCancelledReservations] = useState([]);
    const [modifiedReservations, setModifiedReservations] = useState([]);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [generatedAt, setGeneratedAt] = useState(null);

    const handleDataLoaded = (rawData) => {
        setGeneratedAt(new Date());
        const uniqueMap = new Map();
        
        rawData.forEach(item => {
            const resNo = item['予約番号'];
            const roomType = item['部屋タイプ名称'];
            const checkIn = item['チェックイン日'];
            let key = (resNo && roomType) ? `${resNo}_${roomType}` : `${item['宿泊者氏名']}-${checkIn}-${roomType}`;
            uniqueMap.set(key, item);
        });
        const validData = Array.from(uniqueMap.values());
        
        const uniqueRooms = Array.from(new Set(validData.map(r => r['部屋タイプ名称']))).filter(Boolean).sort();
        
        // 1. 通常予約 (予約 または 変更)
        const active = validData.filter(r => r['予約区分'] !== 'キャンセル');
        
        const today = DateUtils.startOfDay(new Date());
        
        // 2. キャンセル予約 (今日以降)
        const cancelledMap = new Map();
        validData.filter(r => r['予約区分'] === 'キャンセル').forEach(r => {
            const checkInDate = DateUtils.parseDate(r['チェックイン日']);
            if (checkInDate >= today) {
                const key = r['予約番号'] ? `${r['予約番号']}_${r['部屋タイプ名称']}` : `${r['宿泊者氏名']}_${r['チェックイン日']}_${r['部屋タイプ名称']}`;
                if (!cancelledMap.has(key)) {
                    cancelledMap.set(key, r);
                }
            }
        });
        const cancelled = Array.from(cancelledMap.values()).sort((a, b) => DateUtils.parseDate(a['チェックイン日']) - DateUtils.parseDate(b['チェックイン日']));

        // 3. 変更予約 (予約区分が「変更」かつ今日以降)
        const modifiedMap = new Map();
        validData.filter(r => r['予約区分'] === '変更').forEach(r => {
            const checkInDate = DateUtils.parseDate(r['チェックイン日']);
            if (checkInDate >= today) {
                const key = r['予約番号'] ? `${r['予約番号']}_${r['部屋タイプ名称']}` : `${r['宿泊者氏名']}_${r['チェックイン日']}_${r['部屋タイプ名称']}`;
                if (!modifiedMap.has(key)) modifiedMap.set(key, r);
            }
        });
        const modified = Array.from(modifiedMap.values()).sort((a, b) => DateUtils.parseDate(a['チェックイン日']) - DateUtils.parseDate(b['チェックイン日']));

        setData(validData);
        setRooms(uniqueRooms);
        setActiveReservations(active);
        setCancelledReservations(cancelled);
        setModifiedReservations(modified);
    };

    const handleAddManualReservation = (newRes) => {
        const formattedRes = {
            '予約区分': '予約',
            '部屋タイプ名称': newRes.room,
            '宿泊者氏名': newRes.guestName,
            'チェックイン日': DateUtils.formatDate(new Date(newRes.checkIn), 'yyyy/MM/dd'),
            'チェックアウト日': DateUtils.formatDate(new Date(newRes.checkOut), 'yyyy/MM/dd'),
            '予約サイト名称': '手動追加',
            '予約番号': `MANUAL_${Date.now()}`
        };
        const updatedData = [...data, formattedRes];
        handleDataLoaded(updatedData);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans text-gray-800">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Icons.Calendar className="w-8 h-8 text-blue-600" />
                            宿泊予約管理カレンダー
                        </h1>
                        <p className="text-sm text-gray-500">CSVデータをアップロードして予約状況を可視化します</p>
                        {generatedAt && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                <Icons.Clock className="w-4 h-4" />
                                <p>データ生成日時: {generatedAt.toLocaleString()}</p>
                            </div>
                        )}
                    </div>
                </header>

                {data.length === 0 ? (
                    <FileUploader onDataLoaded={handleDataLoaded} />
                ) : (
                    <>
                        <div className="flex justify-end gap-2 flex-wrap">
                             <button onClick={() => setIsManualModalOpen(true)} className="flex items-center gap-1 text-sm text-white bg-green-600 hover:bg-green-700 px-3 py-2 rounded shadow-sm transition-colors"><Icons.Plus className="w-4 h-4" />予約を手動追加</button>
                             <button onClick={() => downloadStaticHtml(activeReservations, cancelledReservations, modifiedReservations, rooms, generatedAt)} className="flex items-center gap-1 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded shadow-sm transition-colors"><Icons.Download className="w-4 h-4" />静的HTMLをダウンロード</button>
                            <button onClick={() => setData([])} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 bg-white px-3 py-2 rounded border shadow-sm transition-colors"><Icons.RefreshCw className="w-3 h-3" />ファイル再読み込み</button>
                        </div>
                        <CancellationList cancellations={cancelledReservations} />
                        <ModifiedList modifications={modifiedReservations} />
                        <div className="h-[600px]"><CalendarView reservations={activeReservations} rooms={rooms} /></div>
                        <ManualBookingModal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} rooms={rooms} onAdd={handleAddManualReservation} />
                    </>
                )}
            </div>
        </div>
    );
}