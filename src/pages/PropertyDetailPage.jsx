// src/pages/PropertyDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Bed, Bath, MapPin, User, Mail, Phone, Plus, Wrench, CreditCard, Info, ChevronDown, Hash, Building2, DoorOpen, UserMinus, Link2, Copy, Check, UserCheck, AlertCircle, Loader2, Settings, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeProperties, subscribePayments, subscribeMaintenance, addMaintenance, updateMaintenance, subscribeUnits, addUnit, updateUnit, deleteUnit, clearUnitRequestNotifications, updateProperty } from '../services/firebase';
import { createTenancy, terminateActiveLeasesForUnit, getActiveTenancy } from '../services/tenancy';
import { cancelPendingInvoices } from '../services/invoices';
import { generateInvoicePdf } from '../utils/invoicePdf';
import { formatUnitDisplay, getShortUnitId } from '../utils/unitDisplay';
import StatusBadge from '../components/StatusBadge';
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

export default function PropertyDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
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

  // Unit modals
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitSaving, setUnitSaving] = useState(false);

  // Remove tenant / Delete unit confirm
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeUnit, setRemoveUnit] = useState(null);
  const [isDeletingUnit, setIsDeletingUnit] = useState(false);

  // Portal link copied state
  const [portalLinkCopied, setPortalLinkCopied] = useState(false);

  // Settings tab state
  const [rentSetting, setRentSetting] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);

  // ── Subscriptions ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const u1 = subscribeProperties(user.uid, props => {
      const p = props.find(x => x.id === id);
      setProperty(p || null);
      if (p) {
        setRentSetting(p.RentPrice?.toString() || '');
      }
      setLoading(false);
    });
    const u2 = subscribePayments(user.uid, id, setPayments);
    const u3 = subscribeMaintenance(user.uid, id, setMaintenance);
    const u4 = subscribeUnits(user.uid, id, setUnits);
    return () => { u1(); u2(); u3(); u4(); };
  }, [user, id]);

  // Auto-open Add Unit modal when deep-linked
  useEffect(() => {
    if (searchParams.get('action') === 'add' && !loading) {
      setEditingUnit(null);
      setShowAddUnit(true);
    }
  }, [loading, searchParams]);

  // ── Maintenance handlers ──────────────────────────────────────────────
  const setM = k => e => setMaintForm(f => ({ ...f, [k]: e.target.value }));

  const handleAddMaint = async (e) => {
    e.preventDefault();
    if (!maintForm.title) { toast.error('Title is required.'); return; }
    setSaving(true);
    try {
      await addMaintenance(user.uid, id, maintForm);
      toast.success('Issue logged!');
      setShowMaintModal(false);
      setMaintForm({ title: '', description: '', priority: 'medium' });
    } catch { toast.error('Failed to save.'); }
    finally { setSaving(false); }
  };

  const cycleStatus = async (ticket) => {
    const next = ticket.status === 'open' ? 'in-progress' : ticket.status === 'in-progress' ? 'resolved' : 'open';
    await updateMaintenance(user.uid, id, ticket.id, { status: next });
    toast.success(`Status updated to ${next}`);
  };

  // ── Unit handlers ─────────────────────────────────────────────────────
  const handleAddOrEditUnit = async (data) => {
    setUnitSaving(true);
    try {
      if (editingUnit) {
        await updateUnit(user.uid, id, editingUnit.id, data);
        toast.success('Unit updated!');
      } else {
        await addUnit(user.uid, id, data);
        toast.success('Unit added!');
      }
      setShowAddUnit(false);
      setEditingUnit(null);
    } catch { toast.error('Failed to save unit.'); }
    finally { setUnitSaving(false); }
  };

  const portalUrl = `${window.location.origin}/portal/${id}`;

  const handleUpdateRentPrice = async () => {
    setSettingsSaving(true);
    try {
      await updateProperty(user.uid, id, { RentPrice: rentSetting ? Number(rentSetting) : null });
      toast.success('Default rent updated!');
    } catch {
      toast.error('Failed to update default rent.');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleOpenEdit = (unit) => {
    setEditingUnit(unit);
    setShowAddUnit(true);
  };

  const handleOpenRemove = (unit, isDelete = false) => {
    setRemoveUnit(unit);
    setIsDeletingUnit(isDelete);
    setShowRemoveConfirm(true);
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
      toast.success(`Lease terminated. ${removeUnit.unitName || 'Unit'} is now vacant.`);
      setShowRemoveConfirm(false);
      setRemoveUnit(null);
    } catch (err) { console.error(err); toast.error('Failed to move out tenant.'); }
    finally { setUnitSaving(false); }
  };

  const handleDeleteUnit = async () => {
    if (!removeUnit) return;
    setUnitSaving(true);
    try {
      await deleteUnit(user.uid, id, removeUnit.id);
      toast.success(`${removeUnit.name || 'Unit'} has been decommissioned.`);
      setShowRemoveConfirm(false);
      setRemoveUnit(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to delete unit.');
    }
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
      toast.success(`${unit.pendingTenantName || 'Tenant'} approved!`);
    } catch (err) { console.error(err); toast.error('Failed to approve request.'); }
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
      toast.success(`Request declined.`);
    } catch (err) { console.error(err); toast.error('Failed to decline request.'); }
    finally { setUnitSaving(false); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96">
      <Loader2 size={40} className="text-[#52b788] animate-spin mb-4" />
      <p className="font-body text-[#4a5568] text-sm uppercase tracking-widest font-bold">Synchronizing Data...</p>
    </div>
  );

  if (!property) return (
    <div className="text-center py-20 bg-[#0d1215] border border-[#1e2a2e] rounded-3xl mt-10">
      <p className="font-body text-[#4a5568] mb-6">Property record not found.</p>
      <Link to="/properties" className="btn-secondary px-8 flex items-center gap-2 mx-auto w-fit">
        <ArrowLeft size={16} /> Back to Properties
      </Link>
    </div>
  );

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);
  const activeIssues = maintenance.filter(m => m.status !== 'resolved').length;

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/properties" className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#4a5568] hover:text-[#52b788] mb-6 transition-all">
          <ArrowLeft size={16} /> All Properties
        </Link>

        {/* Hero Section */}
        <div className="card overflow-hidden bg-[#0d1215] border-[#1e2a2e] relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#1a3c2e] via-[#52b788] to-transparent opacity-50" />

          <div className="p-8 relative">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <StatusBadge status={property.status} />
                  {property.buildingName && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#141b1e] border border-[#1e2a2e] text-[10px] font-bold text-[#e8e4de] uppercase tracking-wider">
                      <Building2 size={12} className="text-[#52b788]" />
                      {property.buildingName}
                    </div>
                  )}
                </div>

                <h1 className="font-display text-[#e8e4de] text-4xl sm:text-5xl font-bold tracking-tight mb-4 leading-tight">
                  {property.name}
                </h1>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-[#4a5568]">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-[#52b788]" />
                    <span className="font-body text-sm font-medium">{property.address}</span>
                  </div>
                  {property.unitNumber && (
                    <div className="flex items-center gap-2 border-l border-[#1e2a2e] pl-4">
                      <Hash size={16} className="text-[#52b788]" />
                      <span className="font-body text-sm font-bold text-[#e8e4de]">{formatUnitDisplay(property)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-12 border-t lg:border-t-0 lg:border-l border-[#1e2a2e] pt-8 lg:pt-0 lg:pl-12">
                <Stat label="Rent" value={fmtRent(property.monthlyRent, property.rentType)} accent />
                <Stat label="Capacity" value={`${units.length} Units`} />
                <Stat label="Collected" value={fmt(totalPaid)} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="mt-10 flex gap-1 p-1 bg-[#0d1215] border border-[#1e2a2e] rounded-2xl w-fit overflow-x-auto no-scrollbar">
          {TABS.map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              onClick={() => setActiveTab(tid)}
              className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all whitespace-nowrap
                ${activeTab === tid
                  ? 'bg-[#1a3c2e] text-[#52b788] shadow-sm'
                  : 'text-[#4a5568] hover:bg-[#141b1e] hover:text-[#8a9ba8]'}`}
            >
              <Icon size={15} />
              <span>{label}</span>
              {tid === 'units' && units.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-[#1e2a2e] text-[#52b788] text-[9px] border border-[#2d6a4f]/20">
                  {units.length}
                </span>
              )}
              {tid === 'maintenance' && activeIssues > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-md bg-[#2d1a1a] text-[#e74c3c] text-[9px] border border-[#3d2020]/20 animate-pulse">
                  {activeIssues}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {/* ── Units Tab ────────────────────────────────────────── */}
          {activeTab === 'units' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Portal Access Card */}
              <div className="p-8 rounded-[32px] bg-gradient-to-br from-[#1a3c2e]/10 to-[#0d1215] border border-[#2d6a4f]/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#52b788]/5 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-[#52b788]/10 transition-colors" />

                <div className="relative flex flex-col xl:flex-row items-start xl:items-center justify-between gap-8">
                  <div className="flex items-start gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center flex-shrink-0 text-[#52b788]">
                      <Link2 size={28} />
                    </div>
                    <div>
                      <h3 className="font-display text-[#e8e4de] text-xl font-bold mb-1 tracking-tight">Building Access Link</h3>
                      <p className="font-body text-[#4a5568] text-sm max-w-md font-medium">
                        Share this master link with prospective tenants. It allows them to view all vacant units in this building and apply directly.
                      </p>
                    </div>
                  </div>

                  <div className="w-full xl:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex items-center gap-3 bg-[#141b1e] border border-[#1e2a2e] rounded-2xl p-2 pl-5 shadow-sm">
                      <span className="font-mono text-[11px] text-[#4a5568] truncate max-w-[240px]">{portalUrl}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(portalUrl);
                          setPortalLinkCopied(true);
                          setTimeout(() => setPortalLinkCopied(false), 2000);
                        }}
                        className={`flex-shrink-0 flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${portalLinkCopied ? 'bg-[#52b788] text-white' : 'bg-[#1a3c2e] text-[#52b788] hover:bg-[#2d6a4f]'
                          }`}
                      >
                        {portalLinkCopied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy Link</>}
                      </button>
                    </div>
                    <a
                      href={portalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl border border-[#1e2a2e] text-[#4a5568] hover:text-[#e8e4de] hover:bg-[#141b1e] transition-all"
                    >
                      <ExternalLink size={18} />
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between px-2">
                <div>
                  <h3 className="font-display text-[#e8e4de] text-lg font-bold tracking-tight">Managed Units</h3>
                  <p className="font-body text-[11px] text-[#4a5568] font-bold uppercase tracking-[0.15em] mt-1">
                    {units.length} total · {units.filter(u => u.status === 'occupied').length} occupied
                  </p>
                </div>
                <button
                  onClick={() => { setEditingUnit(null); setShowAddUnit(true); }}
                  className="btn-secondary text-[11px] font-bold uppercase tracking-wider px-5"
                >
                  <Plus size={14} /> Add Apartment
                </button>
              </div>

              {/* Join Requests */}
              {(() => {
                const pending = units.filter(u => u.status === 'pending_approval' && !!u.pendingTenantId);
                if (pending.length === 0) return null;
                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[#f0c040]">
                      <AlertCircle size={15} />
                      <p className="font-body text-[10px] font-bold uppercase tracking-widest">
                        Pending Admissions ({pending.length})
                      </p>
                    </div>
                    {pending.map(unit => (
                      <div key={unit.id} className="card p-6 bg-[#0d1215] border-2 border-[#3d3215]/50 animate-pulse-subtle bg-gradient-to-r from-[#2d2510]/10 to-transparent">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#2d2510] border border-[#3d3215] flex items-center justify-center flex-shrink-0">
                              <User size={20} className="text-[#f0c040]" />
                            </div>
                            <div>
                              <p className="font-body text-[#e8e4de] font-bold text-base tracking-tight leading-tight mb-1">
                                {unit.pendingTenantName || 'Prospective Tenant'}
                              </p>
                              <p className="font-body text-xs text-[#4a5568] font-medium flex items-center gap-2">
                                <Mail size={12} /> {unit.pendingTenantEmail}
                                <span className="text-[#1e2a2e]">|</span>
                                <span className="text-[#f0c040] font-bold uppercase tracking-wider text-[10px]">Applied for {unit.name}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full md:w-auto">
                            <button
                              onClick={() => handleDeclineRequest(unit)}
                              disabled={unitSaving}
                              className="flex-1 md:flex-initial px-6 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest bg-[#2d1a1a] text-[#e74c3c] border border-[#3d2020] hover:bg-[#3d1515] transition-all disabled:opacity-50"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleApproveRequest(unit)}
                              disabled={unitSaving}
                              className="flex-1 md:flex-initial px-8 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest bg-[#1a3c2e] text-[#52b788] border border-[#2d6a4f] hover:bg-[#2d6a4f] transition-all disabled:opacity-50 shadow-lg shadow-[#1a3c2e]/20"
                            >
                              Admit Tenant
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
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
                  />
                ))}
                {units.length === 0 && (
                  <div className="col-span-full">
                    <EmptyState
                      icon={DoorOpen}
                      title="No apartments added"
                      sub="Create units to start admitting tenants and collecting rent."
                      action={() => { setEditingUnit(null); setShowAddUnit(true); }}
                      actionText="Add First Unit"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Payments Tab ─────────────────────────────────────── */}
          {activeTab === 'payments' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between mb-6 px-1">
                <div>
                  <h3 className="font-display text-[#e8e4de] text-lg font-bold tracking-tight">Ledger History</h3>
                  <p className="font-body text-[11px] text-[#4a5568] font-bold uppercase tracking-widest mt-1">
                    {payments.length} successful transactions
                  </p>
                </div>
              </div>

              {payments.length === 0 ? (
                <EmptyState icon={CreditCard} title="Ledger empty" sub="Automated receipts will appear here as soon as tenants complete payments." />
              ) : (
                <div className="card overflow-hidden bg-[#0d1215] border-[#1e2a2e]">
                  {payments.map((p, i) => (
                    <PaymentRow key={p.id} payment={p} isLast={i === payments.length - 1} onDownloadInvoice={generateInvoicePdf} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Maintenance Tab ───────────────────────────────────── */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h3 className="font-display text-[#e8e4de] text-lg font-bold tracking-tight">Support Desk</h3>
                  <p className="font-body text-[11px] text-[#4a5568] font-bold uppercase tracking-widest mt-1">
                    {activeIssues} unresolved reports
                  </p>
                </div>
                <button onClick={() => setShowMaintModal(true)} className="btn-secondary text-[11px] font-bold uppercase tracking-wider px-5">
                  <Wrench size={14} /> Log Issue
                </button>
              </div>

              {maintenance.length === 0 ? (
                <EmptyState
                  icon={Wrench}
                  title="No active issues"
                  sub="Your facility status is green. No maintenance tickets found."
                  action={() => setShowMaintModal(true)}
                  actionText="Report Issue"
                />
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {maintenance.map(m => (
                    <div key={m.id} className="card p-5 hover:border-[#52b788]/20 transition-all bg-[#0d1215] border-[#1e2a2e] group">
                      <div className="flex items-start gap-4">
                        <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${m.status === 'resolved' ? 'bg-[#52b788]' : m.status === 'in-progress' ? 'bg-[#f0c040]' : 'bg-[#e74c3c]'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h4 className="font-body font-bold text-[#e8e4de] text-sm tracking-tight">{m.title}</h4>
                            <span className={`badge ${m.priority === 'high' ? 'badge-rust' : m.priority === 'medium' ? 'badge-amber' : 'badge-stone'}`}>
                              {m.priority}
                            </span>
                          </div>
                          {m.description && <p className="font-body text-xs text-[#4a5568] font-medium line-clamp-2 leading-relaxed mb-4">{m.description}</p>}

                          <div className="flex items-center justify-between border-t border-[#1e2a2e] pt-4 mt-2">
                            <button
                              onClick={() => cycleStatus(m)}
                              className={`inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all
                                   ${m.status === 'resolved' ? 'bg-[#1a3c2e] border-[#2d6a4f]/30 text-[#52b788]' : 'bg-[#141b1e] border-[#1e2a2e] text-[#4a5568] hover:text-[#e8e4de]'}`}
                            >
                              {m.status === 'open' ? 'Reviewing' : m.status === 'in-progress' ? 'Repairing' : 'Resolved'}
                              <ChevronDown size={10} />
                            </button>
                            <span className="font-body text-[10px] font-bold text-[#4a5568] uppercase tracking-widest">
                              {m.createdAt ? format(m.createdAt.toDate?.() ?? new Date(m.createdAt), 'MMM d, yyyy') : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Settings Tab ─────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="mb-8">
                <h3 className="font-display text-[#e8e4de] text-xl font-bold tracking-tight">Configuration</h3>
                <p className="font-body text-sm text-[#4a5568] font-medium mt-1">Management overrides and property-wide defaults.</p>
              </div>

              <div className="card p-8 bg-[#0d1215] border-[#1e2a2e]">
                <div className="flex items-start gap-4 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-[#1a3c2e]/20 border border-[#2d6a4f]/30 flex items-center justify-center flex-shrink-0 text-[#52b788]">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <h4 className="font-body text-[#e8e4de] font-bold text-base tracking-tight mb-1">Standard Renting Fee</h4>
                    <p className="font-body text-sm text-[#4a5568] font-medium leading-relaxed">
                      This value will be pre-filled when creating new apartments. Existing active leases won't be modified.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a5568] font-display font-bold text-sm pointer-events-none">
                      {currencySymbol}
                    </div>
                    <input
                      type="number"
                      className="input-base pl-12 h-14 text-lg font-bold bg-[#141b1e]"
                      value={rentSetting}
                      onChange={e => setRentSetting(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleUpdateRentPrice}
                    disabled={settingsSaving}
                    className="btn-primary h-14 px-10 shadow-lg shadow-[#1a3c2e]/20 min-w-[200px]"
                  >
                    {settingsSaving ? <Loader2 size={20} className="animate-spin" /> : 'Apply Policy'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      <Modal isOpen={showMaintModal} onClose={() => setShowMaintModal(false)} title="Report Facility Issue">
        <form onSubmit={handleAddMaint} className="space-y-6">
          <div>
            <label className="label-xs">Subject / Category *</label>
            <input className="input-base" placeholder="e.g. Electrical Fault - Apt 4B" value={maintForm.title} onChange={setM('title')} required />
          </div>
          <div>
            <label className="label-xs">Narrative Description</label>
            <textarea className="input-base min-h-[120px] resize-none" placeholder="Provide as much detail as possible for the technician…" value={maintForm.description} onChange={setM('description')} />
          </div>
          <div>
            <label className="label-xs">Risk Priority</label>
            <div className="flex gap-3">
              {['low', 'medium', 'high'].map(p => (
                <button type="button" key={p} onClick={() => setMaintForm(f => ({ ...f, priority: p }))}
                  className={`flex-1 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border transition-all
                    ${maintForm.priority === p
                      ? p === 'high' ? 'bg-[#2d1a1a] text-[#e74c3c] border-[#3d2020]' : p === 'medium' ? 'bg-[#2d2510] text-[#f0c040] border-[#3d3215]' : 'bg-[#1a3c2e] text-[#52b788] border-[#2d6a4f]'
                      : 'bg-[#141b1e] text-[#4a5568] border-[#1e2a2e] hover:border-[#4a5568]/30'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-4 justify-end pt-4 border-t border-[#1e2a2e]">
            <button type="button" onClick={() => setShowMaintModal(false)} className="btn-secondary px-8">Discard</button>
            <button type="submit" disabled={saving} className="btn-primary px-10">
              {saving ? <Loader2 className="animate-spin" size={20} /> : 'Dispatch Ticket'}
            </button>
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

      <Modal isOpen={showRemoveConfirm} onClose={() => setShowRemoveConfirm(false)} title="Security Check" size="sm">
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border ${isDeletingUnit ? 'bg-[#2d1a1a]/20 border-[#3d2020]/30' : 'bg-[#2d1a1a]/20 border-[#3d2020]/30'}`}>
            <div className="flex items-center gap-3 mb-4 text-[#e74c3c]">
              <AlertCircle size={24} />
              <h4 className="font-display font-bold text-lg">{isDeletingUnit ? 'Confirm Deletion' : 'Eviction Confirmation'}</h4>
            </div>
            <p className="font-body text-sm text-[#8a9ba8] leading-relaxed">
              {isDeletingUnit ? (
                <>You are about to permanently delete <strong>{removeUnit?.name || 'this unit'}</strong>. This action is irreversible and will remove all associated logs for this vector.</>
              ) : (
                <>You are about to terminate the active residency for <strong>{removeUnit?.tenantName || 'this occupant'}</strong>. This action stops all future billing and resets the unit to <strong>VACANT</strong>.</>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={isDeletingUnit ? handleDeleteUnit : handleMoveOutTenant}
              disabled={unitSaving}
              className="btn-danger w-full py-4 text-[11px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-[#2d1a1a]/20"
            >
              {unitSaving ? <Loader2 className="animate-spin mx-auto" size={20} /> : (isDeletingUnit ? 'Confirm Decommission' : 'Finalize Termination')}
            </button>
            <button onClick={() => setShowRemoveConfirm(false)} className="btn-ghost w-full py-3 text-[10px] font-bold uppercase tracking-widest">
              Abort
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="flex flex-col">
      <p className="font-body text-[10px] uppercase tracking-widest text-[#4a5568] font-bold mb-1.5">{label}</p>
      <p className={`font-display font-bold text-2xl tracking-tighter ${accent ? 'text-[#52b788]' : 'text-[#e8e4de]'}`}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({ icon: Icon, title, sub, action, actionText }) {
  return (
    <div className="flex flex-col items-center text-center py-20 px-6 card border-dashed border-2 border-[#1e2a2e] bg-[#141b1e]/20">
      <div className="w-16 h-16 rounded-3xl bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center mb-6 text-[#1e2a2e]">
        <Icon size={32} />
      </div>
      <h3 className="font-display font-bold text-[#e8e4de] text-xl mb-2 tracking-tight">{title}</h3>
      <p className="font-body text-[#4a5568] text-sm max-w-xs mx-auto mb-8 font-medium">{sub}</p>
      {action && (
        <button onClick={action} className="btn-secondary px-8">
          {actionText}
        </button>
      )}
    </div>
  );
}
