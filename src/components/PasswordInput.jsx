// src/components/PasswordInput.jsx
// Reusable password field with independent visibility toggle.
// Fixes the bug where a single showPass state controlled both fields.

import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

/**
 * @param {string}   id           - Unique field id (for autoComplete, aria)
 * @param {string}   label        - Label text shown above input
 * @param {string}   value        - Controlled value
 * @param {function} onChange     - Change handler
 * @param {string}   placeholder  - Placeholder text
 * @param {string}   autoComplete - autoComplete attribute value
 * @param {boolean}  required     - Whether field is required
 */
export default function PasswordInput({
  id,
  label,
  value,
  onChange,
  placeholder = 'Enter password',
  autoComplete = 'off',
  required = false,
}) {
  // Each instance manages its own visibility — independent from sibling fields
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className="block font-body text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5"
      >
        {label}
      </label>
      <div className="relative">
        <Lock
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
          aria-hidden="true"
        />
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          className="input-base pl-10 pr-10"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          aria-label={label}
        />
        <button
          type="button"
          onClick={() => setVisible(v => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage rounded"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
