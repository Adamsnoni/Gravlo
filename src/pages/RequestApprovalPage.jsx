// src/pages/RequestApprovalPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, UserCheck, UserMinus, Building2, DoorOpen, User, Bell, Loader2 } from 'lucide-react';
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
        if (!user || !propertyId || !unitId) return;

        const fetchData = async () => {
            try {
                // Fetch property
                const propRef = doc(db, 'users', user.uid, 'properties', propertyId);
                const propSnap = await getDoc(propRef);
                if (propSnap.exists()) setProperty({ id: propSnap.id, ...propSnap.data() });

                // Fetch unit
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
                currency: property?.currency || 'NGN', // Assuming fallback to NGN or property currency
                welcomeMessageSent: true,
                welcomeMessageDate: new Date(),
            });
            await clearUnitRequestNotifications(user.uid, propertyId, unitId, unit.pendingTenantId);
            toast.success(`${unit.pendingTenantName || 'Tenant'} approved for ${unit.name}!`);
            navigate(-1); // Go back to notifications or previous page
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
            toast.success(`Request from ${unit.pendingTenantName || 'tenant'} declined.`);
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
            <div className="flex justify-center py-20">
                <Loader2 size={24} className="text-sage animate-spin" />
            </div>
        );
    }

    if (!unit || !unit.pendingTenantId) {
        return (
            <div className="max-w-2xl mx-auto text-center py-20 space-y-4">
                <Bell size={40} className="mx-auto text-stone-300" />
                <h2 className="font-display text-2xl font-semibold text-ink">No Pending Request</h2>
                <p className="font-body text-stone-500">This request may have already been handled or does not exist.</p>
                <button onClick={() => navigate(-1)} className="btn-secondary mt-4">Go Back</button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-body font-medium text-stone-400 hover:text-ink transition-colors">
                <ArrowLeft size={16} /> Back
            </button>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-8 text-center bg-white shadow-sm">
                <div className="w-16 h-16 rounded-full bg-amber/10 flex items-center justify-center mx-auto mb-6">
                    <User size={28} className="text-amber" />
                </div>

                <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-2">
                    {unit.pendingTenantName || 'Unknown Tenant'}
                </h1>
                <p className="font-body text-stone-500 mb-8">
                    {unit.pendingTenantEmail} has requested to join your unit.
                </p>

                <div className="max-w-md mx-auto bg-stone-50 rounded-2xl p-6 border border-stone-100 text-left space-y-4 mb-8">
                    <div className="flex items-center gap-3">
                        <Building2 size={18} className="text-stone-400" />
                        <div>
                            <p className="font-body text-xs font-semibold uppercase tracking-wider text-stone-400">Property</p>
                            <p className="font-body text-ink font-medium">{property?.name || 'Unknown Property'}</p>
                        </div>
                    </div>
                    <div className="h-px bg-stone-200" />
                    <div className="flex items-center gap-3">
                        <DoorOpen size={18} className="text-stone-400" />
                        <div>
                            <p className="font-body text-xs font-semibold uppercase tracking-wider text-stone-400">Unit Requested</p>
                            <p className="font-body text-ink font-medium">{unit.name || 'Unknown Unit'}</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={handleDecline}
                        disabled={processing}
                        className="btn-secondary w-full sm:w-auto px-8"
                    >
                        {processing ? <Loader2 size={16} className="animate-spin" /> : <><UserMinus size={16} /> Decline</>}
                    </button>
                    <button
                        onClick={handleApprove}
                        disabled={processing}
                        className="btn-primary w-full sm:w-auto px-8"
                    >
                        {processing ? <Loader2 size={16} className="animate-spin" /> : <><UserCheck size={16} /> Approve Tenant</>}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
