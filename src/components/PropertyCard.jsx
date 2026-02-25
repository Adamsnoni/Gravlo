// src/components/PropertyCard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Trash2, ChevronRight, Building2, Hash, DoorOpen, Plus } from 'lucide-react';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { subscribeUnits } from '../services/firebase';

export default function PropertyCard({ property, onDelete, showDelete }) {
  const { fmtRent } = useLocale();
  const { user } = useAuth();
  const [unitCount, setUnitCount] = useState(0);
  const [occupiedCount, setOccupiedCount] = useState(0);

  useEffect(() => {
    if (!user || !property?.id) return;
    const unsub = subscribeUnits(user.uid, property.id, (units) => {
      setUnitCount(units.length);
      setOccupiedCount(units.filter(u => u.status === 'occupied').length);
    });
    return unsub;
  }, [user, property?.id]);

  const statusColors = {
    occupied: { bg: 'bg-[#e8f5ee]', text: 'text-[#1a6a3c]', border: 'border-[#ddf0e6]', icon: '#1a6a3c' },
    vacant: { bg: 'bg-[#fef9ed]', text: 'text-[#c8691a]', border: 'border-[#f5e0b8]', icon: '#c8691a' },
    maintenance: { bg: 'bg-[#fff5f5]', text: 'text-[#e74c3c]', border: 'border-[#fee2e2]', icon: '#e74c3c' }
  };

  const style = statusColors[property.status] || statusColors.vacant;

  return (
    <div className="card card-hover group h-full flex flex-col overflow-hidden">
      {/* Top Banner indicating status */}
      <div className={`h-1.5 w-full ${property.status === 'occupied' ? 'bg-[#1a6a3c]' : property.status === 'vacant' ? 'bg-[#c8691a]' : 'bg-[#e74c3c]'}`} />

      <Link to={`/properties/${property.id}`} className="block p-6 flex-1">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border ${style.border} ${style.bg}`}>
              <Building2 size={24} color={style.icon} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h4 className="font-fraunces font-black text-[#1a2e22] text-lg truncate group-hover:text-[#1a6a3c] transition-colors">{property.name}</h4>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {property.unitNumber && (
                  <span className="flex items-center gap-1 font-bold text-[#1a6a3c] text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#e8f5ee] rounded-lg">
                    <Hash size={10} strokeWidth={3} /> {property.unitNumber}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[#94a3a8] text-[11px] font-semibold truncate max-w-[150px]">
                  <MapPin size={10} /> {property.address}
                </span>
              </div>
            </div>
          </div>

          <div className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${style.border} ${style.bg} ${style.text}`}>
            {property.status}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-5 border-t border-[#f0f7f2] mb-5">
          <div>
            <p className="text-[#94a3a8] font-bold text-[10px] uppercase tracking-widest mb-1.5">Expected Rent</p>
            <p className="font-fraunces font-black text-[#1a2e22] text-xl leading-none">
              {fmtRent(property.monthlyRent || 0, property.rentType || 'monthly')}
            </p>
          </div>
          <div className="text-right flex flex-col items-end">
            <p className="text-[#94a3a8] font-bold text-[10px] uppercase tracking-widest mb-1.5">Active Units</p>
            <div className="flex items-center gap-2">
              <span className="font-fraunces font-black text-[#1a2e22] text-xl leading-none">{occupiedCount}/{unitCount || 0}</span>
              <div className="w-8 h-8 rounded-lg bg-[#f4fbf7] border border-[#ddf0e6] flex items-center justify-center text-[#1a6a3c]">
                <DoorOpen size={16} strokeWidth={2.5} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-[#6b8a7a]">
          <span className="text-[11px] font-bold truncate max-w-[200px]">
            {property.tenantName ? `Assigned: ${property.tenantName}` : 'Assign a tenant'}
          </span>
          <ChevronRight size={16} className="text-[#cce8d8] group-hover:text-[#1a6a3c] transition-all transform group-hover:translate-x-1" strokeWidth={3} />
        </div>
      </Link>

      <div className="p-4 bg-[#fcfdfc] border-t border-[#f0f7f2] flex gap-2 overflow-hidden">
        <Link
          to={`/properties/${property.id}?tab=units`}
          className="flex-1 btn-secondary py-2.5 text-xs font-bold gap-2 whitespace-nowrap"
        >
          <DoorOpen size={14} /> Units
        </Link>
        <Link
          to={`/properties/${property.id}?tab=units&action=add`}
          className="flex-shrink-0 flex items-center justify-center p-2.5 rounded-xl bg-[#e8f5ee] text-[#1a6a3c] hover:bg-[#1a3c2e] hover:text-white transition-all border border-[#ddf0e6]"
          title="Add Unit"
        >
          <Plus size={16} strokeWidth={3} />
        </Link>
      </div>

      {showDelete && onDelete && occupiedCount === 0 && (
        <button
          onClick={(e) => { e.preventDefault(); onDelete(); }}
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 rounded-xl bg-[#fff5f5] text-[#e74c3c] hover:bg-[#e74c3c] hover:text-white transition-all shadow-sm border border-[#fee2e2]"
        >
          <Trash2 size={14} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
