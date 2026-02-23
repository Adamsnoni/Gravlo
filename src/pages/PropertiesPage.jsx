// src/pages/PropertiesPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Building2, MapPin, ChevronRight } from 'lucide-react';
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
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-ink text-3xl font-semibold">Properties</h1>
          <p className="font-body text-stone-400 text-sm mt-0.5">
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
        }} className="btn-primary">
          <Plus size={16} /> Add Property
        </button>
      </motion.div>

      {/* Search + filter */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input className="input-base pl-10" placeholder="Search by name, address, or unit number…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-body font-medium border transition-all ${filter === f ? 'bg-sage/10 text-sage border-sage/30' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'
                  }`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        {buildings.length > 0 && (
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-stone-400" />
            <select
              className="text-sm font-body border border-stone-200 rounded-lg px-3 py-1.5 bg-white text-stone-500 focus:outline-none focus:border-sage transition-colors"
              value={buildingFilter}
              onChange={e => setBuildingFilter(e.target.value)}
            >
              <option value="all">All Buildings</option>
              <option value="standalone">Standalone Properties</option>
              {buildings.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        )}
      </motion.div>

      {/* Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="card h-52 bg-gradient-to-r from-stone-100 to-stone-50 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 flex flex-col items-center text-center border-2 border-dashed border-stone-200">
          <Building2 size={40} className="text-stone-300 mb-3" />
          <p className="font-body font-medium text-stone-500">
            {search || filter !== 'All' ? 'No properties match your search' : 'No properties yet'}
          </p>
          <p className="font-body text-xs text-stone-300 mt-1">
            {!search && filter === 'All' && 'Click "Add Property" to get started'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} exit={{ opacity: 0, scale: 0.97 }}>
                <PropertyCard property={p} onDelete={() => handleDelete(p.id, p.name)} showDelete />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Property" size="md">
        <form onSubmit={handleAdd} className="space-y-4">

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Property / Building Name *">
              <input className="input-base" placeholder="e.g. Sunset Court" value={form.name}
                onChange={set('name')} required autoFocus />
            </Field>
            <Field label="Property Type">
              <select className="input-base" value={form.type} onChange={set('type')}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Address *">
            <div className="relative">
              <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input className="input-base pl-9" placeholder="Full street address" value={form.address}
                onChange={set('address')} required />
            </div>
          </Field>

          <Field label="Description (optional)">
            <textarea className="input-base min-h-[72px] resize-none" placeholder="Any notes about this property…"
              value={form.description} onChange={set('description')} />
          </Field>

          <div className="flex gap-3 pt-2 justify-end">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving
                ? <div className="w-4 h-4 border-2 border-cream border-t-transparent rounded-full animate-spin" />
                : <><ChevronRight size={15} /> Next: Set Up Units</>}
            </button>
          </div>
        </form>
      </Modal>
    </div >
  );
}

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block font-body text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}
