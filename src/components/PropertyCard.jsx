// src/components/PropertyCard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Bed, Bath, Trash2, ChevronRight, Building2, Hash, DoorOpen, Plus, ArrowUpRight } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { useLocale } from '../context/LocaleContext';
import { useAuth } from '../context/AuthContext';
import { getShortUnitId } from '../utils/unitDisplay';
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

  const statusColor = property.status === 'occupied' ? '#52b788' : property.status === 'vacant' ? '#f0c040' : '#e74c3c';

  return (
    <div className="card group relative overflow-hidden bg-[#0d1215] border-[#1e2a2e] transition-all duration-500 hover:border-[#1a3c2e] hover:shadow-2xl hover:shadow-[#1a3c2e]/10">
      <div
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r transition-all duration-500"
        style={{
          backgroundImage: `linear-gradient(90deg, ${statusColor} 0%, transparent 100%)`,
          opacity: 0.6
        }}
      />

      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity" />

      <Link to={`/properties/${property.id}`} className="block p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-[#141b1e] border border-[#1e2a2e] group-hover:scale-105 transition-transform duration-500"
              style={{ color: statusColor }}>
              <Building2 size={24} />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-[#e8e4de] text-lg truncate tracking-tight leading-tight">{property.name}</h3>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="font-body text-[10px] text-[#52b788] font-bold uppercase tracking-widest bg-[#1a3c2e]/20 px-2 py-0.5 rounded-md border border-[#2d6a4f]/20">
                  <Hash size={10} className="inline mr-1" /> {getShortUnitId(property)}
                </span>
                <span className="font-body text-[10px] text-[#4a5568] flex items-center gap-1 font-bold uppercase tracking-widest truncate">
                  <MapPin size={10} /> {property.address}
                </span>
              </div>
            </div>
          </div>
          <StatusBadge status={property.status} />
        </div>

        <div className="flex items-center gap-6 py-4 border-t border-b border-[#1e2a2e]/50 my-5 relative">
          <div className="flex-1">
            <p className="font-body text-[9px] uppercase tracking-[0.2em] text-[#4a5568] font-black">Yield Magnitude</p>
            <p className="font-display font-bold text-[#e8e4de] text-2xl mt-1 tracking-tighter">
              {fmtRent(property.monthlyRent, property.rentType)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {property.bedrooms > 0 && (
              <div className="text-center">
                <p className="font-body text-[8px] font-black text-[#4a5568] uppercase mb-1">Beds</p>
                <div className="flex items-center gap-1.5 text-[#8a9ba8] bg-[#141b1e] px-2 py-1 rounded-lg border border-[#1e2a2e]">
                  <Bed size={12} />
                  <span className="font-body text-[11px] font-bold">{property.bedrooms}</span>
                </div>
              </div>
            )}
            {property.bathrooms > 0 && (
              <div className="text-center">
                <p className="font-body text-[8px] font-black text-[#4a5568] uppercase mb-1">Baths</p>
                <div className="flex items-center gap-1.5 text-[#8a9ba8] bg-[#141b1e] px-2 py-1 rounded-lg border border-[#1e2a2e]">
                  <Bath size={12} />
                  <span className="font-body text-[11px] font-bold">{property.bathrooms}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#52b788] animate-pulse" />
            <span className="font-body text-[10px] text-[#8a9ba8] font-bold uppercase tracking-widest">
              {unitCount > 0
                ? `${unitCount} Parallel Vector${unitCount !== 1 ? 's' : ''}`
                : 'Zero Vectors Initialized'
              }
            </span>
          </div>
          {unitCount > 0 && (
            <div className="text-[10px] font-black text-[#52b788] uppercase tracking-[0.2em] bg-[#1a3c2e]/20 px-3 py-1 rounded-full border border-[#2d6a4f]/20">
              {occupiedCount}/{unitCount} Occupied
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-[#1e2a2e]/30">
          <span className="font-body text-[10px] text-[#4a5568] uppercase font-black tracking-[0.15em] truncate mr-4">
            {property.tenantName ? `Lead: ${property.tenantName}` : 'Standby · No Assignment'}
          </span>
          <ArrowUpRight size={16} className="text-[#1e2a2e] group-hover:text-[#52b788] transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </Link>

      <div className="px-6 pb-6 pt-0 flex gap-3 relative z-10">
        <Link
          to={`/properties/${property.id}?tab=units`}
          className="flex-1 h-12 flex items-center justify-center gap-2 rounded-2xl border border-[#1e2a2e] hover:border-[#1a3c2e] hover:bg-[#1a3c2e]/5 text-[#4a5568] hover:text-[#e8e4de] font-body text-[10px] font-bold uppercase tracking-widest transition-all"
        >
          <DoorOpen size={14} /> Intelligence
        </Link>
        <Link
          to={`/properties/${property.id}?tab=units&action=add`}
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#1a3c2e] hover:bg-[#2d6a4f] text-[#52b788] transition-all shadow-lg shadow-[#1a3c2e]/20"
        >
          <Plus size={20} />
        </Link>
      </div>

      {showDelete && onDelete && (
        <button
          onClick={(e) => { e.preventDefault(); onDelete(); }}
          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 w-8 h-8 rounded-lg bg-[#2d1a1a] text-[#4a5568] hover:text-[#e74c3c] transition-all border border-[#3d2020]/30 flex items-center justify-center"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}
