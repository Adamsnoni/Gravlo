import React, { useState } from 'react';

const fmtShort = (n, sym = "₦") => {
    if (n >= 1000000) return `${sym}${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${sym}${(n / 1000).toFixed(0)}K`;
    return `${sym}${n}`;
};

/**
 * RevenueChart - A visual representation of revenue over time.
 */
export const RevenueChart = ({ data, symbol }) => {
    const [hov, setHov] = useState(null);

    const vals = data.length > 0 ? data.map(d => d.amount) : [0, 0, 0, 0, 0, 0];
    const max = Math.max(...vals, 1);
    const min = Math.min(...vals, 0);
    const W = 100, H = 80, px = 4, py = 8;

    const pts = data.map((d, i) => ({
        x: px + (i / (Math.max(data.length - 1, 1))) * (W - px * 2),
        y: H - py - ((d.amount - min) / ((max - min) || 1)) * (H - py * 2),
    }));

    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
    const area = `${line} L${pts[pts.length - 1]?.x || W},${H} L${pts[0]?.x || 0},${H} Z`;

    return (
        <div className="w-full">
            <svg
                viewBox={`0 0 ${W} ${H}`}
                style={{ width: "100%", height: 120, display: "block", overflow: "visible" }}
                preserveAspectRatio="none"
            >
                <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1a6a3c" stopOpacity="0.14" />
                        <stop offset="100%" stopColor="#1a6a3c" stopOpacity="0.01" />
                    </linearGradient>
                </defs>

                {/* Helper grid lines */}
                {[0.25, 0.5, 0.75].map(t => (
                    <line
                        key={t}
                        x1={px}
                        y1={py + t * (H - py * 2)}
                        x2={W - px}
                        y2={py + t * (H - py * 2)}
                        stroke="#e8f0e8"
                        strokeWidth="0.5"
                        strokeDasharray="2,2"
                    />
                ))}

                {data.length > 0 && (
                    <>
                        <path d={area} fill="url(#revenueGradient)" />
                        <path d={line} fill="none" stroke="#1a6a3c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </>
                )}

                {/* Interaction points */}
                {pts.map((p, i) => (
                    <g key={i}>
                        <circle
                            cx={p.x}
                            cy={p.y}
                            r={hov === i ? 5 : 3}
                            fill={hov === i ? "#1a6a3c" : "#fff"}
                            stroke="#1a6a3c"
                            strokeWidth="2"
                            style={{ cursor: "pointer", transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)" }}
                            onMouseEnter={() => setHov(i)}
                            onMouseLeave={() => setHov(null)}
                        />
                        {hov === i && (
                            <g>
                                <rect x={p.x - 18} y={p.y - 18} width={36} height={14} rx={4} fill="#1a3c2e" />
                                <text
                                    x={p.x}
                                    y={p.y - 8}
                                    textAnchor="middle"
                                    fill="#7fffd4"
                                    fontSize="5"
                                    fontFamily="'Plus Jakarta Sans', sans-serif"
                                    fontWeight="700"
                                >
                                    {fmtShort(data[i].amount, symbol)}
                                </text>
                            </g>
                        )}
                    </g>
                ))}
            </svg>

            {/* X-Axis labels */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                {data.map((d, i) => (
                    <span
                        key={i}
                        style={{
                            fontSize: 11,
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            color: hov === i ? "#1a6a3c" : "#94a3b8",
                            fontWeight: hov === i ? 700 : 400,
                            transition: "color 0.15s"
                        }}
                    >
                        {d.month}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default RevenueChart;
