import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, Loader2, ArrowLeft, MapPin, Home as HomeIcon,         
  DollarSign, Printer, ChevronRight, ClipboardList, ShieldCheck, 
  HardHat, Construction, Info, CheckSquare, Download, Image as ImageIcon,
  Stamp, Briefcase, Ruler, PenTool, AlertCircle, ChevronDown, ChevronUp,
  Camera, FileDown, Upload, TrendingUp, Scale, ArrowRight, Clock,
  Building2, Users, Award, Shield, CheckCircle2, Target, Wrench, Star
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { GoogleGenAI, Type } from "@google/genai";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import { WorkflowView } from './components/WorkflowView';
import { MarketPrices } from './components/MarketPrices';
import { ProjectsView } from './components/ProjectsView';
import { ArchitectureLibrary } from './components/ArchitectureLibrary';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

// --- CONFIGURATION ---
const getAIClient = () => {
    const key = localStorage.getItem('phoxanh_api_key');
    if (!key) throw new Error("Vui lòng đăng nhập bằng API Key.");
    return new GoogleGenAI({ apiKey: key });
};

const CATEGORIES = [
  { 
    id: 'pricing', 
    label: 'Báo giá & Dự toán', 
    icon: DollarSign, 
    types: [
        "Báo giá Thi công Trọn gói (Chìa khóa trao tay)", 
        "Báo giá Thi công Phần thô & Nhân công", 
        "Báo giá Sửa chữa & Cải tạo",
        "Dự toán Chi tiết Hạng mục Nội thất"
    ] 
  },
  { 
    id: 'contract', 
    label: 'Hợp đồng & Pháp lý', 
    icon: FileText, 
    types: [
        "Hợp đồng Kinh tế Thi công Xây dựng", 
        "Hợp đồng Nhân công khoán gọn", 
        "Hợp đồng Tư vấn Thiết kế Kiến trúc",
        "Hợp đồng Thi công Nội thất",
        "Hợp đồng Mua bán vật tư, thiết bị",
        "Hợp đồng Giao khoán thầu phụ (Trọn gói nhân công & vật tư)",
        "Hợp đồng Giao khoán thầu phụ (Chỉ nhân công)",
        "Phụ lục Hợp đồng điều chỉnh khối lượng", 
        "Biên bản Thanh lý Hợp đồng"
    ] 
  }
];

const VIETNAM_PROVINCES = ["Hà Nội", "TP. Hồ Chí Minh", "Đà Nẵng", "Cần Thơ", "Bình Dương", "Đồng Nai", "Long An", "Bà Rịa - Vũng Tàu", "Khác"];
const BUILDING_TYPES = ["Nhà phố", "Biệt thự", "Nhà cấp 4", "Căn hộ chung cư", "Văn phòng", "Khác"];

// --- UTILS ---
const cleanContentFromAI = (text: string) => {
    if (!text) return "";
    const patternsToRemove = [
        /Cộng hòa Xã hội Chủ nghĩa Việt Nam/gi,
        /Độc lập - Tự do - Hạnh phúc/gi,
        /^\s*---\s*$/gm // Only remove horizontal rules, not table syntax
    ];
    let cleaned = text;
    patternsToRemove.forEach(p => { cleaned = cleaned.replace(p, ''); });
    return cleaned.trim();
};

const downloadTxtFile = (title: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
};

const getIconForType = (title: string, mode: string) => {
    if (mode === 'pricing' || title?.toLowerCase().includes('báo giá') || title?.toLowerCase().includes('dự toán')) return DollarSign;
    if (title?.toLowerCase().includes('hợp đồng') || title?.toLowerCase().includes('pháp lý')) return Scale;
    if (title?.toLowerCase().includes('biên bản') || title?.toLowerCase().includes('nhật ký')) return ClipboardList;
    if (title?.toLowerCase().includes('bản vẽ')) return Ruler;
    return FileText;
};

const getTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Gần đây';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Gần đây';
    
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " năm trước";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " tháng trước";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " ngày trước";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " giờ trước";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " phút trước";
    return typeof timestamp === 'number' && seconds < 60 ? "Vừa xong" : date.toLocaleDateString('vi-VN');
};

// --- COMPONENTS & TEMPLATES ---

const LoginScreen = ({ onLogin, onGuestLogin }: { onLogin: (key: string) => void, onGuestLogin: () => void }) => {
    const [key, setKey] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (key.trim()) {
            if (key.trim() === '090.6381-186' || key.trim().startsWith('AIzaSy') || key.trim().length > 10) {
                onLogin(key.trim());
            } else {
                alert('Mã đăng nhập không hợp lệ!');
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="bg-white/80 backdrop-blur-xl p-10 rounded-[2rem] shadow-2xl max-w-md w-full border border-white ring-1 ring-slate-900/5"
            >
                <div className="flex justify-center mb-8">
                    <div className="bg-gradient-to-b from-sky-50 to-white p-5 rounded-3xl shadow-sm border border-slate-100 ring-1 ring-slate-900/5 relative group cursor-pointer transition-all hover:scale-105">
                        <div className="absolute inset-0 bg-sky-400 rounded-3xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <HardHat size={56} className="text-sky-500 relative drop-shadow-sm" />
                    </div>
                </div>
                <h1 className="text-3xl font-black text-center font-display tracking-tight text-slate-800 mb-2 leading-none">
                    PHỐ XANH <span className="text-sky-500 bg-sky-50 px-2 py-1 rounded-lg border border-sky-100">AI</span>
                </h1>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] text-center mb-10">
                    Hệ Thống Quản Trị Nhà Thầu 5.0
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">
                            Mã đăng nhập / API Key
                        </label>
                        <input 
                            type="password" 
                            className="w-full p-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-sky-500/20 focus:border-sky-500 font-mono text-sm transition-all shadow-inner"
                            placeholder="Nhập mã quản lý hoặc Google Gemini API Key..."
                            value={key}
                            onChange={e => setKey(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-400 mt-3 flex items-start gap-2 leading-relaxed ml-1">
                            <Info size={14} className="min-w-max text-sky-400" />
                            Sử dụng mã quản lý hoặc API Key của Google để truy cập đầy đủ tính năng tạo hồ sơ.
                        </p>
                    </div>
                    <button type="submit" className="w-full h-14 bg-slate-900 hover:bg-sky-600 text-white font-bold rounded-2xl transition-all shadow-lg hover:shadow-sky-500/25 uppercase tracking-widest text-[12px] flex justify-center items-center gap-3">
                        <span>Đăng nhập hệ thống (Quản lý)</span>
                        <ArrowRight size={16} />
                    </button>
                    <button type="button" onClick={onGuestLogin} className="w-full h-14 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-2xl transition-all shadow-sm border border-slate-200 uppercase tracking-widest text-[12px] flex justify-center items-center gap-3">
                        <span>Truy cập khách (Chỉ xem)</span>
                        <ArrowRight size={16} />
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

const PriceQuoteTemplate = React.forwardRef(({ data }: {data: any}, ref: any) => {
    const basicArea = Number(data.area) || 0;
    const floors = Number(data.floors) || 1;
    const mongArea = basicArea * 0.5; 
    const floorArea = basicArea * floors;
    const maiArea = basicArea * 0.5;
    const totalArea = mongArea + floorArea + maiArea;
    
    // Sử dụng đơn giá từ AI trích xuất (nếu có), nếu không dùng mặc định
    const unitPriceTho = data.unitPrice || (data.title?.includes("Thô") ? 3850000 : 7000000);
    const totalCost = totalArea * unitPriceTho;

    return (
        <div ref={ref} className="print-area bg-slate-100 p-4 md:p-8 overflow-x-auto">
            {/* Trang 1: Báo giá & Tiến độ */}
            <div id="capture-page-1" className="pdf-page bg-white mx-auto p-[25mm] w-[210mm] min-h-[297mm] h-[297mm] font-serif text-slate-800 shadow-sm mb-10 overflow-hidden relative border border-slate-200 flex flex-col">
                <div className="flex justify-between items-start mb-8">
                    <div className="text-center">
                        <p className="text-[11pt] font-bold uppercase">CÔNG TY CP PHỐ XANH</p>
                        <div className="w-16 h-[1px] bg-slate-800 mx-auto mt-1 mb-2"></div>
                        <p className="text-[10pt]">Số: PX-{Date.now().toString().slice(-4)}/BG-TC</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold text-[12pt] uppercase tracking-tighter">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                        <p className="font-bold text-[13pt]">Độc lập - Tự do - Hạnh phúc</p>
                        <div className="w-40 h-[1px] bg-black mx-auto mt-1 mb-2"></div>
                        <p className="italic text-[11pt] mt-2">
                            {data.location || 'TP.HCM'}, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                        </p>
                    </div>
                </div>

                <div className="text-center mb-8">
                    <h1 className="text-[16pt] font-bold uppercase text-slate-900 mb-2">BÁO GIÁ THI CÔNG XÂY DỰNG</h1>
                    <p className="text-[12pt] font-bold italic">Kính gửi: QUÝ KHÁCH HÀNG / QUÝ CHỦ ĐẦU TƯ</p>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="pl-4 py-1">
                        <h3 className="text-[12pt] font-bold text-slate-800 uppercase mb-2">Thông tin dự án</h3>
                        <div className="space-y-1 text-[12pt]">
                            <p><span className="text-slate-600">Hạng mục:</span> <span className="font-bold">{data.title}</span></p>
                            <p><span className="text-slate-600">Công trình:</span> <span className="font-bold">{data.buildingType || 'Nhà phố'}</span></p>
                            <p><span className="text-slate-600">Vị trí:</span> <span className="font-bold">{data.location}</span></p>
                            <p><span className="text-slate-600">Quy mô:</span> <span className="font-bold">{data.area}m² x {data.floors} Tầng</span></p>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center text-right">
                        <h3 className="text-[11pt] font-bold text-slate-500 uppercase mb-1">Dự toán tổng cộng</h3>
                        <p className="text-[18pt] font-black text-slate-800">{totalCost.toLocaleString('vi-VN')} <span className="text-[12pt] font-normal">VNĐ</span></p>
                    </div>
                </div>

                <div className="grid grid-cols-[1fr_220px] gap-6 mb-6">
                    <div>
                        <h4 className="text-[12pt] font-bold uppercase text-slate-900 mb-3 border-b border-black pb-1">1. Chi tiết diện tích thi công</h4>
                        <table className="w-full text-[11pt] border-collapse mb-1">
                            <thead className="bg-slate-100 text-slate-800">
                                <tr>
                                    <th className="p-2 text-left border border-slate-400">Hạng mục</th>
                                    <th className="p-2 text-center border border-slate-400">Cách tính</th>
                                    <th className="p-2 text-right border border-slate-400">Diện tích (m²)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="p-2 border border-slate-400">Phần móng (50%)</td>
                                    <td className="p-2 text-center border border-slate-400">{basicArea} x 0.5</td>
                                    <td className="p-2 text-right border border-slate-400 font-bold">{mongArea.toFixed(1)}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-400">Diện tích sàn ({floors} tầng)</td>
                                    <td className="p-2 text-center border border-slate-400">{basicArea} x {floors}</td>
                                    <td className="p-2 text-right border border-slate-400 font-bold">{floorArea.toFixed(1)}</td>
                                </tr>
                                <tr>
                                    <td className="p-2 border border-slate-400">Phần mái (50%)</td>
                                    <td className="p-2 text-center border border-slate-400">{basicArea} x 0.5</td>
                                    <td className="p-2 text-right border border-slate-400 font-bold">{maiArea.toFixed(1)}</td>
                                </tr>
                                <tr className="bg-slate-50 font-bold">
                                    <td className="p-2 border border-slate-400 uppercase" colSpan={2}>Tổng diện tích quy đổi</td>
                                    <td className="p-2 text-right border border-slate-400 text-slate-900 font-black">{totalArea.toFixed(1)} m²</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col">
                        <h4 className="text-[12pt] font-bold uppercase text-slate-900 mb-3 border-b border-black pb-1">2. Đơn giá & Thành tiền</h4>
                        <div className="p-4 flex-1 border border-slate-400 flex flex-col justify-center text-center">
                            <div className="py-2 border-b border-slate-300">
                                <span className="text-[11pt] text-slate-600 block mb-1">Đơn giá (VNĐ/m²)</span>
                                <span className="font-bold text-[12pt] block">{unitPriceTho.toLocaleString()}</span>
                            </div>
                            <div className="pt-4 mt-auto">
                                <p className="text-[11pt] uppercase text-slate-600 font-bold mb-1">Tổng cộng:</p>
                                <p className="text-[16pt] font-black text-slate-800 leading-none">{totalCost.toLocaleString()}</p>
                                <p className="text-[9pt] text-slate-500 mt-2 italic">Đã bao gồm thuế & phí liên quan</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-4 flex-1">
                    <h4 className="text-[12pt] font-bold uppercase text-slate-900 mb-4 border-b border-black pb-1">3. Phạm vi công việc chính</h4>
                    <div className="grid grid-cols-1 gap-y-3">
                        {[
                            { label: "Chuẩn bị:", text: "Lập lán trại, vận chuyển thiết bị, tập kết vật tư đầu vào." },
                            { label: "Phần thô:", text: "Đào móng, đổ bê tông cốt thép, xây tường, lắp đặt hệ thống điện nước âm." },
                            { label: "Hoàn thiện:", text: "Trát tường, ốp lát gạch, sơn bả, lắp đặt thiết bị vệ sinh, đèn chiếu sáng." },
                            { label: "Hạ tầng:", text: "Thi công sân vườn, cổng rào và hệ thống thoát nước tổng thể (nếu có)." },
                            { label: "Vệ sinh:", text: "Vệ sinh công nghiệp và bàn giao công trình đưa vào sử dụng." },
                            { label: "Pháp lý:", text: "Hỗ trợ xin phép xây dựng và hoàn công dự án." }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-3 text-[12pt] items-start border-b border-slate-50 pb-2">
                                <div className="mt-1 flex-shrink-0"><CheckSquare size={14} className="text-slate-600"/></div>
                                <div><span className="font-bold text-slate-700">{item.label}</span> {item.text}</div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="mt-auto pt-4 flex gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100 text-[10pt] text-amber-800 italic">
                    <AlertCircle size={14} className="text-amber-600 flex-shrink-0"/>
                    <p>Báo giá có giá trị trong vòng 30 ngày. Đơn giá có thể thay đổi dựa trên điều kiện thực tế mặt bằng và thiết kế chi tiết.</p>
                </div>
            </div>

            {/* Trang 2: Chi tiết điều khoản và tiến độ */}
            <div id="capture-page-2" className="pdf-page bg-white mx-auto p-[25mm] w-[210mm] min-h-[297mm] font-serif text-slate-800 shadow-sm mb-10 overflow-hidden relative border border-slate-200 flex flex-col">
                {data.content && (
                    <div className="mb-10">
                        <h4 className="text-[13pt] font-bold uppercase text-slate-900 mb-4 border-b border-black pb-1">4. Chi tiết các hạng mục và điều khoản (Đề xuất)</h4>
                        <div className="text-justify text-[12pt] leading-[1.6] admin-body markdown-body">
                            <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{cleanContentFromAI(data.content)}</Markdown>
                        </div>
                    </div>
                )}

                {data.timeline && (
                    <div className="mb-10">
                        <h4 className="text-[13pt] font-bold uppercase text-slate-900 mb-3 border-b border-black pb-1">5. Tiến độ thi công dự kiến</h4>
                        <div className="p-4 border border-slate-400 h-[260px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data.timeline} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" unit=" th" tick={{fontSize: 10}} />
                                    <YAxis dataKey="task" type="category" width={110} tick={{fontSize: 10}} />
                                    <Tooltip cursor={{fill: 'transparent'}} formatter={(value: number, name: string) => [value + ' tháng', name === 'duration' ? 'Thời gian' : 'Bắt đầu']} />
                                    <Bar dataKey="start" stackId="a" fill="transparent" />
                                    <Bar dataKey="duration" stackId="a" fill="#0284c7" radius={[0, 4, 4, 0]} barSize={16} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                <div className="mt-8 grid grid-cols-2 text-center relative pt-10">
                    <div>
                        <p className="font-bold uppercase text-[11pt] mb-20">Đại diện Chủ đầu tư</p>
                        <p className="text-slate-500 italic text-[10pt]">(Ký và ghi rõ họ tên)</p>
                    </div>
                    <div>
                        <p className="font-bold uppercase text-[11pt] mb-20">Đại diện Nhà thầu</p>
                        <div className="relative inline-block">
                             <p className="font-bold text-slate-800 text-[12pt]">CÔNG TY CP PHỐ XANH</p>
                             <div className="absolute -top-6 -right-6 opacity-30"><Stamp size={64} className="text-red-700 rotate-[-15deg]"/></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const DocumentTemplate = React.forwardRef(({ data }: {data: any}, ref: any) => {
    const today = new Date();

    return (
        <div ref={ref} className="print-area bg-slate-100 p-4 md:p-8 overflow-x-auto">
            <div id="capture-doc" className="pdf-page bg-white mx-auto p-[25mm] w-[210mm] min-h-[297mm] font-serif text-slate-900 shadow-sm border border-slate-200 mb-10 leading-relaxed overflow-hidden relative">
                <div className="flex flex-col items-center text-center mb-10">
                    <p className="font-bold text-[12pt] uppercase tracking-tighter">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="font-bold text-[13pt]">Độc lập - Tự do - Hạnh phúc</p>
                    <div className="w-40 h-[1px] bg-black mt-2"></div>
                    <p className="italic text-[11pt] self-end mt-12">
                        {data.location}, ngày {today.getDate()} tháng {today.getMonth() + 1} năm {today.getFullYear()}
                    </p>
                </div>
                
                <div className="text-center mb-10">
                    <h2 className="font-bold uppercase text-[16pt] leading-tight mb-2">{data.title}</h2>
                    <p className="text-[11pt] italic text-slate-600">Dự án: {data.buildingType || 'Nhà phố'} tại {data.location}</p>
                    {data.acceptanceObject && <p className="text-[11pt] italic text-slate-600 mt-1">Đối tượng: {data.acceptanceObject}</p>}
                </div>

                <div className="text-justify text-[13pt] leading-[1.8] admin-body markdown-body mb-10">
                    <Markdown remarkPlugins={[remarkGfm, remarkBreaks]}>{cleanContentFromAI(data.content)}</Markdown>
                </div>

                {data.timeline && (
                    <div className="mb-20">
                        <h3 className="font-bold uppercase text-[14pt] mb-4">Tiến độ thi công dự kiến</h3>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={data.timeline} layout="vertical" margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" unit=" tháng" />
                                    <YAxis dataKey="task" type="category" width={150} tick={{fontSize: 12}} />
                                    <Tooltip cursor={{fill: 'transparent'}} formatter={(value: number, name: string) => [value + ' tháng', name === 'duration' ? 'Thời gian' : 'Bắt đầu']} />
                                    <Bar dataKey="start" stackId="a" fill="transparent" />
                                    <Bar dataKey="duration" stackId="a" fill="#0284c7" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 text-center absolute bottom-[40mm] left-0 right-0 px-[25mm]">
                    <div>
                        <p className="font-bold uppercase text-[11pt]">ĐẠI DIỆN BÊN A</p>
                        <p className="italic text-[9pt] text-slate-400 mt-1">(Chủ đầu tư)</p>
                    </div>
                    <div>
                        <p className="font-bold uppercase text-[11pt]">ĐẠI DIỆN BÊN B</p>
                        <p className="italic text-[9pt] text-slate-400 mt-1">(Nhà thầu Phố Xanh)</p>
                    </div>
                </div>
            </div>
        </div>
    );
});

// --- MAIN APP ---

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('phoxanh_api_key'));
  const [isGuest, setIsGuest] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'home' | 'generator' | 'result' | 'internal' | 'market' | 'workflow' | 'projects' | 'library'>('home');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>('pricing');
  const [exporting, setExporting] = useState(false);
  const [isReviewingLegal, setIsReviewingLegal] = useState(false);
  const [internalData, setInternalData] = useState(() => localStorage.getItem('phoxanh_internal_data') || '');
  const [useInternalData, setUseInternalData] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    situation: '', location: 'TP. Hồ Chí Minh', subType: '', area: '120', floors: '2', buildingType: 'Nhà phố', manualUnitPrice: '', priceSource: 'market',
    acceptanceObject: '', participants: '', acceptanceTime: ''
  });
  
  const contentRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    /* Firebase is disabled in this mockup

    try {
        const firebaseConfig = JSON.parse(__firebase_config);
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'phoxanh-v5-pro';

        const initAuth = async () => {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token).catch(() => signInAnonymously(auth));
          } else {
            await signInAnonymously(auth);
          }
        };
        initAuth();

        const unsub = onAuthStateChanged(auth, (u) => {
            if (u) {
                setUser(u);
                const q = query(collection(db, 'artifacts', appId, 'users', u.uid, 'history'), orderBy('timestamp', 'desc'), limit(12));
                const unsubSnap = onSnapshot(q, (sn) => {
                  setHistory(sn.docs.map(d => ({ id: d.id, ...d.data() })));
                }, (e) => console.error("Firestore Error:", e));
                return () => unsubSnap();
            }
        });
        return () => unsub();
    } catch (e) { console.error("Firebase Init Error:", e); }
    */
  }, []);

  if (!isAuthenticated && !isGuest) {
    return <LoginScreen 
      onLogin={(key) => {
        localStorage.setItem('phoxanh_api_key', key);
        setIsAuthenticated(true);
      }}
      onGuestLogin={() => setIsGuest(true)}
    />
  }

  const handleExportPDF = async () => {
    if (!result) return;
    setExporting(true);
    try {
    const isPricing = result.mode === 'pricing' || result.title?.includes('Báo giá');
    // Ensure we only query elements inside document-content-wrapper to avoid duplicates from print duplicates
    const wrapper = document.getElementById('document-content-wrapper');
    const elementIds = isPricing && wrapper 
        ? Array.from(wrapper.querySelectorAll('[id^="capture-page-"]')).map(el => el.id).sort() 
        : ['capture-doc'];
    
    let pdf: jsPDF | null = null;
    const pdfWidth = 210;
    const pdfA4Height = 297;

    for (let i = 0; i < elementIds.length; i++) {
        const id = elementIds[i];
        const element = wrapper ? wrapper.querySelector(`#${id}`) as HTMLElement : document.getElementById(id);
        if (!element) continue;

        const elWidth = element.offsetWidth || 794;
        const elHeight = element.offsetHeight || 1123;
        
        const canvas = await htmlToImage.toCanvas(element, {
            pixelRatio: 2,
            backgroundColor: "#ffffff",
            width: elWidth,
            height: elHeight,
            style: {
                margin: '0',
                transform: 'none' // remove any scaling
            }
        });

        // Determine if we need to slice the canvas (if height is significantly larger than A4 proportion)
        const a4HeightPx = (elWidth * pdfA4Height) / pdfWidth;
        const numPages = Math.ceil(elHeight / a4HeightPx);

        for (let p = 0; p < numPages; p++) {
            const canvasChunk = document.createElement('canvas');
            canvasChunk.width = canvas.width;
            
            const srcY = p * a4HeightPx * 2;
            let sHeight = a4HeightPx * 2;
            if (srcY + sHeight > canvas.height) {
                sHeight = canvas.height - srcY;
            }
            canvasChunk.height = sHeight;
            
            const ctx = canvasChunk.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvasChunk.width, canvasChunk.height);
                ctx.drawImage(canvas, 0, srcY, canvas.width, sHeight, 0, 0, canvas.width, sHeight);
            }
            
            const chunkImgData = canvasChunk.toDataURL('image/jpeg', 1.0);
            const currentPdfHeight = (sHeight / 2 * pdfWidth) / elWidth;
            
            if (!pdf) {
                pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: [pdfWidth, pdfA4Height]
                });
            } else {
                pdf.addPage([pdfWidth, currentPdfHeight < pdfA4Height ? pdfA4Height : currentPdfHeight], 'portrait');
            }
            
            pdf.addImage(chunkImgData, 'JPEG', 0, 0, pdfWidth, currentPdfHeight);
        }
    }
        
        if (pdf) {
            pdf.save(`${result.title.replace(/\s+/g, '_')}.pdf`);
        }
    } catch (error) {
        console.error("PDF Export Error:", error);
        alert("Có lỗi xảy ra khi lưu file PDF. Vui lòng thử lại.");
    } finally {
        setExporting(false);
    }
  };

  const handleReviewLegal = async () => {
    if (!result || !result.content) return;
    setIsReviewingLegal(true);
    try {
        const prompt = `Bạn là một chuyên gia pháp lý trong lĩnh vực xây dựng tại Việt Nam.
Hãy rà soát kỹ văn bản dưới đây. Nhiệm vụ của bạn là:
1. Kiểm tra tất cả các căn cứ pháp lý (Luật, Nghị định, Thông tư, Tiêu chuẩn, Quy chuẩn...) được nhắc đến trong văn bản.
2. Nếu có văn bản nào đã cũ, hết hiệu lực hoặc có văn bản mới thay thế, hãy CẬP NHẬT chúng thành văn bản pháp luật MỚI NHẤT hiện hành đang có hiệu lực.
3. Giữ nguyên hoàn toàn cấu trúc, văn phong và các nội dung khác của văn bản gốc.
4. CHỈ trả về nội dung văn bản sau khi đã cập nhật, không giải thích gì thêm.

VĂN BẢN GỐC:
${result.content}`;

        const response = await getAIClient().models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
        });
        
        const updatedContent = response.text;
        
        setResult(prev => ({
            ...prev,
            content: updatedContent
        }));
        
        alert("Đã rà soát và cập nhật các căn cứ pháp lý thành công!");
    } catch (error) {
        console.error("Lỗi khi rà soát pháp lý:", error);
        alert("Có lỗi xảy ra khi rà soát pháp lý. Vui lòng thử lại.");
    } finally {
        setIsReviewingLegal(false);
    }
  };

  const generateImage = async (promptText: string) => {
    try {
        const response = await getAIClient().models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
            parts: [{ text: promptText }]
          },
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
        }
        return null;
    } catch (e) {
        console.error("Image generation error:", e);
        return null;
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.csv') || file.name.endsWith('.json')) {
        const text = await file.text();
        try {
          const catResponse = await getAIClient().models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Phân loại tài liệu sau đây thuộc nhóm nào trong ngành xây dựng (ví dụ: Báo giá, Hợp đồng, Biện pháp thi công, Tiêu chuẩn, Bản vẽ, Khác...)? Chỉ trả về tên phân loại trong ngoặc vuông, ví dụ [PHÂN LOẠI: BÁO GIÁ].\n\nNội dung:\n${text.substring(0, 3000)}`
          });
          const category = catResponse.text.trim();
          setInternalData(prev => prev + (prev ? '\n\n' : '') + `--- Tài liệu: ${file.name} | ${category} ---\n` + text);
        } catch (err) {
          setInternalData(prev => prev + (prev ? '\n\n' : '') + `--- Tài liệu: ${file.name} | [PHÂN LOẠI: CHƯA XÁC ĐỊNH] ---\n` + text);
        }
        setUploading(false);
      } else {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1];
            const mimeType = file.type || 'application/pdf';

            const response = await getAIClient().models.generateContent({
              model: "gemini-3-flash-preview",
              contents: {
                parts: [
                  {
                    inlineData: {
                      data: base64Data,
                      mimeType: mimeType
                    }
                  },
                  {
                    text: "Trích xuất toàn bộ văn bản từ tài liệu này một cách chính xác nhất. Ở dòng đầu tiên của kết quả, BẮT BUỘC thêm một thẻ phân loại tài liệu dựa trên nội dung (ví dụ: [PHÂN LOẠI: BÁO GIÁ], [PHÂN LOẠI: HỢP ĐỒNG], [PHÂN LOẠI: QUY TRÌNH], v.v.). Sau đó xuống dòng và in ra toàn bộ nội dung văn bản. Không thêm bình luận nào khác."
                  }
                ]
              }
            });
            const extractedText = response.text;
            setInternalData(prev => prev + (prev ? '\n\n' : '') + `--- Tài liệu: ${file.name} ---\n` + extractedText);
          } catch (err) {
            console.error("Lỗi trích xuất văn bản:", err);
            alert("Có lỗi xảy ra khi trích xuất văn bản từ tài liệu.");
          } finally {
            setUploading(false);
          }
        };
        reader.onerror = () => {
          alert("Lỗi khi đọc file");
          setUploading(false);
        };
        return;
      }
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi tải tài liệu lên.");
      setUploading(false);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async (eOrDocName?: React.MouseEvent | string) => {
    const key = localStorage.getItem('phoxanh_api_key');
    if (!key) {
      alert("Hệ thống chưa thấy đăng nhập. Vui lòng đăng nhập bằng API Key.");
      return;
    }

    if (key === '090.6381-186') {
      alert("Tính năng tạo hồ sơ bằng AI yêu cầu phải có Google Gemini API Key. Đăng nhập hiện tại chỉ có quyền quản lý thư viện và dự án.");
      return;
    }

    const targetSubType = typeof eOrDocName === 'string' ? eOrDocName : formData.subType;
    if (!targetSubType) return;

    if (typeof eOrDocName === 'string') {
      setFormData(prev => ({ ...prev, subType: eOrDocName }));
    }

    setLoading(true);
    setView('processing');
    
    try {
        let prompt = "";
        
        const isRecord = targetSubType.toLowerCase().includes('biên bản') || targetSubType.toLowerCase().includes('nhật ký');
        const isDrawingList = targetSubType.toLowerCase().includes('bản vẽ thiết kế thi công');
        const isDailyLog = targetSubType.toLowerCase().includes('nhật ký công trình');
        const isArisingVolume = targetSubType.toLowerCase().includes('phát sinh') && targetSubType.toLowerCase().includes('khối lượng');
        
        let unitPrice = null;
        if (targetSubType.toLowerCase().includes("báo giá")) {
            if (formData.priceSource === 'manual' && formData.manualUnitPrice && parseInt(formData.manualUnitPrice) > 0) {
                unitPrice = parseInt(formData.manualUnitPrice);
            } else if (formData.priceSource === 'internal' && internalData) {
                try {
                    const priceResponse = await getAIClient().models.generateContent({
                        model: "gemini-3-flash-preview",
                        contents: `Dựa vào tài liệu nội bộ sau đây, hãy tìm và trích xuất ĐƠN GIÁ THI CÔNG CHUẨN (VNĐ/m2) áp dụng cho loại công trình "${formData.buildingType}" và gói "${targetSubType}". 
Yêu cầu:
- CHỈ trả về MỘT CON SỐ DUY NHẤT (ví dụ: 6500000). 
- KHÔNG giải thích thêm. 
- Nếu trong tài liệu không có đơn giá nào, hãy trả về số 0.

TÀI LIỆU NỘI BỘ:
${internalData.substring(0, 15000)}`
                    });
                    const priceStr = priceResponse.text.replace(/[^0-9]/g, '');
                    if (priceStr && parseInt(priceStr) > 100000) {
                        unitPrice = parseInt(priceStr);
                    }
                } catch (err) {
                    console.error("Lỗi trích xuất đơn giá nội bộ:", err);
                }
            } else if (formData.priceSource === 'market' || formData.priceSource === 'ai_estimate') {
                try {
                    const priceTarget = formData.priceSource === 'market' ? "hình thức Thi công Trọn gói (Chìa khóa trao tay)" : `gói "${targetSubType}"`;
                    const priceResponse = await getAIClient().models.generateContent({
                        model: "gemini-3-flash-preview",
                        contents: `Hãy ước tính ĐƠN GIÁ THI CÔNG CHUẨN (VNĐ/m2) trung bình trên thị trường hiện nay áp dụng cho loại công trình "${formData.buildingType}" tại "${formData.location}" và ${priceTarget}.
Yêu cầu:
- CHỈ trả về MỘT CON SỐ DUY NHẤT (ví dụ: 6500000). 
- KHÔNG giải thích thêm.`
                    });
                    const priceStr = priceResponse.text.replace(/[^0-9]/g, '');
                    if (priceStr && parseInt(priceStr) > 100000) {
                        unitPrice = parseInt(priceStr);
                    }
                } catch (err) {
                    console.error("Lỗi ước tính đơn giá thị trường:", err);
                }
            }
        }

        const basicArea = Number(formData.area) || 0;
        const floors = Number(formData.floors) || 1;
        const mongArea = basicArea * 0.5; 
        const floorArea = basicArea * floors;
        const maiArea = basicArea * 0.5;
        const totalConvertedArea = mongArea + floorArea + maiArea;
        const finalUnitPrice = unitPrice || (targetSubType.includes("Thô") ? 3850000 : 7000000);
        const totalCost = totalConvertedArea * finalUnitPrice;

        let projectInfo = `- Thông tin dự án: Loại công trình ${formData.buildingType}, địa điểm ${formData.location}, quy mô ${formData.area}m2, ${formData.floors} tầng.`;
        if (targetSubType.toLowerCase().includes("báo giá") || targetSubType.toLowerCase().includes("hợp đồng")) {
            projectInfo += `
- HƯỚNG DẪN BẮT BUỘC VỀ GIÁ TRỊ TỔNG CỘNG:
  + TỔNG DIỆN TÍCH SÀN QUY ĐỔI THI CÔNG: ${totalConvertedArea.toFixed(1)} m2. (KHÔNG ĐƯỢC TÍNH THEO DIỆN TÍCH ĐÁY/CƠ BẢN DO ĐÃ CÓ HỆ SỐ MÓNG MÁI)
  + ĐƠN GIÁ: ${finalUnitPrice.toLocaleString('vi-VN')} VNĐ/m2.
  + TỔNG GIÁ TRỊ LUÔN LÀ: ${totalCost.toLocaleString('vi-VN')} VNĐ.
  => TRONG PHẦN BÁO GIÁ HAY HỢP ĐỒNG (VÍ DỤ ĐIỀU VỀ GIÁ TRỊ), BẮT BUỘC DÙNG DỮ LIỆU NÀY LÀM TỔNG GIÁ TRỊ.`;
        }

        if (isRecord) {
            projectInfo = `- Thông tin dự án: Loại công trình ${formData.buildingType}, địa điểm ${formData.location}.
- Đối tượng nghiệm thu/công việc: ${formData.acceptanceObject || 'Theo thực tế thi công'}
- Thời gian: ${formData.acceptanceTime || 'Theo thực tế'}
- Thành phần tham gia: ${formData.participants || 'Các bên liên quan'}`;
        }

        const baseD1D2D3 = `[D1 - ĐỊNH DANH]: Bạn là Kỹ sư, Chuyên gia với hơn 15 năm kinh nghiệm thực chiến, am hiểu sâu sắc các Quy chuẩn kỹ thuật quốc gia (QCVN), Tiêu chuẩn Việt Nam (TCVN) và các Nghị định pháp luật trong lĩnh vực xây dựng.
[D2 - ĐÍCH ĐẾN]: Thực hiện nhiệm vụ soạn thảo văn bản chuyên nghiệp: "${targetSubType}".
[D3 - DỮ LIỆU]:
${projectInfo}
- Ghi chú cụ thể của khách hàng: ${formData.situation}.`;

        let formatInstructions = `[D5 - ĐỊNH DẠNG]:
- BẮT BUỘC trình bày theo CHUẨN VĂN BẢN HÀNH CHÍNH CHUYÊN NGHIỆP, BỐ CỤC TRANG A4 THEO NGHỊ ĐỊNH 30/2020/NĐ-CP.
- ĐỐI VỚI HỢP ĐỒNG XÂY DỰNG: BẮT BUỘC tuân thủ theo mẫu và quy định của NGHỊ ĐỊNH 37/2015/NĐ-CP (hoặc các nghị định sửa đổi, bổ sung liên quan về hợp đồng xây dựng).
- ĐỐI VỚI HỒ SƠ QUẢN LÝ CHẤT LƯỢNG (Biên bản nghiệm thu, nhật ký...): BẮT BUỘC tuân thủ theo mẫu và quy định của NGHỊ ĐỊNH 06/2021/NĐ-CP về quản lý chất lượng, thi công xây dựng và bảo trì công trình xây dựng.
- Phân chia rõ ràng thành các Phần, Điều, Khoản (ví dụ: ĐIỀU 1:..., 1.1..., 1.2...). TUYỆT ĐỐI KHÔNG SOẠN "ĐIỀU 6" HOẶC PHẦN "ĐIỀU 6" (NẾU CÓ HÃY ĐỔI TÊN HOẶC GỘP VÀO ĐIỀU KHÁC).
- Trình bày bố cục outline (chỉ mục số, chữ) rõ ràng với các cấp độ tuyến tính (1., 1.1., a., b.).
- Trình bày các đầu mục (1.1, 1.2...) in đậm. MỖI ĐẦU MỤC PHẢI BẮT ĐẦU Ở MỘT DÒNG MỚI. Nội dung chi tiết của đầu mục đó có thể viết liền sau tiêu đề trên cùng một dòng.
- Sử dụng Markdown để in đậm các tiêu đề Điều, Khoản.
- LOẠI BỎ HOÀN TOÀN các ký tự đặc biệt thừa thãi (như *, #, -, _ không cần thiết), giữ văn bản sạch sẽ, trang trọng.
- BẮT BUỘC phải có MỤC LỤC (Table of Contents) ở đầu văn bản, liệt kê tất cả các phần chính.`;

        if (isDrawingList) {
            formatInstructions = `[D5 - ĐỊNH DẠNG VÀ NỘI DUNG CHUẨN]:
- BẮT BUỘC trình bày theo CHUẨN VĂN BẢN HÀNH CHÍNH CHUYÊN NGHIỆP, BỐ CỤC TRANG A4 THEO NGHỊ ĐỊNH 30/2020/NĐ-CP.
- NỘI DUNG CHÍNH: Liệt kê chi tiết DANH MỤC CÁC BẢN VẼ trong hồ sơ thiết kế thi công (Bao gồm: Kiến trúc, Kết cấu, Điện nước MEP, Nội thất...).
- Trình bày dưới dạng bảng (sử dụng Markdown table) hoặc danh sách rõ ràng gồm: Số thứ tự, Ký hiệu bản vẽ, Tên bản vẽ, Tỷ lệ.
- LOẠI BỎ HOÀN TOÀN các ký tự đặc biệt thừa thãi.
- KHÔNG CẦN MỤC LỤC.`;
        } else if (isArisingVolume) {
            formatInstructions = `[D5 - ĐỊNH DẠNG VÀ NỘI DUNG CHUẨN]:
- BẮT BUỘC trình bày theo CHUẨN VĂN BẢN HÀNH CHÍNH CHUYÊN NGHIỆP, BỐ CỤC TRANG A4 THEO NGHỊ ĐỊNH 30/2020/NĐ-CP.
- NỘI DUNG CHÍNH: Biên bản xác nhận khối lượng phát sinh.
- BẮT BUỘC trình bày chi tiết khối lượng phát sinh dưới dạng BẢNG TÍNH DỰ TOÁN (sử dụng Markdown table). Bảng phải có các cột: STT, Nội dung công việc phát sinh, Đơn vị tính, Khối lượng, Đơn giá, Thành tiền, Ghi chú.
- Phía trên bảng cần có đầy đủ thông tin: Tên công trình, Hạng mục, Địa điểm, Thành phần tham gia xác nhận (Chủ đầu tư, Tư vấn giám sát, Nhà thầu thi công).
- Phía dưới bảng cần có phần chốt tổng giá trị phát sinh (bằng số và bằng chữ) và chữ ký xác nhận của các bên.
- LOẠI BỎ HOÀN TOÀN các ký tự đặc biệt thừa thãi.
- KHÔNG CẦN MỤC LỤC.`;
        } else if (isDailyLog) {
            formatInstructions = `[D5 - ĐỊNH DẠNG VÀ NỘI DUNG CHUẨN]:
- BẮT BUỘC trình bày theo CHUẨN VĂN BẢN HÀNH CHÍNH CHUYÊN NGHIỆP, BỐ CỤC TRANG A4 THEO NGHỊ ĐỊNH 30/2020/NĐ-CP.
- NỘI DUNG CHÍNH: Đây là BIỂU MẪU VIẾT NHẬT KÝ THI CÔNG CÔNG TRÌNH tuân thủ tuyệt đối theo NGHỊ ĐỊNH 06/2021/NĐ-CP.
- Bao gồm các thông tin bắt buộc: Ngày tháng năm, Tình hình thời tiết, Số lượng nhân công/thiết bị, Các công việc thi công trong ngày, Nghiệm thu công việc (nếu có), Sự cố phát sinh (nếu có), Chữ ký của Giám sát và Chỉ huy trưởng.
- Trình bày rõ ràng, súc tích, chừa khoảng trống (bằng các dòng kẻ chấm hoặc gạch dưới) để ghi chép thực tế.
- LOẠI BỎ HOÀN TOÀN các ký tự đặc biệt thừa thãi.
- KHÔNG CẦN MỤC LỤC.`;
        } else if (isRecord) {
            formatInstructions = `[D5 - ĐỊNH DẠNG VÀ NỘI DUNG CHUẨN]:
- BẮT BUỘC trình bày theo CHUẨN VĂN BẢN HÀNH CHÍNH CHUYÊN NGHIỆP, BỐ CỤC TRANG A4 THEO NGHỊ ĐỊNH 30/2020/NĐ-CP.
- BẮT BUỘC tuân thủ theo mẫu và quy định của NGHỊ ĐỊNH 06/2021/NĐ-CP về quản lý chất lượng, thi công xây dựng và bảo trì công trình xây dựng.
- Thành phần tham gia ký kết thường tinh gọn: Chủ đầu tư (Chủ nhà), Đại diện Đơn vị thi công (Chỉ huy trưởng/Kỹ thuật), và Tư vấn giám sát (nếu có).
- Nội dung đánh giá cần thực tế, ngắn gọn, đi thẳng vào các tiêu chí kỹ thuật cốt lõi (ví dụ: kích thước hình học, độ thẳng đứng, mác bê tông, chủng loại vật tư...).
- Bao gồm đầy đủ các mục: 
  1. Tên công trình & Vị trí.
  2. Đối tượng/Hạng mục nghiệm thu.
  3. Thành phần trực tiếp nghiệm thu.
  4. Thời gian và địa điểm nghiệm thu.
  5. Đánh giá công việc xây dựng (Tài liệu làm căn cứ, Tiêu chuẩn áp dụng, Đánh giá chất lượng thực tế).
  6. Kết luận (Đồng ý nghiệm thu chuyển bước thi công hay yêu cầu sửa chữa).
  7. Chữ ký các bên (Chủ đầu tư, Giám sát, Thi công).
- KHÔNG CẦN MỤC LỤC.
- Trình bày các đầu mục in đậm. MỖI ĐẦU MỤC PHẢI BẮT ĐẦU Ở MỘT DÒNG MỚI. Nội dung chi tiết của đầu mục đó có thể viết liền sau tiêu đề trên cùng một dòng.
- Sử dụng Markdown để in đậm các tiêu đề.
- TUYỆT ĐỐI KHÔNG SỬ DỤNG ĐIỀU 6 trong bất kỳ nội dung nào.
- LOẠI BỎ HOÀN TOÀN các ký tự đặc biệt thừa thãi, giữ văn bản sạch sẽ.
- Tạo sẵn các dòng gạch dưới (_____) để các bên ký và ghi rõ họ tên ở cuối biên bản.`;
        }

        if (useInternalData && internalData) {
            prompt = `${baseD1D2D3}
- KHO TÀI LIỆU NỘI BỘ CỦA CÔNG TY (Đã được phân loại):
${internalData}

[D4 - ĐIỀU KIỆN]:
1. Tuân thủ tuyệt đối các Quy chuẩn xây dựng và TCVN hiện hành.
2. LỌC TÀI LIỆU: Kho tài liệu nội bộ bên trên chứa nhiều tệp với các [PHÂN LOẠI] khác nhau. Bạn PHẢI tự động đọc, đối chiếu với chủ đề yêu cầu ("${targetSubType}") và CHỈ SỬ DỤNG các tài liệu có phân loại/nội dung liên quan trực tiếp. Bỏ qua hoàn toàn các tài liệu không liên quan.
3. TRUY XUẤT VÀ SỬ DỤNG CHÍNH XÁC dữ liệu từ các tài liệu nội bộ ĐÃ ĐƯỢC CHỌN LỌC.
4. TUYỆT ĐỐI tuân thủ các đơn giá, quy trình, vật tư, và các điều khoản hợp đồng có trong tài liệu nội bộ phù hợp. KHÔNG ĐƯỢC tự ý sáng tạo, bịa đặt nếu trong tài liệu nội bộ đã quy định rõ.
5. Tuyệt đối không bao gồm Tiêu ngữ Quốc hiệu.
6. Văn phong hành chính, kỹ thuật chuẩn xác, chuyên nghiệp.

${formatInstructions}`;
        } else {
            prompt = `${baseD1D2D3}

[D4 - ĐIỀU KIỆN]:
1. Tuân thủ tuyệt đối các Quy chuẩn xây dựng và TCVN hiện hành.
2. Tuyệt đối không bao gồm Tiêu ngữ Quốc hiệu.
3. Văn phong hành chính, kỹ thuật chuẩn xác, chuyên nghiệp.

${formatInstructions}`;
        }
        
        const response = await getAIClient().models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
        });
        const content = response.text;

        let timelineData = null;
        if (!isRecord) {
            try {
                const timelineResponse = await getAIClient().models.generateContent({
                    model: "gemini-3-flash-preview",
                    contents: `Dựa vào thông tin công trình: ${formData.buildingType}, ${formData.floors} tầng, diện tích ${formData.area}m2. Hãy lập tiến độ thi công dự kiến.
Trả về định dạng JSON là một mảng các object, mỗi object có các trường:
- "task": Tên hạng mục (ví dụ: "Chuẩn bị mặt bằng", "Thi công móng", "Thi công phần thân", "Hoàn thiện", "Bàn giao")
- "start": Tháng bắt đầu (số nguyên hoặc thập phân, từ 0)
- "duration": Thời gian thi công (số tháng)
Chỉ trả về JSON, không giải thích thêm.`,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    task: { type: Type.STRING },
                                    start: { type: Type.NUMBER },
                                    duration: { type: Type.NUMBER }
                                },
                                required: ["task", "start", "duration"]
                            }
                        }
                    }
                });
                timelineData = JSON.parse(timelineResponse.text);
            } catch (err) {
                console.error("Lỗi trích xuất tiến độ:", err);
                // Default timeline
                timelineData = [
                    { task: "Chuẩn bị mặt bằng", start: 0, duration: 0.5 },
                    { task: "Thi công móng", start: 0.5, duration: 1 },
                    { task: "Thi công phần thân", start: 1.5, duration: 2 },
                    { task: "Hoàn thiện", start: 3.5, duration: 1.5 },
                    { task: "Bàn giao", start: 5, duration: 0.5 }
                ];
            }
        }
        
        const resObjForDisplay = { 
            title: targetSubType, 
            content: content || "", 
            location: formData.location,
            area: formData.area,
            floors: formData.floors,
            buildingType: formData.buildingType,
            unitPrice: unitPrice,
            timeline: timelineData,
            acceptanceObject: formData.acceptanceObject,
            acceptanceTime: formData.acceptanceTime,
            participants: formData.participants,
            mode: targetSubType.toLowerCase().includes('báo giá') ? 'pricing' : 'document',
            timestamp: new Date().toISOString() 
        };

        const resObjForFirestore = { 
            ...resObjForDisplay
        };
        
        /* Firebase is disabled in this mockup
        if (user) {
            const db = getFirestore();
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'phoxanh-v5-pro';
            try {
                await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'history'), resObjForFirestore);
            } catch (firestoreError) {
                console.warn("Firestore save error (possibly image size), displaying anyway...", firestoreError);
            }
        }
        */

        setResult(resObjForDisplay);
        setView('result');
    } catch (e) {
        console.error("Initialization error:", e);
        setView('generator');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-sky-200">
      <Header currentUser={user} onLogout={() => {
          localStorage.removeItem('phoxanh_api_key');
          setIsAuthenticated(false);
          setIsGuest(false);
      }} onLogin={(key: string) => {
          localStorage.setItem('phoxanh_api_key', key);
          setIsAuthenticated(true);
          setIsGuest(false);
      }} onGuestLogin={() => {
          localStorage.removeItem('phoxanh_api_key');
          setIsAuthenticated(false);
          setIsGuest(true);
      }} isAuthenticated={isAuthenticated} isGuest={isGuest} />
      
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-[68px] z-40 no-print shadow-sm">
        <div className="container mx-auto flex overflow-x-auto scrollbar-hide">
          <button onClick={() => { setView('home'); setResult(null); }} className={`px-4 py-3 md:px-8 md:py-5 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${view === 'home' ? 'border-sky-500 text-sky-600 bg-sky-50/30' : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}>
            <HomeIcon size={16}/> Dự án của tôi
          </button>
          <button onClick={() => { setView('generator'); setResult(null); }} className={`px-4 py-3 md:px-8 md:py-5 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${view === 'generator' ? 'border-sky-500 text-sky-600 bg-sky-50/30' : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}>
            <PenTool size={16}/> Tạo hồ sơ mới
          </button>
          <button onClick={() => { setView('workflow'); setResult(null); }} className={`px-4 py-3 md:px-8 md:py-5 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${view === 'workflow' ? 'border-sky-500 text-sky-600 bg-sky-50/30' : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}>
            <ClipboardList size={16}/> Quy trình thi công
          </button>
          <button onClick={() => { setView('internal'); setResult(null); }} className={`px-4 py-3 md:px-8 md:py-5 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${view === 'internal' ? 'border-sky-500 text-sky-600 bg-sky-50/30' : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}>
            <FileText size={16}/> Tài liệu nội bộ
          </button>
          <button onClick={() => { setView('market'); setResult(null); }} className={`px-4 py-3 md:px-8 md:py-5 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${view === 'market' ? 'border-sky-500 text-sky-600 bg-sky-50/30' : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}>
            <TrendingUp size={16}/> Đơn giá thị trường
          </button>
          <button onClick={() => { setView('projects'); setResult(null); }} className={`px-4 py-3 md:px-8 md:py-5 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${view === 'projects' ? 'border-sky-500 text-sky-600 bg-sky-50/30' : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}>
            <Briefcase size={16}/> Dự án đã thực hiện
          </button>
          <button onClick={() => { setView('library'); setResult(null); }} className={`px-4 py-3 md:px-8 md:py-5 text-[11px] font-bold uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${view === 'library' ? 'border-sky-500 text-sky-600 bg-sky-50/30' : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'}`}>
            <ImageIcon size={16}/> Thư viện kiến trúc
          </button>
        </div>
      </div>

      <main className="container mx-auto py-6 md:py-10 px-4 md:px-6">
        <AnimatePresence mode="wait">
        {view === 'home' && (
            <motion.div 
                key="home"
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="max-w-6xl mx-auto space-y-12 pb-12"
            >
                {/* Hero Section */}
                <div className="relative bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent z-10"></div>
                    <div className="absolute inset-0 opacity-30 bg-[url('https://images.unsplash.com/photo-1541888086425-d81bb19240f5?auto=format&fit=crop&q=80')] bg-cover bg-center"></div>
                    
                    <div className="relative z-20 p-8 md:p-16 w-full md:w-2/3">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/20 border border-sky-500/30 text-sky-400 text-xs font-bold uppercase tracking-widest mb-6">
                            <Star size={14} className="fill-sky-400" /> Hệ thống nhà thầu số
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase font-display leading-[1.1] mb-6">
                            Kiến tạo không gian <br /> <span className="text-sky-400">Nâng tầm giá trị</span>
                        </h2>
                        <div className="h-1.5 w-20 bg-sky-500 rounded-full mb-6"></div>
                        <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl mb-8">
                            Phố Xanh AI tự hào là đơn vị tiên phong trong việc ứng dụng công nghệ trực tuyến vào quản trị nhà thầu và thi công xây dựng. Chúng tôi cam kết mang đến chất lượng vượt trội, minh bạch và hiệu quả định mức cao nhất cho mọi dự án lớn nhỏ toàn quốc.
                        </p>
                        <button onClick={() => setView('generator')} className="bg-sky-500 text-white px-8 py-4 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center gap-3 hover:bg-sky-400 transition-all shadow-lg hover:shadow-sky-500/30 group">
                            Bắt đầu dự án mới <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {[
                        { num: "15+", label: "Năm kinh nghiệm", icon: Briefcase },
                        { num: "+100", label: "Căn", icon: Building2 },
                        { num: "100%", label: "Đúng tiến độ duyệt", icon: CheckCircle2 },
                        { num: "24/7", label: "Hỗ trợ khách hàng", icon: Users }
                    ].map((stat, i) => {
                        const Icon = stat.icon;
                        return (
                            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-all group">
                                <div className="p-3 bg-sky-50 text-sky-600 rounded-xl mb-4 group-hover:scale-110 group-hover:bg-sky-500 group-hover:text-white transition-all">
                                    <Icon size={24} />
                                </div>
                                <h3 className="text-3xl font-black text-slate-900 font-display mb-1">{stat.num}</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                            </div>
                        )
                    })}
                </div>

                {/* Core Capabilities */}
                <div>
                    <div className="text-center mb-10">
                        <h3 className="text-2xl font-black text-slate-900 uppercase font-display tracking-tight mb-3">Năng lực cốt lõi</h3>
                        <p className="text-sm text-slate-500 max-w-2xl mx-auto">Hệ thống giải pháp toàn diện từ thiết kế, thi công đến quản lý vận hành số hóa, đáp ứng mọi tiêu chuẩn khắt khe nhất.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                title: "Thiết kế Kiến trúc & Nội thất",
                                desc: "Sáng tạo không gian sống và làm việc tối ưu hóa công năng, thẩm mỹ cao với hệ thống quy chuẩn bóc tách khắt khe.",
                                icon: Ruler
                            },
                            {
                                title: "Thi công Xây dựng trọn gói",
                                desc: "Đội ngũ kỹ sư tay nghề cao, quy trình kiểm soát chất lượng nghiêm ngặt đảm bảo kết cấu vững chắc, an toàn tuyệt đối.",
                                icon: Construction
                            },
                            {
                                title: "Quản trị Dự án AI 5.0",
                                desc: "Ứng dụng trí tuệ nhân tạo (AI) thông minh vào lập dự toán, quản lý tiến độ và kiểm soát chất lượng theo thời gian thực.",
                                icon: ShieldCheck
                            }
                        ].map((cap, i) => {
                            const Icon = cap.icon;
                            return (
                                <div key={i} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:border-sky-300 hover:shadow-xl transition-all relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-500 opacity-50"></div>
                                    <div className="relative z-10">
                                        <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-6 shadow-md group-hover:bg-sky-500 group-hover:rotate-6 transition-all">
                                            <Icon size={28} />
                                        </div>
                                        <h4 className="text-lg font-bold text-slate-900 mb-3">{cap.title}</h4>
                                        <p className="text-sm text-slate-600 leading-relaxed">{cap.desc}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Banner Call to Action */}
                <div className="bg-slate-900 rounded-[2rem] p-10 md:p-14 text-center shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-sky-900/20 blur-3xl rounded-full"></div>
                    <h3 className="relative z-10 text-2xl md:text-3xl font-black text-white font-display uppercase tracking-tight mb-4">Sẵn sàng hiện thực hóa dự án?</h3>
                    <p className="relative z-10 text-slate-300 text-sm md:text-base max-w-2xl mx-auto mb-8 leading-relaxed">Hãy để công nghệ Trợ lý ảo của chúng tôi hỗ trợ bạn lập dự toán tài chính, hợp đồng và hồ sơ khép kín chỉ trong vài phút thay vì vài tuần làm việc.</p>
                    <button onClick={() => setView('generator')} className="relative z-10 inline-flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-sky-50 hover:scale-105 transition-all shadow-lg hover:shadow-xl">
                        <PenTool size={18} className="text-sky-600" /> Tạo Hồ Sơ Ngay
                    </button>
                </div>
            </motion.div>
        )}

        {view === 'workflow' && (
            <motion.div key="workflow" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
                <WorkflowView onDocumentClick={(docName) => handleGenerate(docName)} />
            </motion.div>
        )}

        {view === 'market' && (
            <motion.div key="market" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
                <MarketPrices />
            </motion.div>
        )}

        {view === 'projects' && (
            <motion.div key="projects" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
                <ProjectsView isAuthenticated={localStorage.getItem('phoxanh_api_key') === '090.6381-186'} />
            </motion.div>
        )}

        {view === 'library' && (
            <motion.div key="library" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}>
                <ArchitectureLibrary isAuthenticated={localStorage.getItem('phoxanh_api_key') === '090.6381-186'} />
            </motion.div>
        )}

        {view === 'generator' && (
          <motion.div key="generator" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 space-y-4">
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="text-sm font-black text-slate-800 uppercase mb-6 flex items-center gap-2">
                        <ClipboardList size={18} className="text-sky-600"/> Danh mục văn bản
                    </h3>
                    <div className="space-y-3">
                        {CATEGORIES.map(cat => (
                            <div key={cat.id} className={`rounded-2xl border transition-all overflow-hidden ${expandedCat === cat.id ? 'border-sky-500 shadow-md shadow-sky-50' : 'border-slate-100'}`}>
                                <button onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)} className={`w-full p-4 flex justify-between items-center font-bold text-sm ${expandedCat === cat.id ? 'bg-sky-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                                    <div className="flex items-center gap-3"><cat.icon size={18}/>{cat.label}</div>
                                    {expandedCat === cat.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                </button>
                                {expandedCat === cat.id && (
                                    <div className="p-2 bg-white space-y-1">
                                        {cat.types.map(type => (
                                            <button key={type} onClick={() => setFormData({...formData, subType: type})} className={`w-full text-left p-3 rounded-xl text-xs font-bold transition-all flex justify-between items-center ${formData.subType === type ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                                                {type}
                                                {formData.subType === type && <CheckSquare size={14} className="text-sky-600"/>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-7 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
                <div className="p-6 md:p-8 bg-[#0c4a6e] text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-bold uppercase tracking-tight">Chi tiết hồ sơ</h3>
                        <p className="text-sky-200 text-[10px] mt-1 tracking-widest uppercase">Tự động tối ưu hóa theo quy chuẩn TCVN</p>
                    </div>
                    <div className="p-3 bg-white/10 rounded-2xl"><Camera size={24}/></div>
                </div>
                
                <div className="p-10 space-y-6">
                    <div className="bg-sky-50 p-4 rounded-2xl border border-sky-100 flex items-start gap-4">
                        <Info size={20} className="text-sky-600 mt-1 flex-shrink-0"/>
                        <div>
                            <p className="text-xs font-bold text-sky-900 uppercase">Hồ sơ đang chọn:</p>
                            <p className="text-sm font-black text-sky-700 mt-1">{formData.subType || "Vui lòng chọn từ danh mục bên trái"}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter ml-1">Loại công trình</label>
                            <select className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-bold focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all shadow-inner" value={formData.buildingType} onChange={e => setFormData({...formData, buildingType: e.target.value})}>
                                {BUILDING_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter ml-1">Địa điểm thi công</label>
                            <select className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-bold focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all shadow-inner" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>
                                {VIETNAM_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    {!(formData.subType.toLowerCase().includes('biên bản') || formData.subType.toLowerCase().includes('nhật ký')) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter ml-1">Diện tích (m²)</label>
                                <input type="number" value={formData.area} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-bold focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all shadow-inner" onChange={e => setFormData({...formData, area: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter ml-1">Số tầng</label>
                                <input type="number" value={formData.floors} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-bold focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all shadow-inner" onChange={e => setFormData({...formData, floors: e.target.value})} />
                            </div>
                        </div>
                    )}

                    {(formData.subType.toLowerCase().includes('biên bản') || formData.subType.toLowerCase().includes('nhật ký')) && (
                        <>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter ml-1">Đối tượng nghiệm thu / Nội dung công việc</label>
                                <input type="text" placeholder="VD: Nghiệm thu cốt thép móng, Nghiệm thu xây tường tầng 1..." value={formData.acceptanceObject} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-bold focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all shadow-inner" onChange={e => setFormData({...formData, acceptanceObject: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter ml-1">Thời gian thực hiện</label>
                                    <input type="text" placeholder="VD: 08:00 ngày 15/10/2023" value={formData.acceptanceTime} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-bold focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all shadow-inner" onChange={e => setFormData({...formData, acceptanceTime: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter ml-1">Thành phần tham gia</label>
                                    <input type="text" placeholder="VD: Chủ nhà, Đại diện thi công, Giám sát" value={formData.participants} className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm font-bold focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all shadow-inner" onChange={e => setFormData({...formData, participants: e.target.value})} />
                                </div>
                            </div>
                        </>
                    )}

                    {formData.subType.toLowerCase().includes('báo giá') && (
                        <div className="space-y-3 mt-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter ml-1">Nguồn đơn giá thi công</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-50/50 p-2 rounded-2xl border border-slate-100 shadow-inner">
                                <button 
                                    onClick={() => setFormData({...formData, priceSource: 'market'})}
                                    className={`py-3 px-2 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all ${formData.priceSource === 'market' ? 'bg-white border text-sky-600 shadow-sm border-slate-100 ring-1 ring-slate-900/5' : 'text-slate-500 hover:bg-slate-200/50'}`}
                                >
                                    Thị trường
                                </button>
                                <button 
                                    onClick={() => setFormData({...formData, priceSource: 'internal'})}
                                    className={`py-3 px-2 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all ${formData.priceSource === 'internal' ? 'bg-white border text-sky-600 shadow-sm border-slate-100 ring-1 ring-slate-900/5' : 'text-slate-500 hover:bg-slate-200/50'}`}
                                >
                                    Nội bộ
                                </button>
                                <button 
                                    onClick={() => setFormData({...formData, priceSource: 'manual'})}
                                    className={`py-3 px-2 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all ${formData.priceSource === 'manual' ? 'bg-white border text-sky-600 shadow-sm border-slate-100 ring-1 ring-slate-900/5' : 'text-slate-500 hover:bg-slate-200/50'}`}
                                >
                                    Nhập tay
                                </button>
                                <button 
                                    onClick={() => setFormData({...formData, priceSource: 'ai_estimate'})}
                                    className={`py-3 px-2 rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all flex items-center justify-center gap-1 ${formData.priceSource === 'ai_estimate' ? 'bg-white border text-sky-600 shadow-sm border-slate-100 ring-1 ring-slate-900/5' : 'text-slate-500 hover:bg-slate-200/50'}`}
                                >
                                    AI Ước tính
                                </button>
                            </div>
                            
                            {formData.priceSource === 'manual' && (
                                <input 
                                    type="number" 
                                    placeholder="Nhập đơn giá (VNĐ/m²)" 
                                    value={formData.manualUnitPrice} 
                                    className="w-full p-4 mt-2 rounded-xl border border-slate-200 bg-white text-sm font-bold focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all shadow-sm" 
                                    onChange={e => setFormData({...formData, manualUnitPrice: e.target.value})} 
                                />
                            )}
                            {formData.priceSource === 'internal' && !internalData && (
                                <p className="text-[10px] text-red-500 italic mt-2 flex items-center gap-1"><AlertCircle size={12}/> Vui lòng tải lên tài liệu nội bộ ở tab "Tài liệu nội bộ" trước khi sử dụng.</p>
                            )}
                            {(formData.priceSource === 'market') && (
                                <p className="text-[10px] text-slate-500 italic mt-2 ml-1">AI sẽ tự động ước tính đơn giá thị trường (trọn gói chìa khóa trao tay) dựa trên loại công trình và khu vực.</p>
                            )}
                            {(formData.priceSource === 'ai_estimate') && (
                                <p className="text-[10px] text-slate-500 italic mt-2 ml-1">AI sẽ tự động ước tính đơn giá thị trường dựa trên loại công trình, khu vực và gói thầu.</p>
                            )}
                        </div>
                    )}

                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-tighter ml-1">Ghi chú yêu cầu kỹ thuật</label>
                        <textarea placeholder="Nhập các lưu ý về vật liệu, phong cách hoặc yêu cầu pháp lý..." className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm h-32 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 outline-none transition-all shadow-inner resize-none" onChange={e => setFormData({...formData, situation: e.target.value})} />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 mt-4 border-t border-slate-100">
                        <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/80 w-full sm:w-auto shadow-sm">
                            <input type="checkbox" id="useInternal" checked={useInternalData} onChange={e => setUseInternalData(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                            <label htmlFor="useInternal" className="text-[11px] font-bold uppercase tracking-wider text-slate-700 cursor-pointer">Sử dụng Tài liệu nội bộ</label>
                        </div>

                        <button onClick={handleGenerate} disabled={loading || !formData.subType || !isAuthenticated} className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white font-bold uppercase tracking-widest rounded-xl hover:bg-sky-600 hover:shadow-lg hover:shadow-sky-500/20 disabled:opacity-50 disabled:bg-slate-300 transition-all flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18}/>}
                            {loading ? "Đang xử lý phân tích..." : (!isAuthenticated ? "Vui lòng đăng nhập để tạo hồ sơ" : "Tạo Hồ Sơ Mới")}
                        </button>
                    </div>
                </div>
            </div>
          </motion.div>
        )}

        {view === 'internal' && (
            <motion.div key="internal" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="max-w-4xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight uppercase">Tài liệu nội bộ</h2>
                    <div className="flex flex-wrap gap-3">
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.csv,.md,.json,.pdf,image/*" />
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-white border border-slate-200 text-slate-700 px-6 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-2 hover:bg-slate-50 transition-all disabled:opacity-50">
                            {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14}/>}
                            {uploading ? 'Đang đọc...' : 'Tải tài liệu lên'}
                        </button>
                        <button onClick={() => {
                            localStorage.setItem('phoxanh_internal_data', internalData);
                            alert('Đã lưu tài liệu nội bộ!');
                        }} className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-2 hover:bg-emerald-700 transition-all">
                            <ShieldCheck size={14}/> Lưu tài liệu
                        </button>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <p className="text-sm text-slate-500 mb-4">Nhập các quy chuẩn, đơn giá, điều khoản hợp đồng hoặc mẫu văn bản nội bộ của công ty bạn tại đây. Bạn cũng có thể tải lên file (PDF, hình ảnh, TXT) để AI tự động trích xuất nội dung.</p>
                    <textarea 
                        value={internalData}
                        onChange={e => setInternalData(e.target.value)}
                        placeholder="Ví dụ: Đơn giá xây thô năm 2024 là 3.800.000 VNĐ/m2. Quy trình nghiệm thu gồm 5 bước..." 
                        className="w-full p-6 rounded-2xl border border-slate-200 bg-slate-50 text-sm h-[500px] focus:ring-2 focus:ring-sky-500 outline-none transition-all leading-relaxed" 
                    />
                </div>
            </motion.div>
        )}

        {view === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }} className="flex flex-col items-center justify-center py-32 space-y-6">
                <div className="relative">
                    <div className="w-24 h-24 border-4 border-sky-100 border-t-sky-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center"><HardHat size={28} className="text-sky-600"/></div>
                </div>
                <div className="text-center">
                    <p className="font-bold text-slate-800 text-xl uppercase tracking-tight">Hệ thống đang làm việc...</p>
                    <div className="flex flex-col gap-1 mt-2">
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse">1. Soạn thảo văn bản kỹ thuật</p>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse delay-75">2. Tạo phối cảnh dự án 3D</p>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse delay-150">3. Tối ưu hóa layout in ấn A4</p>
                    </div>
                </div>
            </motion.div>
        )}

        {view === 'result' && result && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }} className="max-w-5xl mx-auto pb-32">
                <div className="flex flex-wrap justify-between items-center mb-8 no-print gap-4">
                    <button onClick={() => setView('home')} className="px-6 py-3 bg-white text-slate-500 font-bold text-xs uppercase flex items-center gap-2 hover:text-sky-600 rounded-xl border border-slate-200 transition-all shadow-sm">
                        <ArrowLeft size={16}/> Quay lại
                    </button>
                    <div className="flex flex-wrap gap-3">
                        <button onClick={handleReviewLegal} disabled={isReviewingLegal} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg disabled:bg-slate-400">
                            {isReviewingLegal ? <Loader2 size={18} className="animate-spin"/> : <Scale size={18}/>}
                            {isReviewingLegal ? "Đang rà soát..." : "Rà soát Pháp lý"}
                        </button>
                        <button onClick={handleExportPDF} disabled={exporting} className="px-6 py-3 bg-[#0c4a6e] text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-3 shadow-xl hover:bg-black transition-all disabled:bg-slate-400">
                            {exporting ? <Loader2 size={18} className="animate-spin"/> : <Printer size={18}/>}
                            {exporting ? "Đang tạo PDF..." : "Lưu File PDF A4"}
                        </button>
                    </div>
                </div>
                
                <div className="no-print mx-auto" id="document-content-wrapper">
                    {result.mode === 'pricing' || result.title?.includes('Báo giá') ? 
                        <PriceQuoteTemplate data={result} ref={contentRef} /> : 
                        <DocumentTemplate data={result} ref={contentRef} />
                    }
                </div>

                <div className="hidden print:block">
                    {result.mode === 'pricing' || result.title?.includes('Báo giá') ? 
                        <PriceQuoteTemplate data={result} ref={null} /> : 
                        <DocumentTemplate data={result} ref={null} />
                    }
                </div>
            </motion.div>
        )}
        </AnimatePresence>
      </main>

      <footer className="py-12 border-t border-slate-200 bg-white no-print">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3 opacity-50">
                <div className="bg-slate-800 p-2 rounded text-white font-black text-xs">PX</div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Phố Xanh AI © 2024 - Công nghệ nhà thầu số</span>
            </div>
            <div className="flex gap-8 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <a href="#" className="hover:text-sky-600">Quy chuẩn</a>
                <a href="#" className="hover:text-sky-600">Pháp lý</a>
                <a href="#" className="hover:text-sky-600">Hướng dẫn</a>
            </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
            @page { 
                size: A4; 
                margin: 0; 
            }
            body { 
                background: white !important; 
                margin: 0 !important; 
                padding: 0 !important; 
            }
            .no-print { display: none !important; }
            .print-area { 
                width: 210mm; 
                margin: 0 auto;
                padding: 0 !important;
                background: white !important;
            }
            .pdf-page { 
                page-break-after: always;
                page-break-inside: avoid;
                margin: 0 !important; 
                border: none !important; 
                box-shadow: none !important;
                width: 210mm !important;
                height: 297mm !important;
                background: white !important;
                position: relative;
                overflow: hidden;
            }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }

        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .admin-body { font-family: 'Calibri', 'Carlito', sans-serif; }
      `}} />
    </div>
  );
}

const Header = ({ currentUser, onLogout, onLogin, onGuestLogin, isAuthenticated, isGuest }: {currentUser: any, onLogout: () => void, onLogin: (key: string) => void, onGuestLogin: () => void, isAuthenticated: boolean, isGuest: boolean}) => {
  const isAdmin = localStorage.getItem('phoxanh_api_key') === '090.6381-186';
  
  return (
  <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50 no-print transition-all">
    <div className="container mx-auto px-6 py-4 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="bg-slate-900 p-2.5 rounded-xl shadow-md ring-1 ring-slate-900/5">
            <HardHat size={20} className="text-sky-400" />
        </div>
        <div>
          <h1 className="font-display font-extrabold text-[1.35rem] tracking-tight leading-none text-slate-900">
            PHỐ XANH <span className="text-sky-500 bg-sky-50/50 px-1.5 rounded-md border border-sky-100 ml-0.5">AI</span>
          </h1>
          <p className="text-[9px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-1.5">Hệ Thống Quản Trị Nhà Thầu</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden md:flex bg-slate-100 rounded-xl p-1 border border-slate-200 shadow-inner">
          <button 
            onClick={() => {
              if (isAdmin) {
                onGuestLogin();
              }
            }}
            className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
              !isAdmin
                ? "bg-white text-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Chế độ Xem
          </button>
          <button 
            onClick={() => {
              if (!isAdmin) {
                 const key = prompt("Vui lòng nhập mật khẩu Quản lý:");
                 if (key === '090.6381-186') {
                     onLogin(key);
                 } else if (key) {
                     alert("Mật khẩu không đúng.");
                 }
              }
            }}
            className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
              isAdmin
                ? "bg-white text-sky-600 shadow-sm border border-sky-100" 
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Chế độ Quản lý
          </button>
        </div>
        
        {isAuthenticated && !isAdmin && (
           <button 
             onClick={onLogout}
             className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50/50 hover:bg-red-50 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all border border-slate-200 hover:border-red-200 hover:text-red-600 text-slate-500 shadow-sm"
             title="Đăng xuất và xóa API Key"
           >
             Thoát API Key
           </button>
        )}
        {currentUser && (
          <div className="hidden md:flex bg-emerald-50/50 px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider border border-emerald-100 text-emerald-700 font-bold items-center gap-3 shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse"></div>
            Online
          </div>
        )}
      </div>
    </div>
  </nav>
  );
};
