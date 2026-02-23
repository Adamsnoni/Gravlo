// src/pages/PropertyDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Bed, Bath, MapPin, User, Mail, Phone, Plus, Wrench, CreditCard, Info, ChevronDown, Hash, Building2, DoorOpen, UserMinus, Link2, Copy, Check, UserCheck, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { subscribeProperties, subscribePayments, subscribeMaintenance, addMaintenance, updateMaintenance, subscribeUnits, addUnit, updateUnit, deleteUnit } from '../services/firebase';
import { createTenancy, closeActiveTenanciesForUnit, getActiveTenancy } from '../services/tenancy';
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
  { id: 'overview', label: 'Overview', icon: Info },
  { id: 'units', label: 'Units', icon: DoorOpen },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
];

export default function PropertyDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { fmt, fmtRent, currencySymbol, country } = useLocale();

  const [property, setProperty] = useState(null);
  const [payments, setPayments] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [units, setUnits] = useState([]);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [loading, setLoading] = useState(true);

  // Maintenance modal
  const [showMaintModal, setShowMaintModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [maintForm, setMaintForm] = useState({ title: '', description: '', priority: 'medium' });

  // Unit modals
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);   // null = add mode, object = edit mode
  const [unitSaving, setUnitSaving] = useState(false);

  // Remove tenant confirm
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeUnit, setRemoveUnit] = useState(null);

  // Property invite link state
  const [propertyInviteLink, setPropertyInviteLink] = useState(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [portalLinkCopied, setPortalLinkCopied] = useState(false);

  // ── Subscriptions ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const u1 = subscribeProperties(user.uid, props => {
      const p = props.find(x => x.id === id);
      setProperty(p || null);
      if (p) setLoading(false);
    });
    const u2 = subscribePayments(user.uid, id, setPayments);
    const u3 = subscribeMaintenance(user.uid, id, setMaintenance);
    const u4 = subscribeUnits(user.uid, id, setUnits);
    return () => { u1(); u2(); u3(); u4(); };
  }, [user, id]);

  // Auto-open Add Unit modal when deep-linked from PropertyCard
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
    toast.success(`Status → ${next}`);
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

  const handleGeneratePropertyInvite = async () => {
    setGeneratingInvite(true);
    try {
      const { link } = await createInviteToken({
        landlordUid: user.uid,
        propertyId: id,
        propertyName: property?.name || '',
      });
      setPropertyInviteLink(link);
      toast.success('Property invite link generated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate invite link.');
    } finally {
      setGeneratingInvite(false);
    }
  };

  const handleOpenEdit = (unit) => {
    setEditingUnit(unit);
    setShowAddUnit(true);
  };

  const handleOpenRemove = (unit) => {
    setRemoveUnit(unit);
    setShowRemoveConfirm(true);
  };

  const handleRemoveTenant = async () => {
    if (!removeUnit) return;
    setUnitSaving(true);
    try {
      // 1) Close active tenancy (stops invoices, preserves history)
      const activeTenancy = await getActiveTenancy(user.uid, id, removeUnit.id);
      if (activeTenancy) {
        await closeActiveTenanciesForUnit(user.uid, id, removeUnit.id);
        // Cancel any pending/sent invoices for this tenancy
        await cancelPendingInvoices(user.uid, activeTenancy.id);
      }

      // 2) Update unit document
      await updateUnit(user.uid, id, removeUnit.id, {
        tenantId: null, tenantName: '', tenantEmail: '', status: 'vacant',
        rentStatus: null,
      });

      toast.success(`Tenant removed from ${removeUnit.unitName}.`);
      setShowRemoveConfirm(false);
      setRemoveUnit(null);
    } catch (err) { console.error(err); toast.error('Failed to remove tenant.'); }
    finally { setUnitSaving(false); }
  };

  // ── Join request handlers ─────────────────────────────────────────────
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
      toast.success(`${unit.pendingTenantName || 'Tenant'} approved for ${unit.name}!`);
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
      toast.success(`Request from ${unit.pendingTenantName || 'tenant'} declined.`);
    } catch (err) { console.error(err); toast.error('Failed to decline request.'); }
    finally { setUnitSaving(false); }
  };

  // ── Loading / Not found ───────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-sage border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!property) return (
    <div className="text-center py-20">
      <p className="font-body text-stone-400">Property not found.</p>
      <Link to="/properties" className="btn-secondary mt-4 inline-flex">← Back to Properties</Link>
    </div>
  );

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0);

  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/properties" className="inline-flex items-center gap-1.5 text-sm font-body text-stone-400 hover:text-ink transition-colors mb-4">
          <ArrowLeft size={15} /> All Properties
        </Link>

        <div className="card overflow-hidden">
          {/* Hero */}
          <div className="bg-gradient-to-br from-ink to-ink-light p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `radial-gradient(circle at 1px 1px, #F5F0E8 1px, transparent 0)`, backgroundSize: '24px 24px' }} />
            <div className="absolute top-0 right-0 w-48 h-48 bg-sage/10 rounded-full blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between gap-4 mb-4">
                <StatusBadge status={property.status} />
              </div>
              <h1 className="font-display text-cream text-2xl sm:text-3xl font-semibold mb-2">{property.name}</h1>
              {property.unitNumber && (
                <div className="flex items-center gap-1.5 text-sage mb-3">
                  <Hash size={14} />
                  <span className="font-body text-sm font-medium">{formatUnitDisplay(property)}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-stone-400 mb-6">
                <MapPin size={14} />
                <span className="font-body text-sm">{property.address}</span>
              </div>
              <div className="flex flex-wrap gap-6 mb-6">
                <Stat label="Rent" value={fmtRent(property.monthlyRent, property.rentType)} accent />
                <Stat label="Units" value={units.length} />
                <Stat label="Occupied" value={units.filter(u => u.status === 'occupied').length} />
                <Stat label="Bedrooms" value={property.bedrooms || '—'} />
                <Stat label="Total Collected" value={fmt(totalPaid)} />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-100 px-2 overflow-x-auto">
          {TABS.map(({ id: tid, label, icon: Icon }) => (
            <button key={tid} onClick={() => setActiveTab(tid)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-body font-medium border-b-2 transition-all whitespace-nowrap
                  ${activeTab === tid ? 'border-sage text-sage' : 'border-transparent text-stone-400 hover:text-ink'}`}>
              <Icon size={15} /> {label}
              {tid === 'units' && units.length > 0 && (
                <span className="ml-1 w-5 h-5 rounded-full bg-sage/10 text-sage text-xs font-semibold flex items-center justify-center">{units.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* ── Overview ──────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="grid sm:grid-cols-2 gap-6">
              <InfoCard title="Property Details">
                <InfoRow label="Type" value={property.type || '—'} />
                <InfoRow label="Status" value={<StatusBadge status={property.status} />} />
                {property.buildingName && (
                  <InfoRow label="Building" value={<span className="flex items-center gap-1"><Building2 size={13} />{property.buildingName}</span>} />
                )}
                {property.unitNumber && (
                  <InfoRow label="Unit" value={<span className="flex items-center gap-1"><Hash size={13} />{getShortUnitId(property)}</span>} />
                )}
                <InfoRow label="Rent" value={fmtRent(property.monthlyRent, property.rentType)} />
                <InfoRow label="Added" value={property.createdAt ? format(property.createdAt.toDate?.() ?? new Date(property.createdAt), 'MMM d, yyyy') : '—'} />
                {property.description && <InfoRow label="Notes" value={property.description} />}
              </InfoCard>
              <InfoCard title="Tenant Information">
                {property.tenantName ? (
                  <>
                    <InfoRow label="Name" value={<span className="flex items-center gap-1"><User size={13} />{property.tenantName}</span>} />
                    <InfoRow label="Email" value={<span className="flex items-center gap-1"><Mail size={13} />{property.tenantEmail || '—'}</span>} />
                    <InfoRow label="Phone" value={<span className="flex items-center gap-1"><Phone size={13} />{property.tenantPhone || '—'}</span>} />
                  </>
                ) : (
                  <p className="font-body text-sm text-stone-400 italic">No tenant — property is {property.status}.</p>
                )}
              </InfoCard>

              <div className="sm:col-span-2 flex gap-3">
                <button onClick={() => setActiveTab('units')} className="btn-primary">
                  <DoorOpen size={15} /> Manage Units ({units.length})
                </button>
                <button onClick={() => setActiveTab('payments')} className="btn-secondary">
                  <CreditCard size={15} /> View Payments
                </button>
                <button onClick={() => setShowMaintModal(true)} className="btn-secondary">
                  <Wrench size={15} /> Log Issue
                </button>
              </div>
            </div>
          )}

          {/* ── Units ────────────────────────────────────────────── */}
          {activeTab === 'units' && (
            <div className="space-y-6">
              {/* Property Invite Link Section */}
              <div className="p-6 rounded-3xl bg-sage/5 border-2 border-sage/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-sage/5 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-sage/15 flex items-center justify-center flex-shrink-0">
                      <Link2 size={24} className="text-sage" />
                    </div>
                    <div>
                      <h3 className="font-display text-ink text-lg font-semibold mb-1">Building Access Link</h3>
                      <p className="font-body text-stone-500 text-sm">Share this link to let tenants join any vacant unit in this building</p>
                    </div>
                  </div>

                  <div className="w-full md:w-auto flex items-center gap-2">
                    {propertyInviteLink ? (
                      <div className="flex-1 md:flex-initial flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-sage/20 rounded-2xl p-1.5 pl-4 shadow-sm">
                        <span className="font-mono text-xs text-stone-500 truncate max-w-[200px]">{propertyInviteLink}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(propertyInviteLink);
                            setPortalLinkCopied(true);
                            setTimeout(() => setPortalLinkCopied(false), 2000);
                          }}
                          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-body font-bold transition-all ${portalLinkCopied ? 'bg-sage text-white' : 'bg-sage/10 text-sage hover:bg-sage/20'}`}
                        >
                          {portalLinkCopied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={handleGeneratePropertyInvite}
                        disabled={generatingInvite}
                        className="btn-primary w-full md:w-auto px-6 py-3 justify-center shadow-lg shadow-sage/10"
                      >
                        {generatingInvite ? <><Loader2 size={16} className="animate-spin" /> Generating…</> : <><Plus size={16} /> Generate Portal Link</>}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-sm text-stone-400">
                    {units.length} unit{units.length !== 1 ? 's' : ''} · {units.filter(u => u.status === 'occupied').length} occupied
                  </p>
                </div>
                <button
                  onClick={() => { setEditingUnit(null); setShowAddUnit(true); }}
                  className="btn-primary text-xs px-3 py-2"
                >
                  <Plus size={13} /> Add Unit
                </button>
              </div>

              {/* ── Join Requests ────────────────────────────────────── */}
              {(() => {
                const pending = units.filter(u => u.status === 'pending_approval' && !!u.pendingTenantId);
                if (pending.length === 0) return null;
                return (
                  <div className="mb-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={15} className="text-amber" />
                      <p className="font-body text-xs font-semibold text-amber uppercase tracking-wider">
                        Action Required · {pending.length} join request{pending.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {pending.map(unit => (
                      <div key={unit.id} className="rounded-2xl border-2 border-amber/30 bg-amber/5 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber/15 flex items-center justify-center flex-shrink-0">
                              <User size={16} className="text-amber" />
                            </div>
                            <div>
                              <p className="font-body text-sm font-semibold text-ink">
                                {unit.pendingTenantName || 'Unknown Tenant'}
                              </p>
                              <p className="font-body text-xs text-stone-500">
                                {unit.pendingTenantEmail && <span className="mr-2">{unit.pendingTenantEmail}</span>}
                                requested <strong>{unit.name}</strong>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleDeclineRequest(unit)}
                              disabled={unitSaving}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body font-medium bg-white border border-stone-200 text-stone-500 hover:border-rust/40 hover:text-rust transition-all disabled:opacity-50"
                            >
                              <UserMinus size={13} /> Decline
                            </button>
                            <button
                              onClick={() => handleApproveRequest(unit)}
                              disabled={unitSaving}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-body font-medium bg-sage text-cream hover:bg-sage/90 transition-all disabled:opacity-50"
                            >
                              <UserCheck size={13} /> Approve
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {units.length === 0 ? (
                <EmptyState
                  icon={DoorOpen}
                  title="No units yet"
                  sub="Add apartments or units to this property to track tenants and rent."
                />
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
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
                </div>
              )}
            </div>
          )}

          {/* ── Payments ─────────────────────────────────────────── */}
          {activeTab === 'payments' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="font-body text-sm text-stone-400">{payments.length} payments recorded</p>
              </div>
              {payments.length === 0 ? (
                <EmptyState icon={CreditCard} title="No payments yet" sub="Payments will appear here automatically after tenants pay online." />
              ) : (
                <div className="card overflow-hidden">
                  {payments.map((p, i) => (
                    <PaymentRow key={p.id} payment={p} isLast={i === payments.length - 1} onDownloadInvoice={generateInvoicePdf} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Maintenance ──────────────────────────────────────── */}
          {activeTab === 'maintenance' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="font-body text-sm text-stone-400">{maintenance.filter(m => m.status !== 'resolved').length} open issues</p>
                <button onClick={() => setShowMaintModal(true)} className="btn-primary text-xs px-3 py-2"><Plus size={13} /> Log Issue</button>
              </div>
              {maintenance.length === 0 ? (
                <EmptyState icon={Wrench} title="No issues logged" sub="All clear — no maintenance tickets for this property." />
              ) : (
                <div className="space-y-3">
                  {maintenance.map(m => (
                    <div key={m.id} className="flex items-start gap-4 p-4 card hover:shadow-deep transition-shadow">
                      <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${m.status === 'resolved' ? 'bg-sage' : m.status === 'in-progress' ? 'bg-amber' : 'bg-rust'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-body font-semibold text-sm text-ink">{m.title}</p>
                          <span className={`badge text-xs ${m.priority === 'high' ? 'badge-rust' : m.priority === 'medium' ? 'badge-amber' : 'badge-stone'}`}>
                            {m.priority}
                          </span>
                        </div>
                        {m.description && <p className="font-body text-xs text-stone-400 mt-1 line-clamp-2">{m.description}</p>}
                        <div className="flex items-center gap-3 mt-2">
                          <button onClick={() => cycleStatus(m)}
                            className={`inline-flex items-center gap-1.5 text-xs font-body font-medium px-2.5 py-1 rounded-lg border transition-all
                                ${m.status === 'resolved' ? 'bg-sage/10 text-sage border-sage/20' : m.status === 'in-progress' ? 'bg-amber/10 text-amber border-amber/20' : 'bg-rust/10 text-rust border-rust/20'}`}>
                            <ChevronDown size={11} /> {m.status === 'open' ? 'Open' : m.status === 'in-progress' ? 'In Progress' : 'Resolved'}
                          </button>
                          <span className="font-body text-xs text-stone-300">
                            {m.createdAt ? format(m.createdAt.toDate?.() ?? new Date(m.createdAt), 'MMM d') : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Maintenance Modal ──────────────────────────────────────────── */}
      <Modal isOpen={showMaintModal} onClose={() => setShowMaintModal(false)} title="Log Maintenance Issue">
        <form onSubmit={handleAddMaint} className="space-y-4">
          <div>
            <label className="label-xs">Issue Title *</label>
            <input className="input-base" placeholder="e.g. Leaking roof, Broken AC…" value={maintForm.title} onChange={setM('title')} required />
          </div>
          <div>
            <label className="label-xs">Description</label>
            <textarea className="input-base min-h-[80px] resize-none" placeholder="Describe the issue…" value={maintForm.description} onChange={setM('description')} />
          </div>
          <div>
            <label className="label-xs">Priority</label>
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map(p => (
                <button type="button" key={p} onClick={() => setMaintForm(f => ({ ...f, priority: p }))}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-body font-medium border capitalize transition-all
                    ${maintForm.priority === p
                      ? p === 'high' ? 'bg-rust/10 text-rust border-rust/30' : p === 'medium' ? 'bg-amber/10 text-amber border-amber/30' : 'bg-sage/10 text-sage border-sage/30'
                      : 'bg-stone-50 text-stone-400 border-stone-200 hover:bg-stone-100'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setShowMaintModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" /> : 'Log Issue'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Add / Edit Unit Modal ──────────────────────────────────────── */}
      <AddUnitModal
        isOpen={showAddUnit}
        onClose={() => { setShowAddUnit(false); setEditingUnit(null); }}
        onSubmit={handleAddOrEditUnit}
        saving={unitSaving}
        editUnit={editingUnit}
        currencySymbol={currencySymbol}
      />

      {/* ── Remove Tenant Confirmation ─────────────────────────────────── */}
      <Modal isOpen={showRemoveConfirm} onClose={() => setShowRemoveConfirm(false)} title="Remove Tenant" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-rust/8 rounded-xl border border-rust/20">
            <UserMinus size={18} className="text-rust flex-shrink-0" />
            <p className="font-body text-sm text-rust">
              Remove <strong>{removeUnit?.tenantName || 'tenant'}</strong> from <strong>{removeUnit?.unitName}</strong>?
              Payment history will be kept.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setShowRemoveConfirm(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleRemoveTenant} disabled={unitSaving} className="btn-danger">
              {unitSaving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Remove Tenant'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div>
      <p className="font-body text-xs text-stone-500 mb-0.5">{label}</p>
      <p className={`font-display font-semibold text-xl ${accent ? 'text-sage' : 'text-cream'}`}>{value}</p>
    </div>
  );
}
function InfoCard({ title, children }) {
  return (
    <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
      <p className="font-body text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="font-body text-xs text-stone-400 flex-shrink-0">{label}</span>
      <span className="font-body text-sm text-ink font-medium text-right">{value}</span>
    </div>
  );
}
function EmptyState({ icon: Icon, title, sub }) {
  return (
    <div className="flex flex-col items-center text-center py-12">
      <Icon size={32} className="text-stone-300 mb-3" />
      <p className="font-body font-medium text-stone-500 text-sm">{title}</p>
      <p className="font-body text-xs text-stone-300 mt-1">{sub}</p>
    </div>
  );
}
