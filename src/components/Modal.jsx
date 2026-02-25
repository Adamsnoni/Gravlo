// src/components/Modal.jsx
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const maxW = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#070b0d]/80 backdrop-blur-xl"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-full ${maxW} bg-[#0d1215] border border-[#1e2a2e] rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl z-10 max-h-[90vh] flex flex-col overflow-hidden`}
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#1a3c2e] via-[#52b788] to-[#1a3c2e]" />

            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#1e2a2e]/50 bg-[#0d1215] z-10">
              <h2 className="font-display font-bold text-[#e8e4de] text-xl tracking-tight">{title}</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#141b1e] border border-[#1e2a2e] text-[#4a5568] hover:text-[#e8e4de] transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 text-[#8a9ba8] overflow-y-auto no-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
