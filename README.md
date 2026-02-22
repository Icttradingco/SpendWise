# 💸 SpendWise – Expense Tracker PWA

A **mobile-first, production-ready Progressive Web App** for tracking daily expenses with a powerful **payment settlement system**. Works fully **offline**, no signup required, all data stored locally on your device.

---

## ✅ Completed Features

### 🏠 Dashboard
- Today's spending summary
- Monthly total
- Outstanding (Unpaid) total with glow indicators
- Settled (Paid) total
- Outstanding balance breakdown by category with progress bars
- **Quick "Pay" buttons** per category
- Last 7-day spending bar chart (today highlighted)
- Monthly category pie/donut chart
- Recent transactions list

### ➕ Expense Entry
- Amount input (numeric keypad on mobile)
- Visual category grid selector (icon + color)
- Date picker
- Optional note
- Default status: **UNPAID**

### 💳 Settlement System (Core Feature)
- Per-category settlement workflow
- Shows: oldest unpaid date, latest unpaid date, total unpaid
- Select a "Paid Up To" date
- **Live preview** of expenses that will be settled
- One-tap: all expenses ≤ paid date marked as PAID
- Settled expenses remain in history (shown as ✅ Paid)
- Excluded from future unpaid calculations

### 📋 Transactions Page
- Full expense history grouped by date
- Filter by: Status (All/Paid/Unpaid), Category, Date range
- Sort by: Date (newest/oldest), Amount (high/low)
- Edit and Delete individual expenses
- Active filter count display

### ⚙️ Settings
- **12 Currency options**: ₹, $, €, £, ¥, ₩, A$, C$, Fr, R$, د.إ, ﷼
- **Light/Dark mode** toggle (persisted)
- **Category management**: Add, edit, delete with custom icons & colors
- 20 icon choices, 12 color options
- **Reset All Data** with confirmation

### 📤 Export
- **PDF Export** (jsPDF + autotable): Summary block + full transaction table with status column
- **Excel Export** (SheetJS): Expenses sheet + Summary sheet
- Filter before export: All / Paid Only / Unpaid Only
- Optional date range filter

### 📱 PWA
- Installable on mobile/desktop
- Offline-first with Service Worker caching
- App manifest with icons
- Bottom navigation with badge count for unpaid categories
- Safe area insets for iOS notch support

---

## 🗂 File Structure

```
index.html          # Main SPA entry point
manifest.json       # PWA manifest
sw.js               # Service Worker (offline cache)
js/
  db.js             # IndexedDB service layer
  app.js            # React components + app logic
icons/
  icon-192.png      # PWA icon (192x192)
  icon-512.png      # PWA icon (512x512)
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 (UMD/CDN) |
| Styling | Tailwind CSS (CDN) |
| Charts | Recharts 2.x |
| PDF Export | jsPDF + autotable |
| Excel Export | SheetJS (XLSX) |
| Storage | IndexedDB (via custom wrapper) |
| PWA | Service Worker + Web App Manifest |
| Icons | Font Awesome 6 |
| Fonts | Google Fonts (Inter) |

---

## 📦 Data Model

### Expense
```json
{
  "id": "uuid",
  "amount": 150.00,
  "category": "food",
  "date": "2026-02-22",
  "note": "Lunch at canteen",
  "status": "unpaid | paid",
  "paidDate": null | "2026-02-28",
  "createdAt": 1708599999000
}
```

### Category
```json
{
  "id": "uuid | default-id",
  "name": "Food",
  "icon": "fa-utensils",
  "color": "#f59e0b"
}
```

### Settings (key-value)
```
currency → "₹"
darkMode → true | false
```

---

## 🧪 Edge Cases Handled
- ✅ No partial payments – full settlement only per category
- ✅ Paying with no unpaid expenses → shows "All Settled" message
- ✅ Settlement preview shows exact expenses to be settled
- ✅ Currency change does NOT retroactively change past amounts
- ✅ Delete confirmation modal prevents accidental deletion
- ✅ Category delete does not break existing expense display
- ✅ Reset all data reinitializes default categories automatically

---

## 🚀 Navigation

| Tab | Path/Trigger | Description |
|-----|-------------|-------------|
| Home/Dashboard | `tab=dashboard` | Overview + charts |
| Transactions | `tab=expenses` | Full list with filters |
| Settle | `tab=settle` | Payment settlement workflow |
| Export | `tab=export` | PDF/Excel download |
| Settings | `tab=settings` | Currency, theme, categories |

---

## 💡 Perfect For

- 🍱 Monthly food/mess bill settlements
- 🏠 Hostel rent tracking  
- 🛒 Shared grocery settlements
- 💳 Credit-based daily spending tracking

---

## 🔮 Recommended Next Steps

1. **Partial payment support** – Allow settling a specific amount instead of full category
2. **Settlement history** – View past settlement dates and amounts
3. **Reminders** – "Food bill pending for 7 days" notification
4. **Monthly auto-close** – Auto-archive previous month's expenses
5. **Budget limits** – Set monthly budget per category with alerts
6. **Recurring expenses** – Auto-add monthly rent/utilities
7. **Data backup** – Export/import full database as JSON
8. **Multiple profiles** – Separate tracking for different contexts
