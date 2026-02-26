// src/pages/AcceptInvitePage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Public page — validates a unit invite token and lets the tenant accept it.
// Integrated with a high-fidelity multi-step wizard.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    KeyRound, Check, ArrowLeft,
    Loader2, AlertTriangle, Clock, UserX
} from 'lucide-react';
import { fetchInviteToken, acceptInviteToken } from '../services/inviteTokens';
import { getVacantUnits, requestUnitApproval, registerUser } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// Modular Components
import { Layout, StatusScreen, ArrowIcon } from '../components/AcceptInvite/InviteComponents';
import { ScreenUnit } from '../components/AcceptInvite/ScreenUnit';
import { ScreenAccount } from '../components/AcceptInvite/ScreenAccount';
import { ScreenConfirm } from '../components/AcceptInvite/ScreenConfirm';
import { SuccessScreen } from '../components/AcceptInvite/SuccessScreen';

const INVITE_TOKEN_KEY = 'gravlo_pending_invite';

/** Store token so it survives the register/login redirect */
export function savePendingInvite(token) {
    sessionStorage.setItem(INVITE_TOKEN_KEY, token);
}

export function consumePendingInvite() {
    const t = sessionStorage.getItem(INVITE_TOKEN_KEY);
    sessionStorage.removeItem(INVITE_TOKEN_KEY);
    return t;
}

// ── Main Page Component ───────────────────────────────────────
export default function AcceptInvitePage() {
    const { token } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(-1); // -1 = initial load
    const [loading, setLoading] = useState(false);
    const [inviteData, setInviteData] = useState(null);
    const [vacantUnits, setVacantUnits] = useState([]);
    const [loadingUnits, setLoadingUnits] = useState(false);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [errors, setErrors] = useState({});
    const [animDir, setAnimDir] = useState('forward');
    const [visible, setVisible] = useState(true);

    const [form, setForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
    });

    // Pre-fill if user is logged in
    useEffect(() => {
        if (user) {
            setForm(prev => ({
                ...prev,
                fullName: user.displayName || '',
                email: user.email || '',
            }));
        }
    }, [user]);

    // Load invite data
    useEffect(() => {
        const init = async () => {
            try {
                const { data, valid, reason } = await fetchInviteToken(token);
                if (!valid) {
                    setInviteData({ reason });
                    setStep(-2); // Error state
                    return;
                }

                setInviteData(data);

                // Decide starting step
                if (data.unitId) {
                    setSelectedUnit({ id: data.unitId, name: data.unitName, symbol: '₦' });
                    setStep(1); // Proceed to account
                } else {
                    setStep(0); // Pick a unit
                    setLoadingUnits(true);
                    const units = await getVacantUnits(data.landlordUid, data.propertyId);
                    setVacantUnits(units);
                    setLoadingUnits(false);
                }
            } catch (err) {
                setInviteData({ reason: 'error' });
                setStep(-2);
            }
        };
        init();
    }, [token]);

    const onChange = (key, value) => {
        setForm((prev) => ({ ...prev, [key]: value }));
        setErrors((prev) => ({ ...prev, [key]: '' }));
    };

    const validate = () => {
        const e = {};
        if (step === 0 && !selectedUnit) {
            e.unit = 'Please select a unit';
        }
        if (step === 1 && !user) {
            if (!form.fullName.trim()) e.fullName = 'Full name is required';
            if (!form.email.includes('@')) e.email = 'Enter a valid email';
            if (!form.phone.trim()) e.phone = 'Phone number is required';
            if (form.password.length < 8) e.password = 'At least 8 characters';
            if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords don't match";
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const transition = (dir, cb) => {
        setAnimDir(dir);
        setVisible(false);
        setTimeout(() => { cb(); setVisible(true); }, 220);
    };

    const handleNext = async () => {
        if (!validate()) return;

        // If Step 1 (Account) and NOT logged in -> Register first
        if (step === 1 && !user) {
            setLoading(true);
            try {
                await registerUser({
                    email: form.email.trim().toLowerCase(),
                    password: form.password,
                    fullName: form.fullName.trim(),
                    phone: form.phone.trim(),
                    role: 'tenant',
                    countryCode: 'NG', // Default for tenant registration via wizard
                });
                toast.success('Account created!');
                transition('forward', () => setStep(2));
            } catch (err) {
                toast.error(err.message || 'Registration failed.');
                setErrors({ email: err.message });
            } finally {
                setLoading(false);
            }
            return;
        }

        if (step < 2) {
            transition('forward', () => setStep((s) => s + 1));
        } else {
            // Final Step: Submit Request or Accept Directly
            setLoading(true);
            try {
                if (!inviteData.unitId) {
                    // Building portal path -> request approval
                    await requestUnitApproval(inviteData.landlordUid, inviteData.propertyId, selectedUnit.id, user);
                    transition('forward', () => setStep(3));
                } else {
                    // Specific unit path -> direct accept
                    await acceptInviteToken(token, user);
                    transition('forward', () => setStep(3));
                }
            } catch (err) {
                toast.error(err.message || 'Submission failed.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleBack = () => {
        if (step > 0) transition('back', () => setStep((s) => s - 1));
    };

    // ── Render Logic ───────────────────────────────────────────

    if (step === -1) {
        return (
            <Layout shell={true}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={32} className="animate-spin text-sage mb-4 mx-auto" />
                    <p style={{ color: '#8a8178', fontFamily: "'DM Sans', sans-serif" }}>Verifying your invite...</p>
                </div>
            </Layout>
        );
    }

    if (step === -2) {
        const r = inviteData?.reason;
        return (
            <Layout shell={true}>
                {r === 'already_used' && <StatusScreen title="Link Used" message="This invite link has already been accepted." icon={Check} color="#4A7C59" />}
                {r === 'expired' && <StatusScreen title="Link Expired" message="This invite has expired. Ask your landlord for a new one." icon={Clock} color="#c8a951" />}
                {r === 'unit_occupied' && <StatusScreen title="Unit Occupied" message="This unit already has a tenant assigned." icon={UserX} color="#B84C3A" />}
                {(r === 'not_found' || r === 'error') && <StatusScreen title="Invalid Link" message="This invite link is invalid or has been revoked." icon={AlertTriangle} color="#B84C3A" />}
                <button onClick={() => navigate('/login')} className="btn-primary mt-6 w-full justify-center">Back to Login</button>
            </Layout>
        );
    }

    const STEPS = ['Choose Unit', 'Your Account', 'Confirm'];
    const showProgress = step < 3 && !inviteData?.unitId;

    return (
        <Layout>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@400;500;600;700&display=swap');
        
        @keyframes popIn {
          0%   { transform: scale(0); }
          80%  { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes confettiFall {
          from { transform: translateY(0) rotate(0deg); opacity: 0.7; }
          to   { transform: translateY(-16px) rotate(200deg); opacity: 0.3; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes enterForward {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes enterBack {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .enter-fwd { animation: enterForward 0.22s ease forwards; }
        .enter-bck { animation: enterBack 0.22s ease forwards; }
      `}</style>

            <div style={{
                width: '100%',
                maxWidth: 460,
                background: '#fffdf9',
                borderRadius: 20,
                padding: '38px 38px 34px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 8px 28px rgba(0,0,0,0.09)',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Top accent */}
                <div style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0,
                    height: 3,
                    background: 'linear-gradient(90deg, #c8a951, #f0c040, #e8a020)',
                }} />

                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
                    <div style={{
                        width: 30, height: 30, borderRadius: 7,
                        background: 'linear-gradient(135deg, #1a3c2e, #2d6a4f)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="white" opacity="0.9" />
                            <polyline points="9 22 9 12 15 12 15 22" fill="white" opacity="0.6" />
                        </svg>
                    </div>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: '#1a1614' }}>Gravlo</span>
                    <span style={{
                        fontSize: 11, fontWeight: 600, color: '#c8a951',
                        background: '#fdf8ec', border: '1px solid #e8d99a',
                        padding: '2px 8px', borderRadius: 99, marginLeft: 4,
                        fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.04em',
                    }}>Tenant Portal</span>
                </div>

                {/* Progress bar */}
                {step < 3 && (
                    <div style={{ marginBottom: 28 }}>
                        <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} style={{
                                    height: 3, flex: 1, borderRadius: 99,
                                    background: i <= step ? '#c8a951' : '#e0dbd4',
                                    transition: 'background 0.4s ease',
                                    opacity: (inviteData?.unitId && i === 0) ? 0 : 1 // Hide first seg for unit-specific
                                }} />
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            {STEPS.map((label, i) => (
                                <span key={i} style={{
                                    fontSize: 10, fontWeight: i <= step ? 700 : 400,
                                    color: i <= step ? '#c8a951' : '#c4bfba',
                                    fontFamily: "'DM Sans', sans-serif",
                                    letterSpacing: '0.06em', textTransform: 'uppercase',
                                    opacity: (inviteData?.unitId && i === 0) ? 0 : 1
                                }}>{label}</span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Animated screen container */}
                <div key={step} className={visible ? (animDir === 'forward' ? 'enter-fwd' : 'enter-bck') : ''} style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.15s' }}>
                    {step === 0 && <ScreenUnit propertyName={inviteData?.propertyName} address={inviteData?.address} vacantUnits={vacantUnits} loadingUnits={loadingUnits} selectedUnit={selectedUnit} onSelect={setSelectedUnit} />}
                    {step === 1 && <ScreenAccount data={form} onChange={onChange} errors={errors} unit={selectedUnit} user={user} />}
                    {step === 2 && <ScreenConfirm data={form} unit={selectedUnit} propertyName={inviteData?.propertyName} landlordName={inviteData?.landlordName} />}
                    {step === 3 && <SuccessScreen name={form.fullName} unitName={selectedUnit?.name} propertyName={inviteData?.propertyName} onDone={() => navigate('/tenant')} />}
                </div>

                {/* Navigation */}
                {step < 3 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, gap: 12 }}>
                        {(step > 0 && !(inviteData?.unitId && step === 1)) ? (
                            <button
                                type="button"
                                onClick={handleBack}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6, padding: '12px 18px',
                                    border: '1.5px solid #e0dbd4', borderRadius: 10, background: 'transparent',
                                    cursor: 'pointer', fontSize: 14, color: '#8a8178',
                                    fontFamily: "'DM Sans', sans-serif", transition: 'border-color 0.2s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#c8a951')}
                                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e0dbd4')}
                            >
                                <ArrowLeft size={15} /> Back
                            </button>
                        ) : <div />}

                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={loading || (step === 0 && !selectedUnit)}
                            style={{
                                flex: (step === 0 || (inviteData?.unitId && step === 1)) ? 1 : 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                padding: '13px 26px',
                                background: (loading || (step === 0 && !selectedUnit)) ? '#d4cec7' : 'linear-gradient(135deg, #c8a951, #e0bc5a)',
                                color: (step === 0 && !selectedUnit) ? '#9e9994' : '#1a1614',
                                border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
                                cursor: (loading || (step === 0 && !selectedUnit)) ? 'not-allowed' : 'pointer',
                                fontFamily: "'DM Sans', sans-serif",
                                boxShadow: (step === 0 && !selectedUnit) ? 'none' : '0 4px 14px rgba(200,169,81,0.35)',
                                transition: 'all 0.2s', minWidth: 140,
                            }}
                            onMouseEnter={(e) => {
                                if (!loading && (step !== 0 || selectedUnit)) {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(200,169,81,0.5)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = (step === 0 && !selectedUnit) ? 'none' : '0 4px 14px rgba(200,169,81,0.35)';
                            }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={15} className="animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    {step === 0 ? 'Continue with selection' : step === 2 ? 'Send Request' : 'Continue'}
                                    <ArrowIcon />
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Bottom login link for fresh users */}
                {step === 0 && !user && (
                    <p style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#b0a89e', fontFamily: "'DM Sans', sans-serif" }}>
                        Already have an account?{' '}
                        <Link to="/login" style={{ color: '#1a3c2e', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
                    </p>
                )}
            </div>
        </Layout>
    );
}
