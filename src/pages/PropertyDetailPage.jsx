// src/pages/PropertyDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bed, Bath, MapPin, User, Mail, Phone, Plus, Wrench, CreditCard, Info, ChevronDown, Hash, Building2, DoorOpen, UserMinus, Link2, Copy, Check, UserCheck, AlertCircle, Loader2, Settings, ArrowRight, Activity, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeProperties, subscribePayments, subscribeMaintenance, addMaintenance, updateMaintenance, subscribeUnits, addUnit, updateUnit, deleteUnit, clearUnitRequestNotifications, updateProperty } from '../services/firebase';
import { createTenancy, terminateActiveLeasesForUnit, getActiveTenancy } from '../services/tenancy';
import { cancelPendingInvoices } from '../services/invoices';
import { generateInvoicePdf } from '../utils/invoicePdf';
import { formatUnitDisplay } from '../utils/unitDisplay';
import PaymentRow from '../components/PaymentRow';
import Modal from '../components/Modal';
import UnitCard from '../components/UnitCard';
import AddUnitModal from '../components/AddUnitModal';
import { createInviteToken } from '../services/inviteTokens';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'units', label: 'Units', icon: DoorOpen },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.3, ease: "easeOut" },
});

export default function PropertyDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { fmt, fmtRent, currencySymbol, country } = useLocale();

  const [property, setProperty] = useState(null);
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [units, setUnits] = useState([]);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'units');
  const [loading, setLoading] = useState(true);

  // Maintenance modal
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [maintForm, setMaintForm] = useState({ title: '', description: '', priority: 'medium' });
  const setM = k => e => setMaintForm(f => ({ ...f, [k]: e.target.value }));

  // Unit modals
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitSaving, setUnitSaving] = useState(false);

  // Deletion state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState(null);
  const [showPropDeleteConfirm, setShowPropDeleteConfirm] = useState(false);

  // Remove tenant confirm
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeUnit, setRemoveUnit] = useState(null);

  // Property invite link state
  const [propertyInviteLink, setPropertyInviteLink] = useState(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [portalLinkCopied, setPortalLinkCopied] = useState(false);

  // Settings tab state
  const [rentSetting, setRentSetting] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const u1 = subscribeProperties(user.uid, props => {
      const p = props.find(x => x.id === id);
      setProperty(p || null);
      if (p) setRentSetting(p.RentPrice?.toString() || '');
      setLoading(false);
    });
    const u2 = subscribePayments(user.uid, id, setPayments);
    const u3 = subscribeMaintenance(user.uid, id, setMaintenance);
    const u4 = subscribeUnits(user.uid, id, setUnits);
    return () => { u1(); u2(); u3(); u4(); };
  }, [user, id]);

  useEffect(() => {
    if (searchParams.get('action') === 'add' && !loading) {
      setEditingUnit(null);
      setShowAddUnit(true);
    }
  }, [loading, searchParams]);

  const handleAddMaint = async (e) => {
    e.preventDefault();
    if (!maintForm.title) { toast.error('Title is required.'); return; }
    setSaving(true);
    try {
      await addMaintenance(user.uid, id, maintForm);
      toast.success('Ticket logged!');
      setShowMaintModal(false);
      setMaintForm({ title: '', description: '', priority: 'medium' });
    } catch { toast.error('Failed to save.'); }
    finally { setSaving(false); }
  };

  const cycleStatus = async (ticket) => {
    const next = ticket.status === 'open' ? 'in-progress' : ticket.status === 'in-progress' ? 'resolved' : 'open';
    await updateMaintenance(user.uid, id, ticket.id, { status: next });
    toast.success(`Status updated → ${next}`);
  };

  const handleAddOrEditUnit = async (data) => {
    setUnitSaving(true);
    try {
      if (editingUnit) {
        await updateUnit(user.uid, id, editingUnit.id, data);
        toast.success('Unit saved!');
      } else {
        await addUnit(user.uid, id, data);
        toast.success('Unit added successfully!');
      }
      setShowAddUnit(false);
      setEditingUnit(null);
    } catch { toast.error('System error. Try again.'); }
    finally { setUnitSaving(false); }
  };

  const handleGeneratePropertyInvite = async () => {
    setGeneratingInvite(true);
    try {
      const { link } = await createInviteToken({
        landlordUid: user.uid,
        propertyId: id,
        propertyName: property?.name || '',
      });
      setPropertyInviteLink(link);
      toast.success('Portal link ready!');
    } catch (err) { toast.error('Failed to generate.'); }
    finally { setGeneratingInvite(false); }
  };

  const handleUpdateRentPrice = async () => {
    setSettingsSaving(true);
    try {
      await updateProperty(user.uid, id, { RentPrice: rentSetting ? Number(rentSetting) : null });
      toast.success('Default settings updated!');
    } catch { toast.error('Update failed.'); }
    finally { setSettingsSaving(false); }
  };

  const handleOpenEdit = (unit) => {
    setEditingUnit(unit);
    setShowAddUnit(true);
  };

  const handleOpenRemove = (unit) => {
    setRemoveUnit(unit);
    setShowRemoveConfirm(true);
  };

  const handleOpenDelete = (unit) => {
    setUnitToDelete(unit);
    setShowDeleteConfirm(true);
  };

  const handleDeleteUnit = async () => {
    if (!unitToDelete) return;
    setUnitSaving(true);
    try {
      await deleteUnit(user.uid, id, unitToDelete.id);
      toast.success('Unit removed from registry.');
      setShowDeleteConfirm(false);
      setUnitToDelete(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete unit.');
    } finally {
      setUnitSaving(false);
    }
  };

  const handleDeleteProperty = async () => {
    setSaving(true);
    try {
      await deleteProperty(user.uid, id, property?.id);
      toast.success('Property deleted!');
      navigate('/properties');
    } catch (err) {
      toast.error(err.message || 'Failed to delete property.');
    } finally {
      setSaving(false);
      setShowPropDeleteConfirm(false);
    }
  };

  const handleMoveOutTenant = async () => {
    if (!removeUnit) return;
    setUnitSaving(true);
    try {
      const activeTenancy = await getActiveTenancy(user.uid, id, removeUnit.id);
      if (activeTenancy) {
        await terminateActiveLeasesForUnit(user.uid, id, removeUnit.id);
        await cancelPendingInvoices(user.uid, activeTenancy.id);
      }
      await updateUnit(user.uid, id, removeUnit.id, {
        tenantId: null, tenantName: '', tenantEmail: '', status: 'vacant',
        rentStatus: null,
      });
      toast.success(`Tenant moved out. Unit is now vacant.`);
      setShowRemoveConfirm(false);
      setRemoveUnit(null);
    } catch (err) { toast.error('Error terminating lease.'); }
    finally { setUnitSaving(false); }
  };

  const handleApproveRequest = async (unit) => {
    setUnitSaving(true);
    try {
      await updateUnit(user.uid, id, unit.id, {
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
        propertyId: id,
        unitId: unit.id,
        tenantName: unit.pendingTenantName || '',
        tenantEmail: unit.pendingTenantEmail || '',
        unitName: unit.name || '',
        propertyName: property?.name || '',
        address: property?.address || '',
        rentAmount: unit.rentAmount || 0,
        billingCycle: unit.billingCycle || 'monthly',
        currency: country?.currency || 'NGN',
        welcomeMessageSent: true,
        welcomeMessageDate: new Date(),
      });
      await clearUnitRequestNotifications(user.uid, id, unit.id, unit.pendingTenantId);
      toast.success('Tenant approved!');
    } catch (err) { toast.error('Approval failed.'); }
    finally { setUnitSaving(false); }
  };

  const handleDeclineRequest = async (unit) => {
    setUnitSaving(true);
    try {
      await updateUnit(user.uid, id, unit.id, {
        status: 'vacant',
        pendingTenantId: null,
        pendingTenantName: null,
        pendingTenantEmail: null,
        pendingRequestedAt: null,
      });
      await clearUnitRequestNotifications(user.uid, id, unit.id, unit.pendingTenantId);
      toast.success('Request declined.');
    } catch (err) { toast.error('Declined failed.'); }
    finally { setUnitSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="w-8 h-8 border-3 border-[#1a6a3c] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!property) return (
    <div className="text-center py-20">
      <p className="text-[#94a3a8] font-bold italic tracking-wide">Property archive not found.</p>
      <Link to="/properties" className="btn-secondary mt-6">← Back to Portfolio</Link>
    </div>
  );

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const occupiedCount = units.filter(u => u.status === 'occupied').length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-slide-up">
      {/* Page Navigation */}
      <motion.div {...fadeUp(0)}>
        <Link to="/properties" className="inline-flex items-center gap-2 text-xs font-bold text-[#6b8a7a] hover:text-[#1a6a3c] transition-colors mb-6 uppercase tracking-widest">
          <ArrowLeft size={16} strokeWidth={3} /> Return to Portfolio
        </Link>

        {/* Hero Card */}
        <div className="card overflow-hidden bg-white border-[#f0f7f2] shadow-xl relative">
          <div className="h-1.5 w-full bg-[#1a6a3c]" />
          <div className="p-8 sm:p-10 flex flex-col lg:flex-row items-start justify-between gap-10">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-4">
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${property.status === 'occupied' ? 'bg-[#e8f5ee] border-[#ddf0e6] text-[#1a6a3c]' : 'bg-[#fef9ed] border-[#f5e0b8] text-[#c8691a]'}`}>
                  {property.status}
                </div>
                {property.type && <span className="text-[10px] font-black text-[#94a3a8] uppercase tracking-widest px-3 py-1 bg-[#f4fbf7] rounded-lg border border-[#f0f7f2]">{property.type}</span>}
              </div>

              <h1 className="font-fraunces text-[#1a2e22] text-4xl font-black mb-4 tracking-tight leading-tight italic">
                {property.name}
              </h1>

              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[#6b8a7a] font-semibold text-sm">
                  <MapPin size={16} className="text-[#cce8d8]" />
                  {property.address}
                </div>
                {property.unitNumber && (
                  <div className="flex items-center gap-2 text-[#1a6a3c] font-bold text-xs uppercase tracking-wider">
                    <Hash size={14} strokeWidth={3} /> {property.unitNumber}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-6 p-6 bg-[#fcfdfc] rounded-[2rem] border border-[#f0f7f2] flex-shrink-0 w-full lg:w-80">
              <HeroStat label="Valuation" value={fmtRent(property.monthlyRent, property.rentType)} accent color="#1a6a3c" />
              <HeroStat label="Occupancy" value={`${occupiedCount}/${units.length}`} accent color="#c8691a" />
              <HeroStat label="Collected" value={fmt(totalPaid)} />
              <HeroStat label="Active Units" value={units.length} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

        {/* Navigation Rail */}
        <div className="lg:col-span-3">
          <div className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 h-fit sticky top-24">
            {TABS.map(({ id: tid, label, icon: Icon }) => (
              <button
                key={tid}
                onClick={() => setActiveTab(tid)}
                className={`flex items-center gap-3 px-5 py-4 rounded-2xl text-sm font-bold transition-all whitespace-nowrap border-2 ${activeTab === tid
                  ? 'bg-[#1a3c2e] text-white border-[#1a3c2e] shadow-lg transform scale-[1.02]'
                  : 'bg-white text-[#6b8a7a] border-[#f0f7f2] hover:border-[#1a6a3c]/30 hover:text-[#1a6a3c]'}`}
              >
                <Icon size={18} strokeWidth={activeTab === tid ? 2.5 : 2} />
                {label}
                {tid === 'units' && units.length > 0 && (
                  <span className={`ml-auto px-2 py-0.5 rounded-lg text-[10px] font-black ${activeTab === tid ? 'bg-white/20 text-white' : 'bg-[#f4fbf7] text-[#1a6a3c]'}`}>
                    {units.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9 animate-fade-in">

          {/* Units Tab */}
          {activeTab === 'units' && (
            <div className="space-y-8">
              {/* Building Portal Link */}
              <div className="card p-8 bg-gradient-to-br from-[#1a3c2e] to-[#2d6a4f] text-white overflow-hidden relative group">
                <div className="absolute top-[-40px] right-[-40px] opacity-[0.1] transform rotate-12 transition-transform group-hover:rotate-45 duration-700">
                  <DoorOpen size={200} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                      <Link2 size={28} />
                    </div>
                    <div>
                      <h3 className="font-fraunces text-xl font-bold italic mb-1">Building Access Portal</h3>
                      <p className="text-white/70 text-sm font-medium">Allow prospects to self-join vacant units in this complex.</p>
                    </div>
                  </div>

                  <div className="w-full md:w-auto">
                    {propertyInviteLink ? (
                      <div className="flex items-center gap-2 bg-white rounded-2xl p-1.5 pl-4 shadow-2xl">
                        <span className="font-mono text-xs text-[#1a3c2e] truncate max-w-[180px] font-bold">{propertyInviteLink}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(propertyInviteLink);
                            setPortalLinkCopied(true);
                            setTimeout(() => setPortalLinkCopied(false), 2000);
                          }}
                          className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${portalLinkCopied ? 'bg-[#1a3c2e] text-white' : 'bg-[#e8f5ee] text-[#1a6a3c] hover:bg-[#1a6a3c] hover:text-white'}`}
                        >
                          {portalLinkCopied ? <><Check size={14} /> Copied</> : 'Copy Link'}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleGeneratePropertyInvite}
                        disabled={generatingInvite}
                        className="bg-white text-[#1a3c2e] font-black text-xs uppercase tracking-widest px-8 py-4 rounded-xl hover:bg-[#f4fbf7] active:scale-95 transition-all shadow-xl disabled:opacity-50"
                      >
                        {generatingInvite ? 'Initializing...' : 'Generate Portal Link'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Units List Header */}
              <div className="flex items-center justify-between px-2">
                <h3 className="font-fraunces text-[#1a2e22] text-xl font-black italic">Complex Units</h3>
                <button
                  onClick={() => { setEditingUnit(null); setShowAddUnit(true); }}
                  className="btn-primary text-xs px-4"
                >
                  <Plus size={16} strokeWidth={3} /> Add New Unit
                </button>
              </div>

              {/* Join Requests */}
              {(() => {
                const pending = units.filter(u => u.status === 'pending_approval' && !!u.pendingTenantId);
                if (pending.length === 0) return null;
                return (
                  <div className="space-y-4">
                    {pending.map(unit => (
                      <div key={unit.id} className="card p-6 border-[#f5e0b8] bg-[#fef9ed]/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#c8691a]/5 rounded-full blur-3xl" />
                        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#fef9ed] border border-[#f5e0b8] flex items-center justify-center text-[#c8691a]">
                              <UserCheck size={24} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black text-[#c8691a] uppercase tracking-widest mb-1">New Resident Request</p>
                              <h4 className="font-fraunces font-black text-[#1a2e22] text-lg truncate">
                                {unit.pendingTenantName || 'Candidate'} → {unit.name}
                              </h4>
                              <p className="text-[#6b8a7a] text-xs font-semibold mt-1 italic">{unit.pendingTenantEmail}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 w-full md:w-auto">
                            <button onClick={() => handleDeclineRequest(unit)} className="flex-1 btn-secondary py-3 text-xs font-black uppercase text-[#e74c3c] border-[#fee2e2]">Decline</button>
                            <button onClick={() => handleApproveRequest(unit)} className="flex-1 btn-primary py-3 text-xs bg-[#1a6a3c] shadow-lg shadow-[#1a6a3c]/20">Approve Access</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {units.length === 0 ? (
                <div className="card p-20 flex flex-col items-center text-center border-dashed border-2 border-[#ddf0e6] bg-[#fcfdfc]/50">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-[#cce8d8] mb-4 border border-[#f0f7f2]">
                    <DoorOpen size={32} />
                  </div>
                  <p className="font-fraunces text-[#1a2e22] text-lg font-black italic">No individual units</p>
                  <p className="text-[#6b8a7a] text-sm font-medium mt-1">Start by adding apartments or floor plans to this property.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AnimatePresence mode="popLayout">
                    {units.map(unit => (
                      <UnitCard
                        key={unit.id}
                        unit={unit}
                        fmtRent={fmtRent}
                        landlordUid={user.uid}
                        propertyId={id}
                        propertyName={property?.name || ''}
                        onRemove={handleOpenRemove}
                        onEdit={handleOpenEdit}
                        onDelete={handleOpenDelete}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-fraunces text-[#1a2e22] text-xl font-black italic">Ledger Registry</h3>
                <span className="text-[10px] font-black text-[#94a3a8] uppercase tracking-widest">{payments.length} Records</span>
              </div>
              {payments.length === 0 ? (
                <div className="card p-20 flex flex-col items-center text-center bg-[#fcfdfc]/50">
                  <CreditCard size={48} className="text-[#cce8d8] mb-4" />
                  <p className="font-fraunces text-[#1a2e22] text-lg font-black italic">Empty Ledger</p>
                  <p className="text-[#6b8a7a] text-sm font-medium">Online rent payments will automatically appear in this transaction list.</p>
                </div>
              ) : (
                <div className="card overflow-hidden shadow-xl border-[#f0f7f2]">
                  {payments.map((p, i) => (
                    <PaymentRow key={p.id} payment={p} isLast={i === payments.length - 1} onDownloadInvoice={generateInvoicePdf} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Maintenance Tab */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-fraunces text-[#1a2e22] text-xl font-black italic">Service Tickets</h3>
                <button onClick={() => setShowMaintModal(true)} className="btn-primary text-xs px-4"><Plus size={16} strokeWidth={3} /> Issue Ticket</button>
              </div>

              {maintenance.length === 0 ? (
                <div className="card p-20 flex flex-col items-center text-center bg-[#fcfdfc]/50">
                  <Wrench size={48} className="text-[#cce8d8] mb-4" />
                  <p className="font-fraunces text-[#1a2e22] text-lg font-black italic">All Systems Clear</p>
                  <p className="text-[#6b8a7a] text-sm font-medium">No active maintenance issues or repair requests for this property.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {maintenance.map((m, i) => (
                    <motion.div key={m.id} {...fadeUp(i * 0.05)} className="card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:border-[#1a6a3c]/30 hover:shadow-lg transition-all">
                      <div className="flex items-start gap-4">
                        <div className={`mt-1.5 w-3 h-3 rounded-full flex-shrink-0 shadow-sm ${m.status === 'resolved' ? 'bg-[#1a6a3c]' : m.status === 'in-progress' ? 'bg-[#c8691a]' : 'bg-[#e74c3c]'} border-2 border-white ring-2 ring-transparent group-hover:ring-emerald-50`} />
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-bold text-[#1a2e22]">{m.title}</h4>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${m.priority === 'high' ? 'bg-[#fff5f5] text-[#e74c3c]' : m.priority === 'medium' ? 'bg-[#fef9ed] text-[#c8691a]' : 'bg-[#f4fbf7] text-[#1a6a3c]'}`}>
                              {m.priority}
                            </span>
                          </div>
                          <p className="text-sm text-[#6b8a7a] font-medium italic mb-2">{m.description}</p>
                          <div className="flex items-center gap-4 text-[10px] font-bold text-[#94a3a8] tracking-wider uppercase">
                            <span className="flex items-center gap-1.5"><Calendar size={12} /> {m.createdAt ? format(m.createdAt.toDate?.() ?? new Date(m.createdAt), 'MMM d, yyyy') : 'No Date'}</span>
                            <span className="flex items-center gap-1.5"><Activity size={12} /> ID: #{m.id.slice(-4).toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => cycleStatus(m)} className={`btn-secondary py-2 px-4 text-xs font-black uppercase tracking-widest flex items-center gap-2 group ${m.status === 'resolved' ? 'bg-[#1a6a3c] text-white border-[#1a6a3c]' : ''}`}>
                        {m.status === 'resolved' ? <Check size={14} strokeWidth={3} /> : <ChevronDown size={14} strokeWidth={3} className="group-hover:translate-y-0.5 transition-transform" />}
                        {m.status.replace('-', ' ')}
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl space-y-8">
              <h3 className="font-fraunces text-[#1a2e22] text-xl font-black italic">Property Configuration</h3>

              <div className="card p-10 bg-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-[#1a6a3c]" />
                <div className="relative z-10">
                  <h4 className="font-fraunces text-lg font-bold text-[#1a2e22] mb-2 flex items-center gap-2">
                    <CreditCard size={20} className="text-[#1a6a3c]" />
                    Financial Standards
                  </h4>
                  <p className="text-sm text-[#6b8a7a] font-medium leading-relaxed mb-8">
                    Configure the default rent base for this property. This value serves as a preset for all new units initialized within the building.
                  </p>

                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-[#94a3a8] uppercase tracking-widest mb-3 block">Base Rent Valuation</label>
                      <div className="flex gap-4">
                        <div className="relative flex-1">
                          <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#1a6a3c] font-black text-sm">
                            {currencySymbol}
                          </div>
                          <input
                            type="number"
                            className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-2xl pl-12 pr-5 py-5 text-[#1a2e22] font-black text-xl focus:ring-4 focus:ring-[#1a6a3c]/5 focus:border-[#1a6a3c] transition-all"
                            placeholder="0.00"
                            value={rentSetting}
                            onChange={e => setRentSetting(e.target.value)}
                          />
                        </div>
                        <button
                          onClick={handleUpdateRentPrice}
                          disabled={settingsSaving}
                          className="btn-primary px-10 shadow-xl"
                        >
                          {settingsSaving ? <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" /> : 'Commit Update'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 rounded-3xl bg-[#fff5f5] border border-[#fee2e2]">
                <h4 className="text-[10px] font-black text-[#e74c3c] uppercase tracking-widest mb-2">Danger Zone</h4>
                <p className="text-sm text-[#94a3a8] font-medium mb-4 italic">Archiving or removing a property cannot be undone once confirmed.</p>
                <button
                  onClick={() => setShowPropDeleteConfirm(true)}
                  className="text-sm font-black text-[#e74c3c] hover:underline flex items-center gap-2"
                >
                  Permanently Delete Property <Trash2 size={14} strokeWidth={3} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Persistence Modals */}
      <Modal isOpen={showMaintModal} onClose={() => setShowMaintModal(false)} title="Issue New Service Ticket" size="md">
        <form onSubmit={handleAddMaint} className="space-y-8 p-2">
          <div>
            <label className="text-[10px] font-black text-[#94a3a8] uppercase tracking-widest mb-2 block">Ticket Subject *</label>
            <input
              className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-2xl px-5 py-4 text-[#1a2e22] font-semibold text-sm focus:ring-2 focus:ring-[#1a6a3c]/10 focus:border-[#1a6a3c] transition-all"
              placeholder="e.g. Electrical fault in Unit 4B"
              value={maintForm.title}
              onChange={setM('title')}
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-[#94a3a8] uppercase tracking-widest mb-2 block">Maintenance Details</label>
            <textarea
              className="w-full bg-[#f4fbf7] border border-[#ddf0e6] rounded-2xl px-5 py-4 text-[#1a2e22] font-semibold text-sm h-32 resize-none transition-all"
              placeholder="Provide specific details for the maintenance team..."
              value={maintForm.description}
              onChange={setM('description')}
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-[#94a3a8] uppercase tracking-widest mb-3 block">Urgency Status</label>
            <div className="grid grid-cols-3 gap-3">
              {['low', 'medium', 'high'].map(p => (
                <button type="button" key={p} onClick={() => setMaintForm(f => ({ ...f, priority: p }))}
                  className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all
                      ${maintForm.priority === p
                      ? p === 'high' ? 'bg-[#e74c3c] text-white border-[#e74c3c] shadow-lg' : p === 'medium' ? 'bg-[#c8691a] text-white border-[#c8691a] shadow-lg' : 'bg-[#1a6a3c] text-white border-[#1a6a3c] shadow-lg'
                      : 'bg-white text-[#6b8a7a] border-[#f0f7f2] hover:bg-[#f4fbf7]'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button type="submit" disabled={saving} className="flex-1 btn-primary py-4 text-base order-1 sm:order-2">
              {saving ? <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" /> : 'Register Ticket'}
            </button>
            <button type="button" onClick={() => setShowMaintModal(false)} className="flex-1 btn-secondary py-4 text-base order-2 sm:order-1">Disregard</button>
          </div>
        </form>
      </Modal>

      <AddUnitModal
        isOpen={showAddUnit}
        onClose={() => { setShowAddUnit(false); setEditingUnit(null); }}
        onSubmit={handleAddOrEditUnit}
        saving={unitSaving}
        editUnit={editingUnit}
        currencySymbol={currencySymbol}
        defaultRent={property?.RentPrice || ''}
      />

      <Modal isOpen={showRemoveConfirm} onClose={() => setShowRemoveConfirm(false)} title="Registry Termination" size="sm">
        <div className="p-2 space-y-6">
          <div className="p-6 rounded-[2rem] bg-[#fff5f5] border border-[#fee2e2] text-center">
            <div className="w-16 h-16 bg-white border border-[#fee2e2] rounded-3xl mx-auto flex items-center justify-center text-[#e74c3c] mb-4 shadow-sm">
              <UserMinus size={32} />
            </div>
            <h4 className="font-fraunces text-[#1a2e22] text-xl font-black italic mb-2">Move Out Tenant?</h4>
            <p className="text-sm text-[#94a3a8] font-medium leading-relaxed">
              Confirming this will move <span className="text-[#1a2e22] font-black">{removeUnit?.tenantName || 'Resident'}</span> from <span className="text-[#1a2e22] font-black">{removeUnit?.name}</span>. Historical data remains protected.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={handleMoveOutTenant} disabled={unitSaving} className="w-full btn-danger py-4 text-sm font-black uppercase tracking-widest shadow-xl">
              {unitSaving ? 'Processing...' : 'Confirm Termination'}
            </button>
            <button onClick={() => setShowRemoveConfirm(false)} className="w-full btn-secondary py-4 text-sm font-black uppercase tracking-widest border-transparent hover:bg-gray-100">Disregard</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Registry Deletion" size="sm">
        <div className="p-2 space-y-6">
          <div className="p-6 rounded-[2rem] bg-[#fff5f5] border border-[#fee2e2] text-center">
            <div className="w-16 h-16 bg-white border border-[#fee2e2] rounded-3xl mx-auto flex items-center justify-center text-[#e74c3c] mb-4 shadow-sm">
              <Trash2 size={32} />
            </div>
            <h4 className="font-fraunces text-[#1a2e22] text-xl font-black italic mb-2">Delete Unit?</h4>
            <p className="text-sm text-[#94a3a8] font-medium leading-relaxed">
              Are you sure you want to delete <span className="text-[#1a2e22] font-black">{unitToDelete?.name}</span>? This action is permanent and only possible for unoccupied units.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={handleDeleteUnit} disabled={unitSaving} className="w-full btn-danger py-4 text-sm font-black uppercase tracking-widest shadow-xl">
              {unitSaving ? 'Deleting...' : 'Delete Permanently'}
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} className="w-full btn-secondary py-4 text-sm font-black uppercase tracking-widest border-transparent hover:bg-gray-100">Cancel</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showPropDeleteConfirm} onClose={() => setShowPropDeleteConfirm(false)} title="Final Confirmation" size="sm">
        <div className="p-2 space-y-6">
          <div className="p-6 rounded-[2rem] bg-[#fff5f5] border border-[#fee2e2] text-center">
            <div className="w-16 h-16 bg-white border border-[#fee2e2] rounded-3xl mx-auto flex items-center justify-center text-[#e74c3c] mb-4 shadow-sm">
              <Trash2 size={32} />
            </div>
            <h4 className="font-fraunces text-[#1a2e22] text-xl font-black italic mb-2">Delete Property?</h4>
            <p className="text-sm text-[#6b8a7a] font-medium leading-relaxed">
              Are you sure you want to delete <span className="text-[#1a2e22] font-black">{property?.name}</span>? This action is permanent and cannot be undone. All units and data associated will be removed.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={handleDeleteProperty} disabled={saving} className="w-full btn-danger py-4 text-sm font-black uppercase tracking-widest shadow-xl">
              {saving ? 'Deleting...' : 'Confirm Deletion'}
            </button>
            <button onClick={() => setShowPropDeleteConfirm(false)} className="w-full btn-secondary py-4 text-sm font-black uppercase tracking-widest border-transparent hover:bg-gray-100">Disregard</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function HeroStat({ label, value, accent, color }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[9px] font-black text-[#94a3a8] uppercase tracking-[0.2em]">{label}</p>
      <p className={`font-fraunces text-2xl font-black italic leading-none truncate ${accent ? '' : 'text-[#1a2e22]'}`} style={accent ? { color } : {}}>
        {value}
      </p>
    </div>
  );
}
