// src/pages/TenantMaintenancePage.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wrench, Plus, Clock, CheckCircle2, AlertTriangle,
    MessageSquare, HardDrive, Filter, X, ChevronRight,
    Send, Loader2, Sparkles, Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeTenantMaintenance, addMaintenance } from '../services/firebase';
import { subscribeTenantTenancies } from '../services/tenancy';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function TenantMaintenancePage() {
    const { user } = useAuth();
    const { fmt } = useLocale();

    const [requests, setRequests] = useState([]);
    const [tenancies, setTenancies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState('all');

    const [form, setForm] = useState({
        title: '',
        description: '',
        propertyId: '',
        priority: 'medium'
    });

    useEffect(() => {
        if (!user?.uid) return;
        const u1 = subscribeTenantMaintenance(user.uid, (list) => {
            setRequests(list);
            setLoading(false);
        });
        const u2 = subscribeTenantTenancies(user.uid, setTenancies);
        return () => { u1?.(); u2?.(); };
    }, [user?.uid]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.propertyId) {
            toast.error('Please specify the issue and property.');
            return;
        }

        setSaving(true);
        try {
            const selectedTenancy = tenancies.find(t => t.propertyId === form.propertyId);
            await addMaintenance(selectedTenancy.landlordId, form.propertyId, {
                ...form,
                tenantId: user.uid,
                tenantName: user.displayName || 'Tenant',
                propertyName: selectedTenancy.propertyName || 'Property',
                unitName: selectedTenancy.unitName || 'Unit',
                unitId: selectedTenancy.unitId
            });
            toast.success('Maintenance request submitted.');
            setShowModal(false);
            setForm({ title: '', description: '', propertyId: '', priority: 'medium' });
        } catch (err) {
            console.error(err);
            toast.error('Failed to submit request.');
        } finally {
            setSaving(false);
        }
    };

    const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

    return (
        <div className="space-y-8 py-2 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-[#e8e4de] text-4xl font-bold tracking-tight">
                        Maintenance <span className="text-[#52b788]">Requests</span>
                    </h1>
                    <p className="font-body text-[#4a5568] text-sm mt-1 uppercase tracking-widest font-bold">
                        {requests.length} total operations logged
                    </p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-primary py-3 px-6 shadow-xl shadow-[#1a3c2e]/20 text-[10px] font-bold uppercase tracking-[0.2em]"
                >
                    <Plus size={16} /> Open New Ticket
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {['all', 'open', 'in-progress', 'resolved'].map((key) => (
                    <button
                        key={key}
                        onClick={() => setFilter(key)}
                        className={`px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all whitespace-nowrap
              ${filter === key
                                ? 'bg-[#52b788] text-[#1a3c2e] border-[#52b788]'
                                : 'bg-[#141b1e] text-[#4a5568] border-[#1e2a2e] hover:border-[#4a5568]/30'}`}
                    >
                        {key.replace('-', ' ')}
                    </button>
                ))}
            </div>

            {/* List */}
            {loading ? (
                <div className="grid gap-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-24 bg-[#0d1215] border border-[#1e2a2e] rounded-2xl animate-pulse" />)}
                </div>
            ) : filtered.length === 0 ? (
                <div className="card p-20 text-center border-2 border-dashed border-[#1e2a2e]">
                    <div className="w-16 h-16 rounded-3xl bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center text-[#1e2a2e] mx-auto mb-6">
                        <Wrench size={32} />
                    </div>
                    <h3 className="font-display text-[#e8e4de] text-xl font-bold">No active tickets</h3>
                    <p className="font-body text-[#4a5568] text-sm mt-2 max-w-xs mx-auto font-medium">
                        Everything seems to be in order. If you encounter an issue, open a new ticket.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    <AnimatePresence mode="popLayout">
                        {filtered.map((req, i) => (
                            <motion.div
                                key={req.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: i * 0.05 }}
                                className="card p-6 bg-[#0d1215] border-[#1e2a2e] hover:border-[#1a3c2e] transition-all group overflow-hidden relative"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
                                    <div className="flex items-start gap-5 flex-1">
                                        <div className={`w-12 h-12 rounded-2xl bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105
                      ${req.priority === 'high' ? 'text-[#e74c3c]' : req.priority === 'medium' ? 'text-[#f0c040]' : 'text-[#52b788]'}`}>
                                            <Wrench size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-body font-bold text-[#e8e4de] text-base tracking-tight leading-tight uppercase">{req.title}</h4>
                                                <StatusBadge status={req.status} />
                                            </div>
                                            <p className="font-body text-[#8a9ba8] text-sm mt-2 line-clamp-2 leading-relaxed">
                                                {req.description || 'No detailed description provided.'}
                                            </p>
                                            <div className="flex items-center gap-4 mt-4">
                                                <span className="font-body text-[9px] text-[#4a5568] font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                                                    <Building2 size={12} className="text-[#1a3c2e]" /> {req.unitName} · {req.propertyName}
                                                </span>
                                                <span className="font-body text-[9px] text-[#4a5568] font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                                                    <Clock size={12} className="text-[#1a3c2e]" /> {req.createdAt?.toDate ? format(req.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 pl-16 md:pl-0">
                                        <button className="h-10 px-5 rounded-xl bg-[#141b1e] border border-[#1e2a2e] text-[#4a5568] hover:text-[#e8e4de] hover:border-[#4a5568]/30 transition-all text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                            View Timeline <ChevronRight size={12} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* New Request Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="Initialize Maintenance Ticket"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="label-xs">Property / Residence *</label>
                        <select
                            className="input-base"
                            value={form.propertyId}
                            onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                            required
                        >
                            <option value="">Select your home...</option>
                            {tenancies.map(t => (
                                <option key={t.id} value={t.propertyId}>{t.unitName} · {t.propertyName}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="label-xs">Issue Summary *</label>
                        <input
                            className="input-base"
                            placeholder="e.g. Primary bathroom tap leak"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            required
                        />
                    </div>

                    <div>
                        <label className="label-xs">Detailed Description</label>
                        <textarea
                            className="input-base min-h-[120px] resize-none"
                            placeholder="Describe the nature of the issue and when it started..."
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="label-xs">Priority Protocol</label>
                        <div className="grid grid-cols-3 gap-3">
                            {['low', 'medium', 'high'].map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setForm({ ...form, priority: p })}
                                    className={`py-3 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border transition-all
                    ${form.priority === p
                                            ? (p === 'high' ? 'bg-[#2d1a1a] text-[#e74c3c] border-[#e74c3c]/50' : p === 'medium' ? 'bg-[#2d2510] text-[#f0c040] border-[#f0c040]/50' : 'bg-[#1a3c2e] text-[#52b788] border-[#52b788]/50')
                                            : 'bg-[#141b1e] text-[#4a5568] border-[#1e2a2e]'}`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="btn-secondary flex-1 py-4 uppercase text-[10px] font-black tracking-widest"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-primary flex-1 py-4 uppercase text-[10px] font-black tracking-widest bg-emerald-500"
                        >
                            {saving ? <Loader2 className="animate-spin" size={18} /> : 'Submit Ticket'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
