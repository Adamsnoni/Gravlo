// src/components/PropertyCard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Trash2, ChevronRight, Building2, Hash, DoorOpen, Plus } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { formatUnitDisplay, getShortUnitId } from '../utils/unitDisplay';
import { subscribeUnits } from '../services/firebase';

export default function PropertyCard({ property, onDelete, showDelete }) {
  const { fmtRent } = useLocale();
  const { user } = useAuth();
  const [unitCount, setUnitCount] = useState(0);
  const [occupiedCount, setOccupiedCount] = useState(0);

  // Subscribe to unit count for this property
  useEffect(() => {
    if (!user || !property?.id) return;
    const unsub = subscribeUnits(user.uid, property.id, (units) => {
      setUnitCount(units.length);
      setOccupiedCount(units.filter(u => u.status === 'occupied').length);
    });
    return unsub;
  }, [user, property?.id]);

  return (
    <div className="card-hover group relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${property.status === 'occupied' ? 'bg-sage' : property.status === 'vacant' ? 'bg-amber' : 'bg-rust'
        }`} />

      <Link to={`/properties/${property.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${property.status === 'occupied' ? 'bg-sage/10' : property.status === 'vacant' ? 'bg-amber/10' : 'bg-rust/10'
              }`}>
              <Building2 size={18} className={
                property.status === 'occupied' ? 'text-sage' : property.status === 'vacant' ? 'text-amber' : 'text-rust'
              } />
            </div>
            <div className="min-w-0">
              <p className="font-body font-semibold text-ink text-sm truncate">{property.name}</p>
              {property.unitNumber && (
                <p className="font-body text-xs text-sage font-medium flex items-center gap-1 mt-0.5">
                  <Hash size={10} /> {getShortUnitId(property)}
                </p>
              )}
              <p className="font-body text-xs text-stone-400 flex items-center gap-1 mt-0.5 truncate">
                <MapPin size={11} /> {property.address}
              </p>
            </div>
          </div>
          <StatusBadge status={property.status} />
        </div>

        <div className="flex items-center gap-4 py-3 border-t border-b border-stone-100 my-3">
          <div className="flex-1">
            <p className="font-body text-xs text-stone-400">Rent</p>
            <p className="font-display font-semibold text-ink mt-0.5">
              {fmtRent(property.monthlyRent, property.rentType)}
            </p>
          </div>
          {property.bedrooms > 0 && (
            <div className="flex items-center gap-1 text-stone-400">
              <Bed size={13} />
              <span className="font-body text-xs">{property.bedrooms}</span>
            </div>
          )}
          {property.bathrooms > 0 && (
            <div className="flex items-center gap-1 text-stone-400">
              <Bath size={13} />
              <span className="font-body text-xs">{property.bathrooms}</span>
            </div>
          )}
        </div>

        {/* Units summary row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DoorOpen size={13} className="text-stone-400" />
            <span className="font-body text-xs text-stone-500">
              {unitCount > 0
                ? `${unitCount} unit${unitCount !== 1 ? 's' : ''} · ${occupiedCount} occupied`
                : 'No units added yet'
              }
            </span>
          </div>
          {unitCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-body font-semibold bg-sage/10 text-sage">
              {occupiedCount}/{unitCount}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="font-body text-xs text-stone-400">
            {property.tenantName ? `Tenant: ${property.tenantName}` : 'No tenant assigned'}
          </span>
          <ChevronRight size={14} className="text-stone-300 group-hover:text-sage transition-colors" />
        </div>
      </Link>

      {/* Quick action: Manage Units */}
      <div className="px-5 pb-4 pt-0 flex gap-2">
        <Link
          to={`/properties/${property.id}?tab=units`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-stone-200 hover:border-sage/30 hover:bg-sage/5 text-stone-500 hover:text-sage font-body text-xs font-medium transition-all"
        >
          <DoorOpen size={13} /> Manage Units
        </Link>
        <Link
          to={`/properties/${property.id}?tab=units&action=add`}
          className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-sage/10 hover:bg-sage/20 text-sage font-body text-xs font-semibold transition-all"
        >
          <Plus size={12} /> Add Unit
        </Link>
      </div>

      {showDelete && onDelete && (
        <button
          onClick={(e) => { e.preventDefault(); onDelete(); }}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-rust/10 text-rust hover:bg-rust/20 transition-all"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}
