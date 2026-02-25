// src/pages/PropertiesPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Building2, MapPin, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { subscribeProperties, addProperty, deleteProperty } from '../services/firebase';
import PropertyCard from '../components/PropertyCard';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { canAddProperty, getUpgradePlan, getUserPlan } from '../services/subscription';

const TYPES = ['Apartment', 'House', 'Studio', 'Duplex', 'Commercial', 'Other'];
const FILTERS = ['All', 'Occupied', 'Vacant', 'Maintenance'];

export default function PropertiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [buildingFilter, setBuildingFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyForm = { name: '', address: '', type: 'Apartment', description: '' };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!user) return;
    const u = subscribeProperties(user.uid, d => { setProperties(d); setLoading(false); });
    return u;
  }, [user]);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const buildings = [...new Set(properties.filter(p => p.buildingName).map(p => p.buildingName))].sort();

  const filtered = properties.filter(p => {
    const ms = !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.address?.toLowerCase().includes(search.toLowerCase()) ||
      (p.unitNumber && p.unitNumber.toLowerCase().includes(search.toLowerCase()));
    const mf = filter === 'All' || p.status?.toLowerCase() === filter.toLowerCase();
    const mb = buildingFilter === 'all' || (buildingFilter === 'standalone' && !p.buildingName) || p.buildingName === buildingFilter;
    return ms && mf && mb;
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name || !form.address) { toast.error('Name and address are required.'); return; }
    setSaving(true);
    try {
      const docRef = await addProperty(user.uid, {
        name: form.name,
        address: form.address,
        type: form.type,
        description: form.description,
        status: 'vacant',
      });
      toast.success('Property created!');
      setShowModal(false);
      setForm(emptyForm);
      navigate(`/properties/${docRef.id}/success`, {
        state: { propertyId: docRef.id, propertyName: form.name },
      });
    } catch {
      toast.error('Failed to add property.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteProperty(user.uid, id);
      toast.success('Property deleted.');
    } catch {
      toast.error('Failed to delete.');
    }
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[#e8e4de] text-4xl font-bold tracking-tight">Properties</h1>
          <p className="font-body text-[#4a5568] text-sm mt-1 uppercase tracking-widest font-bold">
            {properties.length} total · {properties.filter(p => p.status === 'occupied').length} occupied
          </p>
        </div>
        <button onClick={async () => {
          const allowed = await canAddProperty(user.uid, properties.length);
          if (!allowed) {
            const plan = await getUserPlan(user.uid);
            const upgrade = getUpgradePlan(plan.id);
            toast.error(
              `You've reached the ${plan.maxProperties}-property limit on the ${plan.name} plan.${upgrade ? ` Upgrade to ${upgrade.name} for more.` : ''}`,
              { duration: 4000 }
            );
            return;
          }
          setShowModal(true);
        }} className="btn-primary py-3 px-6 shadow-xl shadow-[#1a3c2e]/20">
          <Plus size={18} /> <span>Add Property</span>
        </button>
      </motion.div>

      {/* Search + filter */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a5568]" />
            <input
              className="input-base pl-12 h-12 bg-[#0d1215] border-[#1e2a2e] focus:border-[#52b788]"
              placeholder="Search by name, address, or unit..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 p-1 bg-[#0d1215] border border-[#1e2a2e] rounded-xl overflow-x-auto no-scrollbar">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-5 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${filter === f
                    ? 'bg-[#1a3c2e] text-[#52b788] shadow-sm'
                    : 'text-[#4a5568] hover:text-[#8a9ba8]'
                  }`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        {buildings.length > 0 && (
          <div className="flex items-center gap-3 px-1">
            <Building2 size={14} className="text-[#4a5568]" />
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setBuildingFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${buildingFilter === 'all'
                    ? 'bg-[#1e2a2e] border-[#52b788]/30 text-[#e8e4de]'
                    : 'bg-[#0d1215] border-[#1e2a2e] text-[#4a5568] hover:border-[#4a5568]/30'
                  }`}
              >
                All Buildings
              </button>
              {buildings.map(b => (
                <button
                  key={b}
                  onClick={() => setBuildingFilter(b)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${buildingFilter === b
                      ? 'bg-[#1e2a2e] border-[#52b788]/30 text-[#e8e4de]'
                      : 'bg-[#0d1215] border-[#1e2a2e] text-[#4a5568] hover:border-[#4a5568]/30'
                    }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="card h-64 bg-[#0d1215] border-[#1e2a2e] animate-pulse overflow-hidden">
              <div className="h-1 w-full bg-[#1e2a2e]" />
              <div className="p-6 space-y-4">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#1e2a2e]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-[#1e2a2e] rounded" />
                    <div className="h-3 w-1/2 bg-[#1e2a2e] rounded" />
                  </div>
                </div>
                <div className="h-px w-full bg-[#1e2a2e]" />
                <div className="h-12 w-full bg-[#1e2a2e] rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-20 flex flex-col items-center text-center bg-[#0d1215] border-2 border-dashed border-[#1e2a2e]">
          <div className="w-16 h-16 rounded-3xl bg-[#141b1e] border border-[#1e2a2e] flex items-center justify-center mb-6">
            <Building2 size={32} className="text-[#1e2a2e]" />
          </div>
          <h3 className="font-display text-[#e8e4de] text-xl font-bold mb-2">No properties found</h3>
          <p className="font-body text-[#4a5568] text-sm max-w-xs mx-auto">
            {search || filter !== 'All'
              ? 'Try adjusting your filters or search terms to find what you looking for.'
              : 'Start your portfolio by adding your first property or building portal.'}
          </p>
          {!search && filter === 'All' && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-8 btn-primary px-8"
            >
              Add Your First Property
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((p, i) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, type: 'spring', damping: 20 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <PropertyCard property={p} onDelete={() => handleDelete(p.id, p.name)} showDelete />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Property" size="md">
        <form onSubmit={handleAdd} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label-xs">Property / Building Name *</label>
              <input className="input-base" placeholder="e.g. Sunset Court" value={form.name}
                onChange={set('name')} required autoFocus />
            </div>
            <div>
              <label className="label-xs">Property Type</label>
              <select className="input-base" value={form.type} onChange={set('type')}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label-xs">Street Address *</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4a5568] pointer-events-none" />
              <input className="input-base pl-11" placeholder="Full street address" value={form.address}
                onChange={set('address')} required />
            </div>
          </div>

          <div>
            <label className="label-xs">Notes (optional)</label>
            <textarea className="input-base min-h-[100px] resize-none" placeholder="Add any specific details or internal notes…"
              value={form.description} onChange={set('description')} />
          </div>

          <div className="flex gap-4 pt-4 justify-end border-t border-[#1e2a2e]">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary px-8">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary px-8">
              {saving
                ? <Loader2 className="animate-spin" size={18} />
                : <><ChevronRight size={18} /> <span>Next Step</span></>}
            </button>
          </div>
        </form>
      </Modal>
    </div >
  );
}
