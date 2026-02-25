// src/pages/RequestApprovalPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, UserCheck, UserMinus, Building2, DoorOpen, User, Bell, Loader2, AtSign, ShieldCheck, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, updateUnit, clearUnitRequestNotifications } from '../services/firebase';
import { createTenancy } from '../services/tenancy';
import { doc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function RequestApprovalPage() {
    const { propertyId, unitId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [property, setProperty] = useState(null);
    const [unit, setUnit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!user) return;
        if (!propertyId || !unitId) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const propRef = doc(db, 'users', user.uid, 'properties', propertyId);
                const propSnap = await getDoc(propRef);
                if (propSnap.exists()) setProperty({ id: propSnap.id, ...propSnap.data() });

                const unitRef = doc(db, 'users', user.uid, 'properties', propertyId, 'units', unitId);
                const unitSnap = await getDoc(unitRef);
                if (unitSnap.exists()) setUnit({ id: unitSnap.id, ...unitSnap.data() });
            } catch (err) {
                console.error("Error fetching request details:", err);
                toast.error("Failed to load request details.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, propertyId, unitId]);

    const handleApprove = async () => {
        if (!unit) return;
        setProcessing(true);
        try {
            await updateUnit(user.uid, propertyId, unitId, {
                status: 'occupied',
                tenantId: unit.pendingTenantId,
                tenantName: unit.pendingTenantName || '',
                tenantEmail: unit.pendingTenantEmail || '',
                pendingTenantId: null,
                pendingTenantName: null,
                pendingTenantEmail: null,
                pendingRequestedAt: null,
            });
            await createTenancy({
                tenantId: unit.pendingTenantId,
                landlordId: user.uid,
                propertyId: propertyId,
                unitId: unitId,
                tenantName: unit.pendingTenantName || '',
                tenantEmail: unit.pendingTenantEmail || '',
                unitName: unit.name || '',
                propertyName: property?.name || '',
                rentAmount: unit.rentAmount || 0,
                billingCycle: unit.billingCycle || 'monthly',
                currency: property?.currency || 'NGN',
                welcomeMessageSent: true,
                welcomeMessageDate: new Date(),
            });
            await clearUnitRequestNotifications(user.uid, propertyId, unitId, unit.pendingTenantId);
            toast.success(`Access granted for ${unit.pendingTenantName}!`);
            navigate(-1);
        } catch (err) {
            console.error(err);
            toast.error('Failed to approve request.');
        } finally {
            setProcessing(false);
        }
    };

    const handleDecline = async () => {
        if (!unit) return;
        setProcessing(true);
        try {
            await updateUnit(user.uid, propertyId, unitId, {
                status: 'vacant',
                pendingTenantId: null,
                pendingTenantName: null,
                pendingTenantEmail: null,
                pendingRequestedAt: null,
            });
            await clearUnitRequestNotifications(user.uid, propertyId, unitId, unit.pendingTenantId);
            toast.success(`Request declined.`);
            navigate(-1);
        } catch (err) {
            console.error(err);
            toast.error('Failed to decline request.');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40">
                <Loader2 size={40} className="text-[#52b788] animate-spin mb-6" />
                <p className="font-body text-[#4a5568] text-[10px] font-bold uppercase tracking-[0.2em]">Retrieving Request Data...</p>
            </div>
        );
    }

    if (!unit || !unit.pendingTenantId) {
        return (
            <div className="max-w-xl mx-auto text-center py-32 space-y-8 animate-in fade-in duration-500">
                <div className="w-20 h-20 rounded-[2rem] bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center mx-auto text-[#1e2a2e]">
                    <Bell size={40} />
                </div>
                <div>
                    <h2 className="font-display text-[#e8e4de] text-3xl font-bold tracking-tight mb-2">Null Vector</h2>
                    <p className="font-body text-[#4a5568] max-w-xs mx-auto text-sm leading-relaxed">This request coordinate has already been synchronized or does not exist in the current hub.</p>
                </div>
                <button onClick={() => navigate(-1)} className="btn-secondary h-14 px-10 rounded-2xl font-bold uppercase tracking-widest">Return to Dashboard</button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-500">
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 group text-[10px] font-bold uppercase tracking-widest text-[#4a5568] hover:text-[#e8e4de] transition-all">
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to History
            </button>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden bg-[#0d1215] border-[#1e2a2e] shadow-2xl relative">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#1a3c2e] via-[#52b788] to-[#1a3c2e]" />

                <div className="p-10 text-center">
                    <div className="w-20 h-20 rounded-[2.5rem] bg-gradient-to-br from-[#141b1e] to-[#0a0f12] border border-[#1e2a2e] flex items-center justify-center mx-auto mb-8 text-[#f0c040] shadow-xl">
                        <User size={36} />
                    </div>

                    <h1 className="font-display text-[#e8e4de] text-3xl sm:text-4xl font-bold tracking-tight mb-3">
                        {unit.pendingTenantName || 'Unknown Entity'}
                    </h1>
                    <div className="flex items-center justify-center gap-2 text-[#4a5568] mb-10">
                        <AtSign size={14} className="text-[#52b788]" />
                        <p className="font-body text-sm font-medium">{unit.pendingTenantEmail}</p>
                    </div>

                    <div className="p-8 rounded-3xl bg-[#141b1e] border border-[#1e2a2e] text-left grid sm:grid-cols-2 gap-8 mb-10 relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#52b788]/5 rounded-full blur-[40px] -mr-16 -mt-16" />

                        <div className="space-y-6 relative">
                            <div className="flex items-start gap-4">
                                <Building2 size={18} className="text-[#52b788] mt-1" />
                                <div>
                                    <p className="font-body text-[10px] font-bold uppercase tracking-widest text-[#4a5568] mb-1">Target Property</p>
                                    <p className="font-body text-[#e8e4de] font-bold tracking-tight">{property?.name || 'Detected Hub'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <DoorOpen size={18} className="text-[#52b788] mt-1" />
                                <div>
                                    <p className="font-body text-[10px] font-bold uppercase tracking-widest text-[#4a5568] mb-1">Target Unit</p>
                                    <p className="font-body text-[#e8e4de] font-bold tracking-tight">{unit.name || 'Level 1'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6 relative">
                            <div className="flex items-start gap-4">
                                <ShieldCheck size={18} className="text-[#52b788] mt-1" />
                                <div>
                                    <p className="font-body text-[10px] font-bold uppercase tracking-widest text-[#4a5568] mb-1">Authorization</p>
                                    <p className="font-body text-[#e8e4de] font-bold tracking-tight">Pending Approval</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <Mail size={18} className="text-[#52b788] mt-1" />
                                <div>
                                    <p className="font-body text-[10px] font-bold uppercase tracking-widest text-[#4a5568] mb-1">Notification Path</p>
                                    <p className="font-body text-[#e8e4de] font-bold tracking-tight">Email + Portal</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={handleDecline}
                            disabled={processing}
                            className="btn-secondary h-16 flex-1 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] border-[#1e2a2e] transition-all hover:bg-[#2d1a1a]/10 hover:border-[#3d2020] hover:text-[#e74c3c]"
                        >
                            {processing ? <Loader2 size={18} className="animate-spin mx-auto" /> : <><UserMinus size={18} /> Decline Request</>}
                        </button>
                        <button
                            onClick={handleApprove}
                            disabled={processing}
                            className="btn-primary h-16 flex-1 rounded-2xl text-[11px] font-bold uppercase tracking-[0.2em] shadow-xl shadow-[#1a3c2e]/30"
                        >
                            {processing ? <Loader2 size={18} className="animate-spin mx-auto" /> : <><UserCheck size={18} /> Grant Entry</>}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
