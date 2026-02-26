// src/pages/ApplyPortalPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DoorOpen, Building2, UserPlus, LogIn, Loader2, MapPin, Bed, Bath, Hash, ChevronRight, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collectionGroup, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function ApplyPortalPage() {
    const { propertyId, unitId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [property, setProperty] = useState(null);
    const [unit, setUnit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [requesting, setRequesting] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Find unit using collectionGroup since we don't have landlordUid
                const unitQuery = query(
                    collectionGroup(db, 'units'),
                    where('id', '==', unitId)
                );
                const unitSnap = await getDocs(unitQuery);

                if (unitSnap.empty) {
                    setError(true);
                    setLoading(false);
                    return;
                }

                const unitDoc = unitSnap.docs[0];
                const unitData = unitDoc.data();
                setUnit({ id: unitDoc.id, ...unitData });

                // The property is the parent's parent: users/{uid}/properties/{propertyId}
                const propertyRef = unitDoc.ref.parent.parent;
                const propertySnap = await getDoc(propertyRef);

                if (propertySnap.exists()) {
                    setProperty({ id: propertySnap.id, ...propertySnap.data(), landlordUid: propertyRef.parent.id });
                } else {
                    setError(true);
                }
            } catch (err) {
                console.error("Fetch Error:", err);
                setError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [propertyId, unitId]);

    const handleJoinRequest = async () => {
        if (!user) {
            navigate(`/signup-tenant?redirect=${encodeURIComponent(window.location.pathname)}`);
            return;
        }

        setRequesting(true);
        try {
            const { requestUnitApproval } = await import('../services/firebase');
            await requestUnitApproval(property.landlordUid, propertyId, unitId, {
                uid: user.uid,
                fullName: user.displayName || 'Anonymous Tenant',
                email: user.email
            });
            toast.success("Request sent! Landlord will review your application.");
            navigate('/tenant');
        } catch (err) {
            console.error(err);
            toast.error(err.message || "Failed to send request.");
        } finally {
            setRequesting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                    <Loader2 size={32} className="text-[#1A3C2E] animate-spin mx-auto" />
                    <p className="text-[#1A1612] font-black uppercase tracking-widest text-[10px]">Loading Unit Portal...</p>
                </div>
            </div>
        );
    }

    if (error || !unit || !property) {
        return (
            <div className="min-h-screen bg-[#F5F2ED] flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto text-red-500">
                        <DoorOpen size={40} />
                    </div>
                    <h1 className="text-3xl font-fraunces font-black text-[#1A1612]">Unit Not Found</h1>
                    <p className="text-[#8B8B8B] font-medium leading-relaxed">
                        The share link might be broken or the unit is no longer available for applications.
                    </p>
                    <Link to="/" className="inline-flex btn-primary px-8 py-4 text-sm font-black uppercase bg-[#1A3C2E]">
                        Back to Gravlo
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F5F2ED] flex flex-col items-center py-12 px-6">
            <div className="max-w-4xl w-full">
                {/* Header Logo */}
                <div className="flex items-center justify-center gap-3 mb-16">
                    <div className="w-10 h-10 bg-[#1A3C2E] rounded-xl flex items-center justify-center">
                        <KeyRound size={20} className="text-[#F5F2ED]" />
                    </div>
                    <span className="text-xl font-fraunces font-black text-[#1A1612]">Gravlo</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                    {/* Left: Unit Details */}
                    <div className="space-y-8">
                        <div>
                            <div className="inline-flex items-center px-3 py-1 bg-[#1A3C2E]/5 rounded-full text-[#1A3C2E] text-[10px] font-black uppercase tracking-widest mb-4">
                                Available for Lease
                            </div>
                            <h1 className="text-4xl lg:text-5xl font-fraunces font-black text-[#1A1612] leading-tight mb-4">
                                Join {unit.name} at {property.name}
                            </h1>
                            <div className="flex items-center gap-2 text-[#8B8B8B] font-bold">
                                <MapPin size={18} />
                                <span>{property.address || 'Address provided on approval'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 bg-white rounded-3xl border border-[#F0EFEA] flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#8B8B8B]">Monthly Rent</label>
                                <p className="text-2xl font-fraunces font-black text-[#1A3C2E]">₦{unit.rentAmount?.toLocaleString() || '---'}</p>
                            </div>
                            <div className="p-6 bg-white rounded-3xl border border-[#F0EFEA] flex flex-col gap-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-[#8B8B8B]">Status</label>
                                <p className="text-2xl font-fraunces font-black text-amber-600 italic">Vacant</p>
                            </div>
                        </div>

                        <div className="p-8 bg-white rounded-[2.5rem] border border-[#F0EFEA] space-y-6">
                            <h3 className="text-sm font-black uppercase tracking-widest text-[#1A1612]">Unit Features</h3>
                            <div className="grid grid-cols-2 gap-y-4">
                                <div className="flex items-center gap-3 text-[#1A1612] font-bold border-l-4 border-amber-400 pl-3">
                                    <Bed size={20} className="text-amber-500" />
                                    <span>Standard Bedroom</span>
                                </div>
                                <div className="flex items-center gap-3 text-[#1A1612] font-bold border-l-4 border-[#52B788] pl-3">
                                    <Bath size={20} className="text-[#52B788]" />
                                    <span>Private Bath</span>
                                </div>
                                <div className="flex items-center gap-3 text-[#1A1612] font-bold border-l-4 border-blue-400 pl-3">
                                    <Hash size={20} className="text-blue-500" />
                                    <span>Unit Registry: {unit.id}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Join Flow */}
                    <div className="lg:sticky lg:top-12 p-8 lg:p-12 bg-[#1A3C2E] rounded-[3rem] text-[#F5F2ED] shadow-2xl shadow-[#1A3C2E]/20 space-y-8">
                        <div>
                            <h2 className="text-3xl font-fraunces font-black mb-4 italic">Ready to move in?</h2>
                            <p className="text-[#A7C4B5] font-medium leading-relaxed">
                                Join the official property registry to receive automated rent receipts, request maintenance, and build your tenant credit score.
                            </p>
                        </div>

                        {!user ? (
                            <div className="space-y-4 pt-4">
                                <Link
                                    to={`/signup-tenant?redirect=${encodeURIComponent(window.location.pathname)}`}
                                    className="w-full h-16 bg-[#52B788] rounded-2xl flex items-center justify-center gap-3 text-[#1A3C2E] text-[15px] font-black uppercase tracking-widest hover:bg-[#40916C] transition-all"
                                >
                                    <UserPlus size={20} strokeWidth={3} />
                                    Create Account
                                </Link>
                                <Link
                                    to={`/login?redirect=${encodeURIComponent(window.location.pathname)}`}
                                    className="w-full h-16 bg-white/10 rounded-2xl flex items-center justify-center gap-3 text-white text-[15px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/20 transition-all"
                                >
                                    <LogIn size={20} strokeWidth={3} />
                                    Sign In
                                </Link>
                                <p className="text-center text-[11px] font-bold uppercase tracking-widest text-[#A7C4B5]/60 mt-4">
                                    Account required for secure applications
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-6 pt-4">
                                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-[#A7C4B5] mb-2">Logged in as</p>
                                    <p className="text-lg font-bold">{user.displayName || user.email}</p>
                                </div>
                                <button
                                    onClick={handleJoinRequest}
                                    disabled={requesting}
                                    className="w-full h-16 bg-[#F5F2ED] rounded-2xl flex items-center justify-center gap-3 text-[#1A3C2E] text-[15px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl disabled:opacity-70"
                                >
                                    {requesting ? (
                                        <Loader2 size={24} className="animate-spin" />
                                    ) : (
                                        <>
                                            <span>Send Join Request</span>
                                            <ChevronRight size={20} strokeWidth={3} />
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-[11px] font-bold uppercase tracking-widest text-[#A7C4B5]/60">
                                    The landlord will be notified immediately
                                </p>
                            </div>
                        )}

                        <div className="pt-8 border-t border-white/10 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A7C4B5]">Powered by Gravlo Secure™</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
