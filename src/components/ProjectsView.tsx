import React, { useState, useEffect, useRef } from 'react';
import { Building2, MapPin, Calendar, ArrowRight, Trash2, Plus, Upload, X } from 'lucide-react';
import { motion } from 'motion/react';

const INITIAL_PROJECTS = [
    {
        id: 1,
        title: "Biệt thự Tân cổ điển - Vinhomes Riverside",
        location: "Long Biên, Hà Nội",
        area: "350",
        type: "Biệt thự",
        year: "2023",
        status: "Đã bàn giao",
        image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80",
    },
    {
        id: 2,
        title: "Nhà phố thương mại vát góc ngã tư",
        location: "Quận 1, TP.HCM",
        area: "120",
        type: "Nhà phố",
        year: "2023",
        status: "Đã bàn giao",
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80",
    },
    {
        id: 3,
        title: "Tòa nhà văn phòng H-Tower Phố xanh",
        location: "Cầu Giấy, Hà Nội",
        area: "1200",
        type: "Văn phòng",
        year: "2022",
        status: "Đã bàn giao",
        image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80",
    },
    {
        id: 4,
        title: "Căn hộ Penthouse Landmark Hiện đãi",
        location: "Bình Thạnh, TP.HCM",
        area: "280",
        type: "Căn hộ",
        year: "2022",
        status: "Đã bàn giao",
        image: "https://images.unsplash.com/photo-1600607687988-66dce3f6cc0b?auto=format&fit=crop&q=80",
    }
];

export const ProjectsView = ({ isAuthenticated }: { isAuthenticated: boolean }) => {
    const [projects, setProjects] = useState<any[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newImageBase64, setNewImageBase64] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        title: '',
        location: '',
        area: '',
        type: 'Nhà phố',
        year: new Date().getFullYear().toString(),
        status: 'Đã bàn giao',
    });

    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('phoxanh_projects');
        if (saved) {
            setProjects(JSON.parse(saved));
        } else {
            setProjects(INITIAL_PROJECTS);
            localStorage.setItem('phoxanh_projects', JSON.stringify(INITIAL_PROJECTS));
        }
    }, []);

    const saveProjects = (newProjects: any[]) => {
        setProjects(newProjects);
        localStorage.setItem('phoxanh_projects', JSON.stringify(newProjects));
    };

    const handleDelete = (id: number) => {
        const updated = projects.filter(p => p.id !== id);
        saveProjects(updated);
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

    const handleAddProject = () => {
        if (!formData.title || !newImageBase64) {
            alert('Vui lòng nhập tên dự án và chọn ảnh!');
            return;
        }

        const newProject = {
            ...formData,
            id: Date.now(),
            image: newImageBase64
        };

        saveProjects([newProject, ...projects]);
        setShowAddModal(false);
        setFormData({ title: '', location: '', area: '', type: 'Nhà phố', year: new Date().getFullYear().toString(), status: 'Đã bàn giao' });
        setNewImageBase64("");
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-slate-800 uppercase font-display tracking-tight">Dự án đã thực hiện</h2>
                    <p className="text-slate-500 mt-2">Tuyển tập các công trình tiêu biểu do Phố Xanh đảm nhiệm thiết kế và thi công.</p>
                </div>
                {isAuthenticated && (
                    <button onClick={() => setShowAddModal(true)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-sky-600 transition-all shadow-md">
                        <Plus size={16}/> Thêm Dự Án Mới
                    </button>
                )}
            </div>

            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] w-full max-w-xl p-8 shadow-2xl relative">
                        <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
                            <X size={20}/>
                        </button>
                        <h3 className="text-2xl font-black text-slate-800 mb-6 font-display uppercase tracking-tight">Thêm Dự Án Mới</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Hình ảnh dự án</label>
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="mt-1 h-40 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-sky-500 transition-all relative overflow-hidden"
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

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Tên dự án</label>
                                    <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Biệt thự Vinhome..." />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Địa điểm</label>
                                    <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="Quận 1, TP.HCM" />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Loại hình</label>
                                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer">
                                        <option value="Nhà phố">Nhà phố</option>
                                        <option value="Biệt thự">Biệt thự</option>
                                        <option value="Căn hộ">Căn hộ</option>
                                        <option value="Văn phòng">Văn phòng</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Diện tích (m²)</label>
                                    <input type="number" value={formData.area} onChange={e => setFormData({...formData, area: e.target.value})} className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="100" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Năm hoàn thành</label>
                                    <input type="text" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" placeholder="2023" />
                                </div>
                            </div>

                            <button onClick={handleAddProject} className="w-full py-4 mt-4 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest hover:bg-sky-600 transition-all flex items-center justify-center gap-2">
                                <Plus size={18}/> Lưu Thêm Dự Án
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {projects.map((project, index) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-50px" }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        key={project.id} 
                        className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:border-sky-300 transition-all group relative"
                    >
                        <div className="relative h-64 overflow-hidden">
                            <img src={project.image} alt={project.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur text-slate-900 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">
                                {project.type}
                            </div>
                            <div className="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">
                                {project.status}
                            </div>
                            
                            {isAuthenticated && (
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        if (deletingId === project.id) {
                                            handleDelete(project.id);
                                            setDeletingId(null);
                                        } else {
                                            setDeletingId(project.id);
                                            setTimeout(() => setDeletingId(null), 3000);
                                        }
                                    }} 
                                    className={`absolute inset-0 m-auto ${deletingId === project.id ? 'w-24 h-10 bg-red-600 rounded-xl opacity-100' : 'w-12 h-12 bg-red-500/90 rounded-full opacity-0 group-hover:opacity-100 hover:scale-110'} text-white flex items-center justify-center transition-all shadow-xl z-20 backdrop-blur-sm`}
                                    title="Xóa dự án"
                                >
                                    {deletingId === project.id ? <span className="text-[10px] font-bold uppercase tracking-wider">Xác nhận</span> : <Trash2 size={20} />}
                                </button>
                            )}
                        </div>
                        
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-slate-800 mb-4 group-hover:text-sky-600 transition-colors line-clamp-1">{project.title}</h3>
                            
                            <div className="grid grid-cols-2 gap-y-3 text-sm text-slate-600 mb-6">
                                <div className="flex items-center gap-2"><MapPin size={16} className="text-slate-400"/> {project.location}</div>
                                <div className="flex items-center gap-2"><Building2 size={16} className="text-slate-400"/> {project.area}m²</div>
                                <div className="flex items-center gap-2"><Calendar size={16} className="text-slate-400"/> Năm: {project.year}</div>
                            </div>

                            <button className="w-full py-3 bg-slate-50 text-slate-600 font-bold uppercase tracking-widest rounded-xl text-xs hover:bg-sky-50 hover:text-sky-600 transition-all flex items-center justify-center gap-2 group-hover:border-sky-200 border border-transparent">
                                Xem chi tiết dự án <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
                            </button>
                        </div>
                    </motion.div>
                ))}
                {projects.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500">
                        Chưa có dự án nào. Vui lòng thêm dự án mới.
                    </div>
                )}
            </div>
        </div>
    );
};
