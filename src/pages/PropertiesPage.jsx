// src/pages/PropertiesPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Plus,
    Search,
    Building2,
    MapPin,
    ChevronRight,
    Filter,
    Hash,
    ArrowRight,
    X,
    CreditCard,
    DoorOpen,
    User,
    Bell,
    UserCheck,
    Link2,
    Copy,
    Check,
    Loader2,
    Download,
    ShieldCheck,
    Zap,
    Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeTenancies } from '../services/tenancy';
import { subscribeLandlordInvoices } from '../services/invoices';
import { createInviteToken } from '../services/inviteTokens';
import {
    subscribeProperties,
    subscribeUnits,
    subscribePendingUnits,
    addProperty,
    deleteProperty,
    deleteUnit,
    updateUnit,
    clearUnitRequestNotifications,
    callApproveTenantRequest
} from '../services/firebase';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { canAddProperty, getUpgradePlan, getUserPlan } from '../services/subscription';
import { CornerLeaf } from '../components/Shared/Branding';
import { PropertyThumb } from '../components/Properties/PropertyThumb';

// ── Main Page Component ─────────────────────────────────────

export default function PropertiesPage() {
    const { user } = useAuth();
    const { fmt, country } = useLocale();
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);

    const [properties, setProperties] = useState([]);
    const [allUnits, setAllUnits] = useState({}); // Map of propertyId -> units[]
    const [pendingUnits, setPendingUnits] = useState([]);
    const [tenancies, setTenancies] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProperty, setSelectedProperty] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [invitingPropId, setInvitingPropId] = useState(null);
    const [deletingPropId, setDeletingPropId] = useState(null);
    const [deletingUnitId, setDeletingUnitId] = useState(null);
    const [form, setForm] = useState({ name: '', address: '', type: 'Apartment', description: '', unitsCount: '' });
    const [saving, setSaving] = useState(false); // Added saving state for addProperty
    const [showDeletePropConfirm, setShowDeletePropConfirm] = useState(false);
    const [propertyToDelete, setPropertyToDelete] = useState(null);
    const [showDeleteUnitConfirm, setShowDeleteUnitConfirm] = useState(false);
    const [unitToDelete, setUnitToDelete] = useState(null);

    // 1. Fetch Properties
    useEffect(() => {
        if (!user) return;
        const unsub = subscribeProperties(user.uid, (list) => {
            setProperties(list.map((p, i) => ({
                ...p,
                color: ["#1a6a3c", "#c8691a", "#7c3aed", "#0ea5e9", "#e74c3c"][i % 5]
            })));
            setLoading(false);
        });
        return unsub;
    }, [user]);

    // 2. Subscribe to Units for each property to get counts
    useEffect(() => {
        if (!user || properties.length === 0) return;
        const unsubs = properties.map(p =>
            subscribeUnits(user.uid, p.id, (units) => {
                setAllUnits(prev => ({ ...prev, [p.id]: units }));
            })
        );
        return () => unsubs.forEach(u => u());
    }, [user, properties.length]);

    // 3. Subscribe to Pending Units (Approval Queue)
    useEffect(() => {
        if (!user) return;
        return subscribePendingUnits(user.uid, setPendingUnits);
    }, [user]);

    // 4. Subscribe to Tenancies for tenant names
    useEffect(() => {
        if (!user) return;
        return subscribeTenancies(user.uid, setTenancies);
    }, [user]);

    // 5. Subscribe to Invoices for Automated Engine status
    useEffect(() => {
        if (!user) return;
        return subscribeLandlordInvoices(user.uid, setInvoices);
    }, [user]);

    // 6. Handle query params (auto-open form)
    useEffect(() => {
        if (queryParams.get('add') === 'true') {
            setShowForm(true);
        }
    }, [location.search]);

    const propertiesWithCounts = useMemo(() => {
        return properties.map(p => {
            const units = allUnits[p.id] || [];
            return {
                ...p,
                unitCount: units.length,
                occupiedCount: units.filter(u => u.status === 'occupied').length
            };
        });
    }, [properties, allUnits]);

    const filteredProperties = useMemo(() => {
        return propertiesWithCounts.filter(p =>
            p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.address?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [searchQuery, propertiesWithCounts]);

    const totalCollectedYearly = useMemo(() => {
        if (!selectedProperty) return 0;
        return invoices
            .filter(inv => inv.propertyId === selectedProperty.id && inv.status === 'paid')
            .reduce((acc, inv) => acc + (inv.amount || 0), 0);
    }, [invoices, selectedProperty]);

    const handleAddProperty = async (e) => {
        e.preventDefault();
        if (!form.name || !form.address) { toast.error('Name and address are required.'); return; }

        // Check subscription limit
        const allowed = await canAddProperty(user.uid, properties.length);
        if (!allowed) {
            const plan = await getUserPlan(user.uid);
            const upgrade = getUpgradePlan(plan.id);
            toast.error(`Limit reached on ${plan.name} plan.${upgrade ? ` Upgrade to ${upgrade.name} for more.` : ''}`);
            return;
        }

        setSaving(true);
        try {
            await addProperty(user.uid, {
                name: form.name,
                address: form.address,
                type: form.type,
                description: form.description,
                status: 'vacant',
            });
            toast.success('Asset Initialized.');
            setShowForm(false);
            setForm({ name: '', address: '', type: 'Apartment', description: '', unitsCount: '' });

            // Redirect back if coming from dashboard/empty state
            if (queryParams.get('from') === 'dashboard') {
                navigate('/dashboard');
            }
        } catch (err) {
            toast.error('Failed to create property.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProperty = async (prop) => {
        setPropertyToDelete(prop);
        setShowDeletePropConfirm(true);
    };

    const confirmDeleteProperty = async () => {
        const prop = propertyToDelete;
        if (!prop) return;

        setShowDeletePropConfirm(false);
        setDeletingPropId(prop.id);
        try {
            await deleteProperty(user.uid, prop.id);
            toast.success('Property deleted successfully.');
        } catch (err) {
            toast.error(err.message || 'Failed to delete property.');
        } finally {
            setDeletingPropId(null);
            setPropertyToDelete(null);
        }
    };

    const handleDeleteUnit = async (unit) => {
        setUnitToDelete(unit);
        setShowDeleteUnitConfirm(true);
    };

    const confirmDeleteUnit = async () => {
        const unit = unitToDelete;
        if (!unit) return;

        setShowDeleteUnitConfirm(false);
        setDeletingUnitId(unit.id);
        try {
            await deleteUnit(user.uid, selectedProperty.id, unit.id);
            toast.success('Unit deleted.');
        } catch (err) {
            toast.error(err.message || 'Failed to delete unit.');
        } finally {
            setDeletingUnitId(null);
            setUnitToDelete(null);
        }
    };

    const handleInvite = async (prop) => {
        setInvitingPropId(prop.id);
        try {
            const { link } = await createInviteToken({
                landlordUid: user.uid,
                propertyId: prop.id,
                propertyName: prop.name || '',
            });
            await navigator.clipboard.writeText(link);
            toast.success('Invite link copied to clipboard!');
        } catch (err) {
            toast.error('Failed to generate invite link.');
        } finally {
            setInvitingPropId(null);
        }
    };

    const handleApproveRequest = async (unit) => {
        try {
            toast.loading('Processing approval...', { id: 'approve-request' });
            await callApproveTenantRequest({
                propertyId: unit.propertyId,
                unitId: unit.id,
                tenantId: unit.pendingTenantId,
            });
            toast.success(`Approved resident for ${unit.name || unit.unitNumber}`, { id: 'approve-request' });
        } catch (err) {
            toast.error(err.message || 'Approval failed.', { id: 'approve-request' });
            console.error(err);
        }
    };

    const handleDeclineRequest = async (unit) => {
        try {
            await updateUnit(user.uid, unit.propertyId, unit.id, {
                status: 'vacant',
                pendingTenantId: null,
                pendingTenantName: null,
                pendingTenantEmail: null,
                pendingRequestedAt: null,
            });
            await clearUnitRequestNotifications(user.uid, unit.propertyId, unit.id, unit.pendingTenantId);
            toast.success('Join request declined.');
        } catch (err) {
            toast.error('Decline failed.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="w-10 h-10 border-4 border-[#1a6a3c]/10 border-t-[#1a6a3c] rounded-full animate-spin" />
            </div>
        );
    }

    // --- VIEW 1: UNIT DRILL DOWN ---
    if (selectedProperty) {
        const propertyUnits = allUnits[selectedProperty.id] || [];

        return (
            <div style={{ animation: "fadeIn 0.3s ease", paddingBottom: "40px" }} className="animate-slide-up">
                <button
                    onClick={() => setSelectedProperty(null)}
                    className="flex items-center gap-2 mb-8 text-[#1a6a3c] font-bold text-sm hover:translate-x-[-4px] transition-transform"
                >
                    <ArrowRight size={16} className="rotate-180" /> Back to Portfolio
                </button>

                <div style={{
                    background: "#1a3c2e",
                    borderRadius: "32px",
                    padding: "40px 48px",
                    color: "#fff",
                    marginBottom: "40px",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: `0 24px 48px rgba(26,60,46,0.15)`
                }}>
                    <CornerLeaf size={160} opacity={0.08} />
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div>
                            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "36px", margin: "0 0 12px" }}>{selectedProperty.name}</h2>
                            <div className="flex items-center gap-2 text-[#7fffd4] text-xs font-bold uppercase tracking-widest">
                                <span className="w-2 h-2 bg-[#7fffd4] rounded-full animate-pulse shadow-[0_0_8px_#7fffd4]"></span>
                                System Live: Syncing with Paystack & Termii
                            </div>
                        </div>

                        <div className="md:text-right">
                            <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-1">Total Collected (Yearly)</p>
                            <h2 className="text-4xl font-fraunces text-[#7fffd4] italic">{fmt(totalCollectedYearly)}</h2>
                        </div>
                    </div>

                    <div className="mt-8 pt-8 border-t border-white/10 flex flex-wrap items-center gap-10">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><DoorOpen size={18} /></div>
                            <div>
                                <p className="text-[10px] uppercase font-bold opacity-60">Inventory</p>
                                <p className="font-bold text-lg leading-tight">{selectedProperty.unitCount} Total Units</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><MapPin size={18} /></div>
                            <div>
                                <p className="text-[10px] uppercase font-bold opacity-60">Geography</p>
                                <p className="font-bold text-lg leading-tight truncate max-w-xs">{selectedProperty.address}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleInvite(selectedProperty)}
                            disabled={invitingPropId === selectedProperty.id}
                            className="md:ml-auto flex items-center gap-2 px-6 py-3 rounded-2xl bg-white text-[#1a3c2e] font-black text-xs uppercase tracking-widest hover:bg-[#7fffd4] hover:text-[#1a3c2e] transition-all shadow-xl shadow-black/10"
                        >
                            {invitingPropId === selectedProperty.id ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                            Generate Portal Link
                        </button>
                    </div>
                </div>

                {/* AUTOMATED UNIT TABLE */}
                <div style={{ background: "#fff", borderRadius: "28px", border: "1.5px solid #e2ede8", overflow: "hidden", boxShadow: "0 1px 12px rgba(26,60,46,0.03)" }}>
                    <div className="p-6 border-b border-[#f0f9f4] bg-[#f8fbf9] flex items-center justify-between">
                        <h3 className="font-fraunces font-black text-[#1a2e22] text-xl">Automated Payment Engine</h3>
                        <div className="flex items-center gap-2 px-3 py-1 bg-white border border-[#e2ede8] rounded-full text-[10px] font-black uppercase text-[#1a6a3c]">
                            <ShieldCheck size={12} /> Paystack Secured
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr className="bg-[#fcfdfc]">
                                    <th className="px-8 py-5 text-[10px] font-black text-[#94a3a8] uppercase tracking-widest border-b border-[#f0f9f4]">Unit & Resident</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#94a3a8] uppercase tracking-widest border-b border-[#f0f9f4]">Yearly Rent</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#94a3a8] uppercase tracking-widest border-b border-[#f0f9f4]">Yearly Service Charge</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#94a3a8] uppercase tracking-widest border-b border-[#f0f9f4]">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {propertyUnits.map(unit => {
                                    const tenancy = tenancies.find(t => t.unitId === unit.id && t.status === 'active');
                                    const unitInvoices = invoices.filter(inv => inv.unitId === unit.id);
                                    const isRentPaid = unitInvoices.some(inv => inv.status === 'paid');
                                    const isScPaid = unitInvoices.some(inv => inv.status === 'paid'); // Simulation: checking for any paid for now
                                    const nextReminderDays = 5; // Placeholder for automated logic

                                    return (
                                        <tr key={unit.id} className="group hover:bg-[#f4fbf7]/30 transition-colors border-b border-[#f0f9f4] last:border-0 cursor-pointer" onClick={() => navigate(`/properties/${selectedProperty.id}`)}>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-[#f0f7f2] flex items-center justify-center text-[#1a6a3c] font-black text-xs border border-[#ddf0e6]">
                                                        {unit.unitNumber?.slice(0, 2) || "U"}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-[#1a2e22] text-sm">{unit.unitNumber || unit.name || "Default Unit"}</div>
                                                        <div className="text-xs text-[#94a3a8] font-medium">{tenancy?.tenantName || "Vacant Asset"}</div>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-8 py-6">
                                                <div className="font-black text-[#1a2e22] mb-1">{fmt(unit.price || unit.rentAmount || 0)}</div>
                                                {isRentPaid ? (
                                                    <span className="px-2 py-0.5 bg-[#e8f5ee] text-[#1a6a3c] rounded-md text-[9px] font-black uppercase tracking-wider border border-[#ddf0e6]">
                                                        Paid via Paystack
                                                    </span>
                                                ) : tenancy ? (
                                                    <span className="text-[10px] font-bold text-[#dc2626]">
                                                        Next Reminder: {nextReminderDays} Days
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-[#94a3a8]">Awaiting Lease</span>
                                                )}
                                            </td>

                                            <td className="px-8 py-6">
                                                <div className="font-black text-[#1a2e22] mb-1">{fmt(selectedProperty.yearlyServiceCharge || 0)}</div>
                                                {isScPaid ? (
                                                    <span className="px-2 py-0.5 bg-[#e8f5ee] text-[#1a6a3c] rounded-md text-[9px] font-black uppercase tracking-wider border border-[#ddf0e6]">
                                                        Paid via Paystack
                                                    </span>
                                                ) : tenancy ? (
                                                    <span className="text-[10px] font-bold text-[#dc2626]">
                                                        Next Reminder: {nextReminderDays} Days
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-[#94a3a8]">Awaiting Lease</span>
                                                )}
                                            </td>

                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    {isRentPaid ? (
                                                        <button style={{ background: "#1a3c2e", borderRadius: "10px" }} className="flex items-center gap-2 px-4 py-2 text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#1a6a3c] transition-all">
                                                            <Download size={12} /> Invoice
                                                        </button>
                                                    ) : (
                                                        <div className="text-[10px] font-black text-[#94a3a8] uppercase tracking-widest">
                                                            {unit.status === 'occupied' ? 'Waiting for settlement...' : 'No active revenue'}
                                                        </div>
                                                    )}

                                                    {unit.status !== 'occupied' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteUnit(unit); }}
                                                            disabled={deletingUnitId === unit.id}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Delete Unit"
                                                        >
                                                            {deletingUnitId === unit.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // --- VIEW 2: PROPERTY LISTING ---
    return (
        <div style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: "60px" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700;9..144,800;9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

            {/* 0. APPROVAL QUEUE */}
            {pendingUnits.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-12 p-8 rounded-[2.5rem] bg-gradient-to-br from-[#fef9ed] to-[#fffaf0] border-2 border-[#f5e0b8] relative overflow-hidden"
                >
                    <div className="absolute top-[-20px] right-[-20px] opacity-[0.05] transform rotate-12">
                        <Bell size={120} color="#c8691a" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white border-2 border-[#f5e0b8] flex items-center justify-center text-[#c8691a] shadow-sm">
                                    <UserCheck size={24} />
                                </div>
                                <div>
                                    <h4 className="font-fraunces text-[#1a2e22] text-2xl font-black italic">Approval Queue</h4>
                                    <p className="text-[#c8691a] text-[10px] font-black uppercase tracking-widest mt-1">
                                        {pendingUnits.length} Pending Join Requests
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {pendingUnits.map(unit => {
                                const propName = properties.find(p => p.id === unit.propertyId)?.name || 'Property';
                                return (
                                    <div key={unit.id} className="bg-white p-5 rounded-3xl border border-[#f5e0b8] shadow-sm flex flex-col gap-5 hover:border-[#c8691a]/30 transition-all group">
                                        <div className="flex items-start justify-between">
                                            <div className="min-w-0">
                                                <p className="text-[#1a2e22] font-black text-sm group-hover:text-[#c8691a] transition-colors truncate">{unit.pendingTenantName}</p>
                                                <p className="text-[#94a3a8] text-[10px] font-bold uppercase tracking-widest mt-0.5 truncate">{propName} • {unit.name || unit.unitNumber}</p>
                                            </div>
                                            <span className="text-[10px] font-black text-[#c8691a] bg-[#fef9ed] px-2 py-1 rounded-lg uppercase tracking-widest flex-shrink-0">
                                                New
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleApproveRequest(unit)}
                                                className="flex-1 py-3.5 bg-[#1a6a3c] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1a3c2e] transition-all shadow-lg shadow-[#1a6a3c]/20"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleDeclineRequest(unit)}
                                                className="px-4 py-3.5 bg-white text-[#e74c3c] border border-[#fee2e2] rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#fff5f5] transition-all"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Header Actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 animate-slide-up">
                <div className="max-w-xl">
                    <p className="text-[10px] font-black text-[#6b8a7a] uppercase tracking-[0.2em] mb-2 px-1">Global Portfolio</p>
                    <h1 className="font-fraunces text-[#1a2e22] text-4xl font-black italic mb-4">Your Property Assets 🏢</h1>

                    <div className="relative mt-8">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#cce8d8]" size={18} />
                        <input
                            type="text"
                            placeholder="Filter by name, city, or street address..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-[#e2ede8] rounded-2xl pl-12 pr-6 py-4 text-sm font-bold text-[#1a2e22] focus:ring-4 focus:ring-[#1a6a3c]/5 focus:border-[#1a6a3c] transition-all placeholder:font-medium placeholder:text-[#94a3a8] shadow-sm"
                        />
                    </div>
                </div>

                <button
                    onClick={() => setShowForm(true)}
                    className="btn-primary"
                    style={{ padding: "16px 32px", borderRadius: "18px", boxShadow: "0 12px 24px rgba(26,60,46,0.15)" }}
                >
                    <Plus size={20} className="mr-2" strokeWidth={3} /> Add Property
                </button>
            </div>

            {/* Property Grid */}
            {filteredProperties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-white border-2 border-dashed border-[#e2ede8] rounded-[32px]">
                    <div className="w-20 h-20 rounded-3xl bg-[#f4fbf7] flex items-center justify-center text-[#cce8d8] mb-6">
                        <Building2 size={40} />
                    </div>
                    <h3 className="font-fraunces font-black text-[#1a2e22] text-xl italic mb-2">No matches found</h3>
                    <p className="text-[#94a3a8] font-medium max-w-sm text-center">Adjust your search query or initialize a new asset to populate your portfolio.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
                    {filteredProperties.map((prop, i) => (
                        <PropertyThumb
                            key={prop.id}
                            prop={prop}
                            onSelect={() => setSelectedProperty(prop)}
                            onInvite={(p, isDelete) => isDelete ? handleDeleteProperty(p) : handleInvite(p)}
                            inviting={invitingPropId === prop.id || deletingPropId === prop.id}
                            delay={0.1 + (i * 0.05)}
                        />
                    ))}
                </div>
            )}

            {/* Add Property Modal */}
            <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Initialize New Asset">
                <form onSubmit={handleAddProperty} className="space-y-6 pt-2">
                    <div>
                        <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-3 block">Property Descriptor *</label>
                        <input
                            placeholder="e.g. Sterling Heights"
                            className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-xl px-4 py-3.5 text-sm font-bold text-[#1a2e22] focus:ring-2 focus:ring-[#1a6a3c] outline-none"
                            required
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-3 block">Geographical Location *</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3a8]" size={16} />
                            <input
                                placeholder="City, State / Landmark"
                                className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-xl pl-11 pr-4 py-3.5 text-sm font-bold text-[#1a2e22] focus:ring-2 focus:ring-[#1a6a3c] outline-none"
                                required
                                value={form.address}
                                onChange={e => setForm({ ...form, address: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-3 block">Asset Type</label>
                            <select
                                className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-xl px-4 py-3.5 text-sm font-bold text-[#1a2e22] outline-none"
                                value={form.type}
                                onChange={e => setForm({ ...form, type: e.target.value })}
                            >
                                {['Apartment', 'House', 'Studio', 'Duplex', 'Commercial', 'Other'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-[#94a3b8] uppercase tracking-widest mb-3 block">Scale (Units)</label>
                            <input
                                placeholder="0"
                                type="number"
                                className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-xl px-4 py-3.5 text-sm font-bold text-[#1a2e22] outline-none"
                                value={form.unitsCount}
                                onChange={e => setForm({ ...form, unitsCount: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-[#f0f9f4]">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full btn-primary py-4 rounded-xl text-sm font-black shadow-xl shadow-[#1a3c2e]/20"
                        >
                            {saving ? 'Processing...' : 'Provision Asset'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="w-full bg-white text-[#94a3b8] text-xs font-bold py-3 mt-2 hover:text-[#e74c3c] transition-colors"
                        >
                            Cancel Operation
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Property Confirmation */}
            <Modal isOpen={showDeletePropConfirm} onClose={() => setShowDeletePropConfirm(false)} title="Final Confirmation" size="sm">
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Trash2 size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Asset?</h3>
                    <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                        Are you sure you want to delete <span className="font-bold text-gray-900">{propertyToDelete?.name}</span>? This action cannot be undone and all unit data will be lost.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button onClick={confirmDeleteProperty} className="w-full btn-primary py-4 bg-red-600 border-red-600 hover:bg-red-700 hover:border-red-700 text-white shadow-xl shadow-red-100">
                            Delete Permanently
                        </button>
                        <button onClick={() => setShowDeletePropConfirm(false)} className="w-full btn-secondary py-4 text-sm font-black uppercase tracking-widest border-transparent hover:bg-gray-100">
                            Disregard
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete Unit Confirmation */}
            <Modal isOpen={showDeleteUnitConfirm} onClose={() => setShowDeleteUnitConfirm(false)} title="Unit Removal" size="sm">
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Trash2 size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Remove Unit?</h3>
                    <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                        Are you sure you want to delete unit <span className="font-bold text-gray-900">{unitToDelete?.name || unitToDelete?.unitNumber}</span>?
                    </p>
                    <div className="flex flex-col gap-3">
                        <button onClick={confirmDeleteUnit} className="w-full btn-primary py-4 bg-red-600 border-red-600 hover:bg-red-700 hover:border-red-700 text-white shadow-xl shadow-red-100">
                            Delete Unit
                        </button>
                        <button onClick={() => setShowDeleteUnitConfirm(false)} className="w-full btn-secondary py-4 text-sm font-black uppercase tracking-widest border-transparent hover:bg-gray-100">
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
