import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, MapPin, Loader2, Sparkles, LayoutGrid,
    ArrowRight, Check, ShieldCheck, Mail, Info, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPublicProperty, getPublicUnits, requestUnitApproval } from '../services/firebase';
import toast from 'react-hot-toast';

export default function PropertyPortalPage() {
    const { propertyId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [property, setProperty] = useState(null);
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const prop = await getPublicProperty(propertyId);
                if (!prop) {
                    toast.error("Property not found.");
                    setLoading(false);
                    return;
                }
                setProperty(prop);
                const unitList = await getPublicUnits(propertyId);
                setUnits(unitList);
            } catch (err) {
                console.error(err);
                toast.error("Failed to load portal.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [propertyId]);

    const handleRequest = async (unit) => {
        if (!user) {
            toast.error("Please login to request a unit.");
            navigate('/login', { state: { from: window.location.pathname } });
            return;
        }
        setRequesting(unit.id);
        try {
            await requestUnitApproval(property.ownerId, property.id, unit.id, user);
            toast.success("Request sent to landlord!");
            // Optionally refresh units to show pending status
            setUnits(prev => prev.map(u => u.id === unit.id ? { ...u, status: 'pending_approval' } : u));
        } catch (err) {
            console.error(err);
            toast.error(err.message || "Failed to send request.");
        } finally {
            setRequesting(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0f12] flex flex-col items-center justify-center p-6">
                <Loader2 size={40} className="text-[#52b788] animate-spin mb-4" />
                <p className="text-[#4a5568] text-[10px] font-black uppercase tracking-[0.2em]">Synchronizing Asset Data...</p>
            </div>
        );
    }

    if (!property) {
        return (
            <div className="min-h-screen bg-[#0a0f12] flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 rounded-[2rem] bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center mb-8 text-[#1e2a2e]">
                    <Building2 size={40} />
                </div>
                <h2 className="text-2xl font-black text-[#e8e4de] tracking-tighter mb-2">Portal Unavailable.</h2>
                <p className="text-[#4a5568] text-sm max-w-xs mx-auto mb-8">This property coordinate does not exist or has been decommissioned.</p>
                <button onClick={() => navigate('/')} className="btn-secondary h-12 px-8 rounded-xl font-bold uppercase tracking-widest">Return Home</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#070b0d] text-[#e8e4de] font-body selection:bg-[#52b788]/30">
            {/* Background Ambience */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-[#52b788]/5 rounded-full blur-[120px] -mr-24 -mt-24" />
                <div className="absolute bottom-0 left-0 w-[40vw] h-[40vh] bg-[#1a3c2e]/10 rounded-full blur-[120px] -ml-24 -mb-24" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 sm:py-20 lg:py-32">
                {/* Header Section */}
                <header className="mb-16 sm:mb-24">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col sm:flex-row sm:items-end justify-between gap-8 pb-12 border-b border-[#1e2a2e]"
                    >
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="px-3 py-1 bg-[#52b788]/20 text-[#52b788] text-[9px] font-black uppercase tracking-widest rounded leading-none">
                                    Verified Property
                                </span>
                                <span className="text-[9px] font-bold text-[#4a5568] uppercase tracking-[0.2em]">Ref: {property.id.slice(0, 8)}</span>
                            </div>
                            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter leading-none">{property.name}</h1>
                            <p className="text-[#8a9ba8] text-lg flex items-center gap-2 font-medium">
                                <MapPin size={20} className="text-[#52b788]" />
                                {property.address}, {property.city}
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-[9px] font-bold text-[#4a5568] uppercase tracking-widest mb-1">Managed By</p>
                                <p className="text-sm font-bold text-[#e8e4de]">LeaseEase Network</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center text-[#52b788]">
                                <ShieldCheck size={28} />
                            </div>
                        </div>
                    </motion.div>
                </header>

                <div className="grid lg:grid-cols-3 gap-12 sm:gap-16">
                    {/* Main Content: Unit Catalog */}
                    <div className="lg:col-span-2 space-y-12">
                        <div>
                            <h3 className="text-[10px] font-black text-[#52b788] uppercase tracking-[0.3em] mb-8">Infrastructure Catalog</h3>
                            <div className="space-y-6">
                                {units.length === 0 ? (
                                    <div className="p-12 text-center rounded-[2.5rem] bg-[#0d1215] border border-[#1e2a2e]">
                                        <p className="text-[#4a5568] italic">No active vectors found for this hub.</p>
                                    </div>
                                ) : (
                                    units.map((unit, i) => (
                                        <motion.div
                                            key={unit.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="group p-8 bg-[#0d1215] border border-[#1e2a2e] rounded-[2.5rem] hover:border-[#1a3c2e] transition-all duration-500 relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
                                                <Building2 size={80} />
                                            </div>

                                            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-8">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-16 h-16 rounded-3xl bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center text-2xl font-black text-[#e8e4de] group-hover:bg-[#1a3c2e] group-hover:text-[#52b788] group-hover:border-[#52b788] transition-all duration-500">
                                                        {i + 1}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-2xl font-black tracking-tight mb-1">{unit.name}</h4>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-[10px] font-bold text-[#4a5568] uppercase tracking-widest">{unit.bedrooms || 'Studio'} Vector</span>
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${unit.status === 'vacant' ? 'bg-[#52b788]/10 text-[#52b788] border-[#52b788]/30' : 'bg-[#f0c040]/10 text-[#f0c040] border-[#f0c040]/30'
                                                                }`}>
                                                                {unit.status === 'vacant' ? 'AVAILABLE' : 'PENDING'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-end gap-10">
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-bold text-[#4a5568] uppercase tracking-widest mb-1">Monthly Valuation</p>
                                                        <p className="text-3xl font-black text-[#52b788] tracking-tighter leading-none">₦{(unit.rentAmount || 0).toLocaleString()}</p>
                                                    </div>

                                                    <button
                                                        onClick={() => handleRequest(unit)}
                                                        disabled={unit.status !== 'vacant' || requesting === unit.id}
                                                        className={`
                              h-14 px-8 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all
                              ${unit.status === 'vacant'
                                                                ? 'bg-gradient-to-r from-[#1a3c2e] to-[#2d6a4f] text-[#52b788] hover:shadow-xl hover:shadow-[#1a3c2e]/40'
                                                                : 'bg-[#141b1e] border border-[#1e2a2e] text-[#4a5568] cursor-not-allowed'}
                            `}
                                                    >
                                                        {requesting === unit.id ? (
                                                            <Loader2 size={16} className="animate-spin" />
                                                        ) : unit.status === 'vacant' ? (
                                                            <>Join Hub <ArrowRight size={16} /></>
                                                        ) : (
                                                            'Under Review'
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar: Details & Action */}
                    <aside className="space-y-8">
                        <div className="p-8 rounded-[2.5rem] bg-[#0d1215] border border-[#1e2a2e] space-y-8">
                            <div>
                                <h3 className="text-[10px] font-black text-[#4a5568] uppercase tracking-[0.3em] mb-4">Core Attributes</h3>
                                <div className="flex flex-wrap gap-2">
                                    {property.amenities?.length > 0 ? (
                                        property.amenities.map(a => (
                                            <span key={a} className="px-4 py-2 bg-[#141b1e] border border-[#1e2a2e] text-[#8a9ba8] text-[10px] font-bold uppercase tracking-widest rounded-xl">
                                                {a}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-xs text-[#4a5568] italic">Standard infrastructure set.</p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-8 border-t border-[#1e2a2e]">
                                <h3 className="text-[10px] font-black text-[#4a5568] uppercase tracking-[0.3em] mb-4">Digital Identity</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 text-xs font-medium text-[#8a9ba8]">
                                        <ShieldCheck size={16} className="text-[#52b788]" />
                                        <span>Identity Verified Landlord</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-medium text-[#8a9ba8]">
                                        <Zap size={16} className="text-[#52b788]" />
                                        <span>Instant Residency Requests</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs font-medium text-[#8a9ba8]">
                                        <Mail size={16} className="text-[#52b788]" />
                                        <span>Digital Lease Automation</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 pt-4">
                                <div className="p-6 bg-[#1a3c2e]/10 border border-[#1a3c2e]/20 rounded-[2rem] flex gap-4">
                                    <Info size={20} className="text-[#52b788] shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-bold text-[#e8e4de] uppercase tracking-widest mb-1">Onboarding Logic</p>
                                        <p className="text-[11px] text-[#8a9ba8] leading-relaxed">Requesting a unit will notify the landlord immediately. Once approved, you'll receive your digital lease agreement.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 rounded-[2.5rem] bg-[#1a3c2e] border border-[#52b788] text-center space-y-4">
                            <Sparkles size={32} className="text-white mx-auto animate-pulse" />
                            <h4 className="text-xl font-black text-white tracking-tighter italic">"Redefining modern residency."</h4>
                            <p className="text-[#e8e4de]/70 text-[10px] font-bold uppercase tracking-widest leading-loose">Powered by Gravlo Neural Network. Join the evolution of property management.</p>
                        </div>
                    </aside>
                </div>
            </div>

            <footer className="relative z-10 py-12 border-t border-[#1e2a2e] text-center">
                <div className="flex items-center justify-center gap-2 mb-4 opacity-30">
                    <LayoutGrid size={16} />
                    <span className="text-[10px] font-black uppercase tracking-[0.4em]">LeaseEase</span>
                </div>
                <p className="text-[9px] font-black text-[#4a5568] uppercase tracking-widest">© 2026 LeaseEase Network · All Rights Reserved</p>
            </footer>
        </div>
    );
}
