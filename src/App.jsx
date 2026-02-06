import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Upload, ChevronDown, ChevronUp, AlertCircle, ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCw, Download, ArrowLeftRight, ArrowDownUp, Plus, X, Clock, AlertTriangle, Lock, LogIn } from 'lucide-react';
import { db } from './firebase'; 
import { doc, onSnapshot, setDoc } from "firebase/firestore";

const APP_PASSCODE = import.meta.env.VITE_APP_PASSCODE || "0000";

const Icons = {
    Upload, ChevronDown, ChevronUp, AlertCircle, ChevronLeft, ChevronRight, Calendar: CalendarIcon,
    RefreshCw, Download, ArrowLeftRight, ArrowDownUp, Plus, X, Clock, AlertTriangle, Lock, LogIn
};

const DateUtils = {
    addDays: (date, days) => { const r = new Date(date); r.setDate(r.getDate() + days); return r; },
    startOfDay: (date) => { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; },
    startOfMonth: (date) => new Date(date.getFullYear(), date.getMonth(), 1),
    endOfMonth: (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0),
    isSameMonth: (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth(),
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
        return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    }
};

const parseCSV = (text) => {
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
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

const downloadStaticHtml = (activeReservations, cancelledReservations, modifiedReservations, rooms, generatedAtDate) => {
    const generatedAtStr = generatedAtDate ? generatedAtDate.toLocaleString() : new Date().toLocaleString();
    const embeddedData = JSON.stringify({ activeReservations, cancelledReservations, modifiedReservations, rooms, generatedAt: generatedAtStr });
    const htmlContent = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Reservation Calendar</title><script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script><script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script><script src="https://unpkg.com/@babel/standalone/babel.min.js"></script><script src="https://cdn.tailwindcss.com"></script><style>body{font-family:"Helvetica Neue",Arial,sans-serif}</style></head><body class="bg-gray-50"><div id="root"></div><script id="calendar-data" type="application/json">${embeddedData}</script><script type="text/babel">
        const { useState } = React;
        const App = () => {
            const data = JSON.parse(document.getElementById('calendar-data').textContent);
            return <div className="p-8"><h1>予約カレンダー (エクスポート版)</h1><p>データ日時: {data.generatedAt}</p><p>※詳細は管理画面を確認してください</p></div>;
        };
        ReactDOM.createRoot(document.getElementById('root')).render(<App />);
    </script></body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `calendar_${new Date().toISOString().slice(0,10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const LoginScreen = ({ onLogin }) => {
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);
    const handleSubmit = (e) => {
        e.preventDefault();
        if (input === APP_PASSCODE) onLogin();
        else { setError(true); setInput(''); }
    };
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full">
                <div className="flex justify-center mb-6"><div className="p-4 bg-blue-100 rounded-full"><Icons.Lock className="w-8 h-8 text-blue-600" /></div></div>
                <h2 className="text-xl font-bold text-center mb-6 text-gray-800">パスコードを入力</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="password" inputMode="numeric" value={input} onChange={(e) => { setInput(e.target.value); setError(false); }} className="w-full text-center text-2xl tracking-widest p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="••••" autoFocus />
                    {error && <p className="text-red-500 text-sm text-center font-bold">パスコードが違います</p>}
                    <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2"><Icons.LogIn className="w-5 h-5" /> 解除</button>
                </form>
            </div>
        </div>
    );
};

const ManualBookingModal = ({ isOpen, onClose, rooms, onAdd }) => {
    const [formData, setFormData] = useState({ room: '', guestName: '', checkIn: '', checkOut: '' });
    useEffect(() => { if (isOpen && rooms.length > 0) setFormData(prev => ({ ...prev, room: rooms[0] })); }, [isOpen, rooms]);
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleSubmit = (e) => { e.preventDefault(); onAdd(formData); onClose(); setFormData({ room: rooms[0] || '', guestName: '', checkIn: '', checkOut: '' }); };
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50"><h3 className="font-bold">予約手動追加</h3><button onClick={onClose}><Icons.X className="w-5 h-5" /></button></div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div><label className="text-sm block mb-1">部屋</label><select name="room" value={formData.room} onChange={handleChange} className="w-full border p-2 rounded">{rooms.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
                    <div><label className="text-sm block mb-1">氏名</label><input name="guestName" value={formData.guestName} onChange={handleChange} className="w-full border p-2 rounded" required /></div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-sm block mb-1">IN</label><input type="date" name="checkIn" value={formData.checkIn} onChange={handleChange} className="w-full border p-2 rounded" required /></div>
                        <div><label className="text-sm block mb-1">OUT</label><input type="date" name="checkOut" value={formData.checkOut} onChange={handleChange} className="w-full border p-2 rounded" required /></div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded">取消</button><button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">追加</button></div>
                </form>
            </div>
        </div>
    );
};

const FileUploader = ({ onDataLoaded }) => {
    const handleFileUpload = (event) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;
        const readFile = (file, encoding) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = e => resolve(e.target.result); r.onerror = reject; r.readAsText(file, encoding); });
        const processFiles = async () => {
            try {
                const results = await Promise.all(files.map(async f => {
                    let t = await readFile(f, 'UTF-8');
                    let p = parseCSV(t);
                    if (t.split('\n')[0] && !t.includes('予約区分')) { t = await readFile(f, 'Shift_JIS'); p = parseCSV(t); }
                    return p.filter(row => row['予約区分'] && row['チェックイン日']);
                }));
                const flatData = results.flat();
                if(flatData.length === 0) alert("有効なデータなし"); else onDataLoaded(flatData);
            } catch (e) { alert("読込エラー"); }
        };
        processFiles();
    };
    return (
        <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-white shadow-sm hover:bg-gray-50 transition-colors">
            <Icons.Upload className="w-8 h-8 text-gray-400" /><label className="mt-4 cursor-pointer"><span className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition">CSVを選択</span><input type="file" accept=".csv" multiple className="hidden" onChange={handleFileUpload} /></label>
        </div>
    );
};

const CancellationList = ({ cancellations }) => {
    const [isOpen, setIsOpen] = useState(false);
    if (!cancellations || cancellations.length === 0) return null;
    return (
        <div className="mb-6 border border-red-200 rounded-lg bg-red-50"><button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between p-4 bg-red-100 text-red-800 font-medium"><div className="flex gap-2"><Icons.AlertCircle /><span>キャンセル ({cancellations.length})</span></div>{isOpen?<Icons.ChevronUp/>:<Icons.ChevronDown/>}</button>
            {isOpen && <div className="p-4 overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-red-50"><tr><th className="p-2">IN</th><th className="p-2">氏名</th><th className="p-2">部屋</th><th className="p-2">備考</th></tr></thead><tbody>{cancellations.map((c,i)=><tr key={i} className="border-b"><td className="p-2">{c['チェックイン日']}</td><td className="p-2">{c['宿泊者氏名']}</td><td className="p-2">{c['部屋タイプ名称']}</td><td className="p-2 truncate max-w-xs">{c['備考1']}</td></tr>)}</tbody></table></div>}
        </div>
    );
};

const ModifiedList = ({ modifications }) => {
    const [isOpen, setIsOpen] = useState(false);
    if (!modifications || modifications.length === 0) return null;
    return (
        <div className="mb-6 border border-yellow-200 rounded-lg bg-yellow-50"><button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between p-4 bg-yellow-100 text-yellow-800 font-medium"><div className="flex gap-2"><Icons.AlertTriangle /><span>変更あり ({modifications.length})</span></div>{isOpen?<Icons.ChevronUp/>:<Icons.ChevronDown/>}</button>
            {isOpen && <div className="p-4 overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-yellow-50"><tr><th className="p-2">IN</th><th className="p-2">氏名</th><th className="p-2">部屋</th><th className="p-2">備考</th></tr></thead><tbody>{modifications.map((c,i)=><tr key={i} className="border-b"><td className="p-2">{c['チェックイン日']}</td><td className="p-2">{c['宿泊者氏名']}</td><td className="p-2">{c['部屋タイプ名称']}</td><td className="p-2 truncate max-w-xs">{c['備考1']}</td></tr>)}</tbody></table></div>}
        </div>
    );
};

// --- 縦表示専用コンポーネント ---
const VerticalView = ({ calendarDays, rooms, renderCell, currentMonth, scrollContainerRef }) => (
    <div className="min-w-fit" key="vertical-root">
        <div className="flex sticky top-0 z-40 bg-white border-b">
            <div className="w-20 p-2 bg-gray-100 border-r text-center text-sm sticky left-0 z-50">日付</div>
            {rooms.map(r => <div key={r} className="flex-1 min-w-[120px] p-2 text-sm text-center border-r bg-gray-50">{r}</div>)}
        </div>
        {calendarDays.map((d, i) => (
            <div key={`v-row-${i}`} id={`v-date-${DateUtils.formatDate(d, 'yyyy-MM-dd')}`} className="flex h-14 border-b">
                <div className={`w-20 p-1 text-center border-r sticky left-0 z-20 flex flex-col justify-center ${DateUtils.isSameDay(d, new Date()) ? 'bg-blue-50 font-bold' : (DateUtils.isSameMonth(d, currentMonth) ? 'bg-white' : 'bg-gray-200')}`}>
                    <div className="text-xs">{DateUtils.formatDate(d, 'E')}</div>
                    <div>{DateUtils.formatDate(d, 'M/d')}</div>
                </div>
                {rooms.map(r => <div key={`v-cell-${r}-${i}`} className="flex-1 min-w-[120px] border-r">{renderCell(r, d)}</div>)}
            </div>
        ))}
    </div>
);

// --- 横表示専用コンポーネント ---
const HorizontalView = ({ calendarDays, rooms, renderCell, currentMonth, scrollContainerRef }) => (
    <div className="min-w-fit" key="horizontal-root">
        <div className="flex sticky top-0 z-40 bg-white border-b">
            <div className="w-32 p-2 bg-gray-100 border-r text-center text-sm sticky left-0 z-50">部屋</div>
            {calendarDays.map(d => (
                <div key={`h-header-${DateUtils.formatDate(d, 'yyyy-MM-dd')}`} id={`h-date-${DateUtils.formatDate(d, 'yyyy-MM-dd')}`} className={`flex-1 min-w-[60px] p-1 text-center border-r text-sm ${DateUtils.isSameDay(d, new Date()) ? 'bg-blue-50 font-bold' : (DateUtils.isSameMonth(d, currentMonth) ? 'bg-white' : 'bg-gray-200')}`}>
                    {DateUtils.formatDate(d, 'd')}
                </div>
            ))}
        </div>
        {rooms.map(r => (
            <div key={`h-row-${r}`} className="flex h-14 border-b">
                <div className="w-32 p-2 text-sm font-medium border-r bg-white sticky left-0 z-20 flex items-center shadow-sm">{r}</div>
                {calendarDays.map(d => (
                    <div key={`h-cell-${r}-${DateUtils.formatDate(d, 'yyyy-MM-dd')}`} className="flex-1 min-w-[60px]">{renderCell(r, d)}</div>
                ))}
            </div>
        ))}
    </div>
);

const CalendarView = ({ reservations, rooms }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isVertical, setIsVertical] = useState(false);
    const [isPending, setIsPending] = useState(false); // 低スペックマシン用の描画待機フラグ
    const scrollContainerRef = useRef(null);
    const [scrollAction, setScrollAction] = useState('today');

    // 切替時に一旦描画を消してブラウザの負荷を逃がす
    const toggleOrientation = () => {
        setIsPending(true);
        setTimeout(() => {
            setIsVertical(!isVertical);
            setIsPending(false);
            setScrollAction('today');
        }, 50); // 50msの猶予でDOM破棄と構築を分離
    };

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
        while (curr <= end) { days.push(new Date(curr)); curr = DateUtils.addDays(curr, 1); }
        return days;
    }, [currentMonth]);

    useEffect(() => {
        if (isPending || !scrollAction || !scrollContainerRef.current) return;
        const container = scrollContainerRef.current;
        const prefix = isVertical ? 'v-' : 'h-';
        let targetId = scrollAction === 'today' ? `${prefix}date-${DateUtils.formatDate(new Date(), 'yyyy-MM-dd')}` : null;
        if (scrollAction === 'start') targetId = `${prefix}date-${DateUtils.formatDate(DateUtils.startOfMonth(currentMonth), 'yyyy-MM-dd')}`;
        if (scrollAction === 'end') targetId = `${prefix}date-${DateUtils.formatDate(DateUtils.endOfMonth(currentMonth), 'yyyy-MM-dd')}`;

        const targetEl = document.getElementById(targetId);
        if (targetEl) {
            const offset = isVertical ? targetEl.offsetTop - container.offsetTop : targetEl.offsetLeft - 128;
            container.scrollTo({ [isVertical ? 'top' : 'left']: offset, behavior: 'auto' }); // 低スペック向けにsmoothからautoへ
        }
        setScrollAction(null);
    }, [currentMonth, scrollAction, isVertical, isPending]);

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
                } else map[room][k] = { guest: res['宿泊者氏名'], isCheckIn, isCheckOut, type: isCheckIn ? 'start' : (isCheckOut ? 'end' : 'stay') };
                curr = DateUtils.addDays(curr, 1); loop++;
            }
        });
        return map;
    }, [reservations, rooms]);

    const renderCell = (room, day) => {
        const k = DateUtils.formatDate(day, 'yyyy-MM-dd');
        const d = availabilityMap[room]?.[k];
        const isCurrent = DateUtils.isSameMonth(day, currentMonth);
        const baseClass = "h-full w-full text-[10px] p-1 border-r border-b border-gray-100 relative overflow-hidden flex flex-col justify-center";
        const bgEmpty = isCurrent ? 'bg-white' : 'bg-gray-200'; // 明暗をはっきりさせ描画を単純化
        if (!d) return <div className={`${baseClass} ${bgEmpty}`}></div>;
        if (d.isTurnover) return <div className={`${baseClass} border-r-gray-400`} style={{ background: 'linear-gradient(135deg, #fecaca 50%, #bbf7d0 50%)' }}><div className="text-[8px] font-bold text-red-900">OUT:{d.prevGuest || d.guest}</div><div className="text-[8px] font-bold text-green-900 text-right">IN:{d.nextGuest || d.guest}</div></div>;
        if (d.type === 'start') return <div className={`${baseClass} bg-green-100 border-l-4 border-l-green-500 rounded-l`}><span className="font-bold truncate">{d.guest}</span><span className="text-[8px]">IN</span></div>;
        if (d.type === 'end') return <div className={`${baseClass} bg-red-100 border-r-4 border-r-red-400 rounded-r`}><span className="text-[8px] text-right block">OUT</span></div>;
        return <div className={`${baseClass} bg-blue-100`}><div className="w-full h-1 bg-blue-300 rounded opacity-50"></div></div>;
    };

    return (
        <div className="flex flex-col h-full bg-white shadow rounded-lg overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <div className="flex gap-2">
                    <button onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth() - 1); setCurrentMonth(d); setScrollAction('end') }} className="p-2 hover:bg-gray-200 rounded"><Icons.ChevronLeft /></button>
                    <h2 className="text-lg font-bold">{DateUtils.formatDate(currentMonth, 'yyyy年 MM月')}</h2>
                    <button onClick={() => { const d = new Date(currentMonth); d.setMonth(d.getMonth() + 1); setCurrentMonth(d); setScrollAction('start') }} className="p-2 hover:bg-gray-200 rounded"><Icons.ChevronRight /></button>
                </div>
                <button onClick={toggleOrientation} className="px-3 py-1 border rounded hover:bg-blue-50 text-blue-700 text-sm flex gap-1">
                    {isVertical ? <Icons.ArrowLeftRight className="w-4 h-4" /> : <Icons.ArrowDownUp className="w-4 h-4" />}切替
                </button>
            </div>
            <div className="flex-1 overflow-auto relative bg-gray-50" ref={scrollContainerRef}>
                {isPending ? (
                    <div className="flex items-center justify-center h-full text-gray-400 italic">再描画中...</div>
                ) : (
                    isVertical ? (
                        <VerticalView key="v-view" calendarDays={calendarDays} rooms={rooms} renderCell={renderCell} currentMonth={currentMonth} />
                    ) : (
                        <HorizontalView key="h-view" calendarDays={calendarDays} rooms={rooms} renderCell={renderCell} currentMonth={currentMonth} />
                    )
                )}
            </div>
        </div>
    );
};

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [data, setData] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [activeReservations, setActiveReservations] = useState([]);
    const [cancelledReservations, setCancelledReservations] = useState([]);
    const [modifiedReservations, setModifiedReservations] = useState([]);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [generatedAt, setGeneratedAt] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const auth = localStorage.getItem('calendar_auth');
        if (auth === 'true') setIsAuthenticated(true);
    }, []);

    const handleLogin = () => { setIsAuthenticated(true); localStorage.setItem('calendar_auth', 'true'); };
    const handleLogout = () => { setIsAuthenticated(false); localStorage.removeItem('calendar_auth'); setData([]); };

    const processData = (rawData, timestamp) => {
        if (timestamp) setGeneratedAt(new Date(timestamp));
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
        const today = DateUtils.startOfDay(new Date());
        const active = validData.filter(r => r['予約区分'] !== 'キャンセル');
        const cancelled = validData.filter(r => r['予約区分'] === 'キャンセル' && DateUtils.parseDate(r['チェックイン日']) >= today);
        const modified = validData.filter(r => r['予約区分'] === '変更' && DateUtils.parseDate(r['チェックイン日']) >= today);
        setData(validData); setRooms(uniqueRooms); setActiveReservations(active); setCancelledReservations(cancelled); setModifiedReservations(modified);
    };

    const saveToFirebase = async (newData) => {
        setIsSaving(true);
        try { await setDoc(doc(db, "calendar", "latest"), { reservations: newData, updatedAt: new Date().toISOString() }); }
        catch (e) { alert("保存失敗"); } finally { setIsSaving(false); }
    };

    useEffect(() => {
        if (!isAuthenticated) return;
        const unsub = onSnapshot(doc(db, "calendar", "latest"), (doc) => {
            if (doc.exists()) {
                const remoteData = doc.data();
                if (remoteData.reservations) processData(remoteData.reservations, remoteData.updatedAt);
            }
        });
        return () => unsub();
    }, [isAuthenticated]);

    const handleDataLoaded = (rawData) => saveToFirebase(rawData);
    const handleAddManualReservation = (newRes) => {
        const formattedRes = {
            '予約区分': '予約', '部屋タイプ名称': newRes.room, '宿泊者氏名': newRes.guestName,
            'チェックイン日': DateUtils.formatDate(new Date(newRes.checkIn), 'yyyy/MM/dd'),
            'チェックアウト日': DateUtils.formatDate(new Date(newRes.checkOut), 'yyyy/MM/dd'),
            '予約サイト名称': '手動追加', '予約番号': `MANUAL_${Date.now()}`
        };
        saveToFirebase([...data, formattedRes]);
    };
    const handleClearData = async () => { if (window.confirm("全データ削除しますか？")) { await saveToFirebase([]); setData([]); setRooms([]); } };

    if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} />;

    return (
        <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans text-gray-800">
            <div className="max-w-7xl mx-auto space-y-6">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Icons.Calendar className="w-8 h-8 text-blue-600" />
                            宿泊予約管理カレンダー
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">クラウド同期中</span>
                        </h1>
                        <p className="text-sm text-gray-500">データはクラウドに保存され、全員に共有されます</p>
                        {generatedAt && <div className="flex items-center gap-2 text-sm text-gray-500 mt-1"><Icons.Clock className="w-4 h-4" /><p>最終更新: {generatedAt.toLocaleString()}</p></div>}
                    </div>
                    <button onClick={handleLogout} className="text-sm text-gray-500 underline hover:text-red-500">ロックする</button>
                </header>

                {data.length === 0 ? (
                    <FileUploader onDataLoaded={handleDataLoaded} />
                ) : (
                    <>
                        <div className="flex justify-end gap-2 flex-wrap">
                             <div className="flex items-center text-xs text-gray-400 mr-2">{isSaving ? "保存中..." : "同期済み"}</div>
                             <button onClick={() => setIsManualModalOpen(true)} className="flex items-center gap-1 text-sm text-white bg-green-600 hover:bg-green-700 px-3 py-2 rounded shadow-sm"><Icons.Plus className="w-4 h-4" />予約手動追加</button>
                             <button onClick={() => downloadStaticHtml(activeReservations, cancelledReservations, modifiedReservations, rooms, generatedAt)} className="flex items-center gap-1 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded shadow-sm"><Icons.Download className="w-4 h-4" />HTML出力</button>
                            <button onClick={handleClearData} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 bg-white px-3 py-2 rounded border shadow-sm"><Icons.RefreshCw className="w-3 h-3" />削除</button>
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