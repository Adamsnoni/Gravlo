# 🏠 LeaseEase Web — React + Firebase Property Management

A full-featured, production-grade **web application** for real estate management. Built with **React 18 + Vite**, **Tailwind CSS**, **Firebase** (Auth + Firestore), **Framer Motion** animations, and **Recharts** analytics.

## ✨ Features

| Feature | Details |
|---|---|
| 🔐 **Firebase Auth** | Email/password login, registration, forgot password |
| 🏢 **Property Management** | Add, view, search, filter, delete properties |
| 💰 **Payment Tracking** | Cross-property payment history, status tracking |
| 🔔 **Rent Reminders** | Create reminders with overdue/urgent/soon categorization |
| 🔧 **Maintenance Tracker** | Log issues, set priorities, cycle through statuses |
| 📊 **Revenue Analytics** | Area chart, occupancy metrics, revenue totals |
| 🎨 **Polished UI** | Cream/ink/sage "Editorial Lux" design system, smooth animations |
| 📱 **Responsive** | Full mobile drawer, works on all screen sizes |

---

## 📁 Project Structure

```
LeaseEaseWeb/
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── package.json
│
└── src/
    ├── main.jsx
    ├── App.jsx                    # Router + AuthProvider
    ├── index.css                  # Global styles + Tailwind
    │
    ├── context/
    │   └── AuthContext.jsx        # Firebase auth state
    │
    ├── services/
    │   └── firebase.js            # All Firebase operations
    │
    ├── pages/
    │   ├── LoginPage.jsx
    │   ├── RegisterPage.jsx
    │   ├── DashboardPage.jsx      # Stats, chart, alerts
    │   ├── PropertiesPage.jsx     # List + Add modal
    │   ├── PropertyDetailPage.jsx # Tabbed detail view
    │   ├── RemindersPage.jsx      # Full reminders management
    │   ├── PaymentsPage.jsx       # Cross-property payments table
    │   └── SettingsPage.jsx       # Profile + notification prefs
    │
    └── components/
        ├── AppShell.jsx           # Sidebar + mobile nav
        ├── PropertyCard.jsx
        ├── PaymentRow.jsx
        ├── StatusBadge.jsx
        └── Modal.jsx              # Animated sheet/dialog
```

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase

Open `src/services/firebase.js` and replace:

```js
const firebaseConfig = {
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_PROJECT_ID.firebaseapp.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId:             'YOUR_APP_ID',
};
```

Get these from: [Firebase Console](https://console.firebase.google.com) → Project Settings → Your apps → Web

### 3. Enable Firebase services

In your Firebase Console:
- **Authentication** → Email/Password (enable)
- **Firestore Database** → Create database (start in test mode)

### 4. Run development server

```bash
npm run dev
# Opens at http://localhost:5173
```

### 5. Build for production

```bash
npm run build
# Output in /dist
```

---

## 🗄️ Firestore Schema

```
users/{uid}
  fullName, email, phone, createdAt

  properties/{propertyId}
    name, address, type, status, monthlyRent,
    bedrooms, bathrooms, sqft, description,
    tenantName, tenantEmail, tenantPhone,
    createdAt, updatedAt

    payments/{paymentId}
      amount, status, method, paidDate,
      tenantName, propertyName, notes,
      referenceNumber, recordedAt

    maintenance/{ticketId}
      title, description, priority, status, createdAt

  reminders/{reminderId}
    tenantName, propertyId, propertyName,
    amount, dueDate, recurring,
    notifyDaysBefore, notes, status, createdAt
```

---

## 🔒 Firestore Security Rules

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy with: `firebase deploy --only firestore:rules`

---

## 🎨 Design System

**Aesthetic:** "Editorial Lux" — warm cream paper backgrounds, deep ink type, sage green accents. Inspired by premium real estate publications.

| Token | Value |
|---|---|
| Background | `#F5F0E8` (warm cream) |
| Ink (text) | `#1A1612` |
| Sage (primary) | `#4A7C59` |
| Amber (warning) | `#C8842A` |
| Rust (danger) | `#B84C3A` |
| Font display | Playfair Display |
| Font body | DM Sans |

---

## 🚢 Deployment

### Vercel (recommended)

```bash
npm install -g vercel
vercel --prod
```

### Netlify

```bash
npm run build
# Drag /dist folder to netlify.com
```

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase init hosting
npm run build
firebase deploy
```

> ⚠️ For SPA routing, set rewrites: all routes → `/index.html`

---

## 📦 Key Dependencies

| Package | Purpose |
|---|---|
| `vite` | Build tool + dev server |
| `react-router-dom` | Client-side routing |
| `firebase` | Auth + Firestore |
| `framer-motion` | Animations + transitions |
| `recharts` | Revenue area chart |
| `tailwindcss` | Utility-first styling |
| `react-hot-toast` | Toast notifications |
| `lucide-react` | Icon set |
| `date-fns` | Date formatting & diff |

---

MIT © 2024 LeaseEase
