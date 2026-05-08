import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Heart, Trash2, Plus, Upload, X } from 'lucide-react';

const STYLES = ["Tất cả", "Hiện đại", "Tân cổ điển", "Indochine", "Tối giản (Minimalism)", "Bắc Âu (Scandinavian)"];

const INITIAL_IMAGES = [
    { id: 1, style: "Hiện đại", title: "Phòng khách mở đón sáng", img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80" },
    { id: 2, style: "Tân cổ điển", title: "Phòng ngủ Master", img: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&q=80" },
    { id: 3, style: "Tối giản (Minimalism)", title: "Bếp và bàn ăn", img: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80" },
    { id: 4, style: "Hiện đại", title: "Mặt tiền nhà phố", img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80" },
    { id: 5, style: "Indochine", title: "Phòng khách Indochine", img: "https://images.unsplash.com/photo-1604147706283-d7119b5b822c?auto=format&fit=crop&q=80" },
    { id: 6, style: "Tân cổ điển", title: "Sảnh đón khách", img: "https://images.unsplash.com/photo-1599809275671-b5942cabc7a2?auto=format&fit=crop&q=80" },
    { id: 7, style: "Bắc Âu (Scandinavian)", title: "Góc làm việc thư giãn", img: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80" },
    { id: 8, style: "Hiện đại", title: "Phòng tắm kính", img: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&q=80" },
    { id: 9, style: "Tối giản (Minimalism)", title: "Không gian thiền", img: "https://images.unsplash.com/photo-1629813293813-f92a4e92b34a?auto=format&fit=crop&q=80" },
    { id: 10, style: "Indochine", title: "Phòng ngủ phong cách Á Đông", img: "https://images.unsplash.com/photo-1616486029423-aaa4789e8c9a?auto=format&fit=crop&q=80" },
    { id: 11, style: "Tân cổ điển", title: "Phòng ăn sang trọng", img: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&q=80" },
    { id: 12, style: "Bắc Âu (Scandinavian)", title: "Phòng khách ngập nắng", img: "https://images.unsplash.com/photo-1583847268964-b28ce8f3121b?auto=format&fit=crop&q=80" },
    { id: 13, style: "Tân cổ điển", title: "Biệt thự ngoại ô", img: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80" },
    { id: 14, style: "Hiện đại", title: "Căn hộ Penthouse", img: "https://images.unsplash.com/photo-1600607688969-a5bfcd64bd40?auto=format&fit=crop&q=80" },
    { id: 15, style: "Tối giản (Minimalism)", title: "Nhà vườn sinh thái", img: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&q=80" },
    { id: 16, style: "Indochine", title: "Ban công nhiệt đới", img: "https://images.unsplash.com/photo-1598928506311-c55dd580e557?auto=format&fit=crop&q=80" },
    { id: 17, style: "Tân cổ điển", title: "Cầu thang nghệ thuật", img: "https://images.unsplash.com/photo-1560448205-1dfdd186c321?auto=format&fit=crop&q=80" },
    { id: 18, style: "Hiện đại", title: "Phòng bếp đảo", img: "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&q=80" },
    { id: 19, style: "Bắc Âu (Scandinavian)", title: "Phòng ngủ ấm áp", img: "https://images.unsplash.com/photo-1505693314120-0d443867891c?auto=format&fit=crop&q=80" },
    { id: 20, style: "Tối giản (Minimalism)", title: "Không gian mở", img: "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&q=80" },
    { id: 21, style: "Indochine", title: "Sân trong biệt thự", img: "https://images.unsplash.com/photo-1588880331179-bc9b9c4aad79?auto=format&fit=crop&q=80" },
    { id: 22, style: "Hiện đại", title: "Phòng khách Smart Home", img: "https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&q=80" },
    { id: 23, style: "Tân cổ điển", title: "Khu vực đọc sách", img: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80" },
    { id: 24, style: "Bắc Âu (Scandinavian)", title: "Bàn ăn gia đình", img: "https://images.unsplash.com/photo-1493863435422-77114ff0e6e7?auto=format&fit=crop&q=80" },
    { id: 25, style: "Tối giản (Minimalism)", title: "Hiên nhà đón gió", img: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80" },
    { id: 26, style: "Indochine", title: "Phòng tắm hoài cổ", img: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80" }
];

export const ArchitectureLibrary = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
    const [images, setImages] = useState<any[]>([]);
    const [activeStyle, setActiveStyle] = useState("Tất cả");
    const [searchTerm, setSearchTerm] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [newImageBase64, setNewImageBase64] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        title: '',
        style: 'Hiện đại'
    });

    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('phoxanh_library');
        if (saved) {
            const parsed = JSON.parse(saved);
            const userAdded = parsed.filter((img: any) => img.id > 100); 
            setImages([...userAdded, ...INITIAL_IMAGES]);
        } else {
            setImages(INITIAL_IMAGES);
            localStorage.setItem('phoxanh_library', JSON.stringify(INITIAL_IMAGES));
        }
    }, []);

    const saveImages = (newImages: any[]) => {
        setImages(newImages);
        localStorage.setItem('phoxanh_library', JSON.stringify(newImages));
    };

    const handleDelete = (id: number) => {
        const updated = images.filter(i => i.id !== id);
        saveImages(updated);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setNewImageBase64(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleAddImage = () => {
        if (!formData.title || !newImageBase64) {
            alert('Vui lòng nhập tiêu đề và chọn ảnh!');
            return;
        }

        const newImage = {
            ...formData,
            id: Date.now(),
            img: newImageBase64
        };

        saveImages([newImage, ...images]);
        setShowAddModal(false);
        setFormData({ title: '', style: 'Hiện đại' });
        setNewImageBase64("");
    };

    const filteredImages = images.filter(i => {
        const matchStyle = activeStyle === "Tất cả" || i.style === activeStyle;
        const matchSearch = i.title.toLowerCase().includes(searchTerm.toLowerCase());
        return matchStyle && matchSearch;
    });

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            <div className="bg-slate-900 rounded-[2rem] p-10 md:p-14 relative overflow-hidden text-center sm:text-left shadow-2xl">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent"></div>
                <div className="relative z-10 max-w-2xl flex flex-col sm:flex-row justify-between items-start sm:items-end w-full gap-6">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-black text-white uppercase font-display tracking-tight mb-4">Thư viện Kiến trúc</h2>
                        <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                            Khám phá kho tàng ý tưởng thiết kế, từ phối cảnh kiến trúc cho đến nội thất chi tiết, giúp bạn dễ dàng định hình phong cách cho tổ ấm của mình.
                        </p>
                    </div>
                    {isAuthenticated && (
                        <button onClick={() => setShowAddModal(true)} className="bg-sky-500 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-sky-400 transition-all shadow-md shrink-0">
                            <Plus size={18}/> Thêm Mẫu Mới
                        </button>
                    )}
                </div>
            </div>

            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] w-full max-w-xl p-8 shadow-2xl relative">
                        <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                            <X size={20}/>
                        </button>
                        <h3 className="text-2xl font-black text-slate-800 mb-6 font-display uppercase tracking-tight">Thêm Mẫu Thiết Kế</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Hình ảnh thiết kế</label>
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="mt-1 h-48 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-sky-500 transition-all relative overflow-hidden"
                                >
                                    {newImageBase64 ? (
                                        <img src={newImageBase64} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <Upload size={32} className="text-slate-400 mb-2"/>
                                            <span className="text-sm font-bold text-slate-500">Nhấn để tải ảnh lên (Khuyến nghị &lt; 2MB)</span>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Tiêu đề / Ý tưởng</label>
                                    <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Phòng khách..." />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Phong cách</label>
                                    <select value={formData.style} onChange={e => setFormData({...formData, style: e.target.value})} className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer">
                                        {STYLES.filter(s => s !== "Tất cả").map(style => (
                                            <option key={style} value={style}>{style}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <button onClick={handleAddImage} className="w-full py-4 mt-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-sky-600 transition-all flex items-center justify-center gap-2">
                                <Plus size={18}/> Lưu Thêm Mẫu Thiết Kế
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm sticky top-[140px] z-30">
                <div className="flex overflow-x-auto w-full sm:w-auto scrollbar-hide gap-2 pb-2 sm:pb-0">
                    {STYLES.map(style => (
                        <button 
                            key={style}
                            onClick={() => setActiveStyle(style)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeStyle === style ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                        >
                            {style}
                        </button>
                    ))}
                </div>
                
                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Tìm kiếm mẫu thiết kế..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"/>
                </div>
            </div>

            <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
                {filteredImages.map(img => (
                    <div key={img.id} className="break-inside-avoid relative group rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all">
                        <img src={img.img} alt={img.title} className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {isAuthenticated && (
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (deletingId === img.id) {
                                        handleDelete(img.id);
                                        setDeletingId(null);
                                    } else {
                                        setDeletingId(img.id);
                                        setTimeout(() => setDeletingId(null), 3000);
                                    }
                                }} 
                                className={`absolute top-4 right-4 ${deletingId === img.id ? 'w-auto px-4 h-10 bg-red-600 rounded-xl opacity-100' : 'w-10 h-10 bg-red-500/90 rounded-full opacity-0 group-hover:opacity-100 hover:scale-110'} text-white flex items-center justify-center transition-all shadow-xl z-20 backdrop-blur-sm`}
                                title="Xóa ảnh"
                            >
                                {deletingId === img.id ? <span className="text-[10px] font-bold uppercase tracking-wider">Xác nhận</span> : <Trash2 size={16} />}
                            </button>
                        )}

                        <div className="absolute bottom-0 left-0 w-full p-6 translate-y-6 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <div className="inline-block px-2.5 py-1 bg-sky-500 text-white text-[10px] uppercase font-bold tracking-wider rounded gap-2 mb-2">
                                {img.style}
                            </div>
                            <h3 className="text-white font-bold text-lg leading-snug mb-3">{img.title}</h3>
                            <div className="flex items-center gap-2">
                                <button className="flex-1 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors">
                                    <Download size={14}/> Tải về
                                </button>
                                <button className="w-10 h-10 bg-white/20 hover:bg-red-500/80 backdrop-blur text-white rounded-lg flex items-center justify-center transition-colors">
                                    <Heart size={16}/>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {filteredImages.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500 break-inside-avoid">
                        Không tìm thấy ảnh nào.
                    </div>
                )}
            </div>
        </div>
    );
};
