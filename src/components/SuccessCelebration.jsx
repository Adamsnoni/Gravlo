// src/components/SuccessCelebration.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper, Trophy, Rocket, ChevronRight } from "lucide-react";

export default function SuccessCelebration({ planName, onComplete }) {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        const newParticles = Array.from({ length: 50 }).map((_, i) => ({
            id: i,
            left: Math.random() * 100 + "vw",
            delay: Math.random() * 2 + "s",
            size: Math.random() * 8 + 4 + "px",
            color: ["#7fffd4", "#1a3c2e", "#ffd700", "#ffffff", "#16a34a"][Math.floor(Math.random() * 5)]
        }));
        setParticles(newParticles);

        const timer = setTimeout(onComplete, 6000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center bg-[#1a3c2e]/95 backdrop-blur-sm">
            <style>{`
                @keyframes fall {
                    0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
                }
                .confetti {
                    position: absolute;
                    top: -20px;
                    animation: fall linear forwards;
                    border-radius: 2px;
                }
            `}</style>

            {/* Confetti Rain */}
            {particles.map(p => (
                <div key={p.id} className="confetti" style={{
                    left: p.left,
                    backgroundColor: p.color,
                    width: p.size,
                    height: p.size,
                    animationDuration: (parseFloat(p.delay) + 3) + "s",
                    animationDelay: (Math.random() * 0.5) + "s"
                }} />
            ))}

            {/* Celebration Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="relative bg-white p-12 rounded-[40px] shadow-2xl max-w-md w-full mx-4 text-center overflow-hidden"
            >
                {/* Decorative Glow */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#7fffd4] via-[#1a3c2e] to-[#ffd700]" />
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#1a6a3c]/5 rounded-full blur-3xl" />

                <div className="w-24 h-24 bg-[#f4fbf7] rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border-2 border-[#1a6a3c]">
                    <Trophy size={48} className="text-[#1a6a3c]" strokeWidth={2.5} />
                </div>

                <div className="mb-8">
                    <div className="inline-block bg-[#1a3c2e] text-[#7fffd4] px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                        Elite Status Enabled
                    </div>
                    <h1 className="font-fraunces text-4xl font-black italic text-[#1a2e22] mb-4 leading-tight">
                        Welcome to {planName}!
                    </h1>
                    <p className="font-jakarta text-[#6b8a7a] font-medium text-sm italic leading-relaxed">
                        Your protocol upgrade is complete. New features, high-fidelity analytics, and automated workflows are now unlocked in your dashboard.
                    </p>
                </div>

                <button
                    onClick={onComplete}
                    className="w-full bg-[#1a3c2e] text-[#7fffd4] py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:shadow-xl transition-all group"
                >
                    Initialize Dashboard <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </motion.div>
        </div>
    );
}
