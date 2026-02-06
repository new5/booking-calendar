# Copilot Instructions for Booking Calendar

## Project Overview
A React + Vite booking/reservation calendar application with real-time Firebase Firestore synchronization. Displays hotel/accommodation reservations with calendar views, handles cancellations and modifications, and exports data as standalone HTML files.

## Architecture

### Core Stack
- **React 19** with Vite 7 (HMR via Fast Refresh with Babel)
- **Firebase Firestore** for real-time data persistence (`src/firebase.js`)
- **Tailwind CSS 3** + PostCSS for styling
- **Lucide React** for UI icons
- **ESLint** with React hooks rules (flat config)

### Key Data Flows
1. **Firestore → React State**: `onSnapshot()` listener syncs reservation data in real-time
2. **CSV Upload**: Parses CSV files → validates → transforms → stores in Firestore
3. **Export**: Generates standalone HTML with embedded React app + JSON data bundle

### Single-File Architecture
**[src/App.jsx](src/App.jsx)** (456 lines) contains all application logic:
- `DateUtils`: Date parsing/formatting with Japanese locale support (年月日)
- `Icons`: Icon definitions from lucide-react
- `parseCSV`: CSV parser with quoted field handling and UTF-8/Shift_JIS encoding support
- `downloadStaticHtml`: Generates standalone HTML export with embedded React + JSON data
- `LoginScreen`: Passcode-protected authentication (reads `VITE_APP_PASSCODE` from .env)
- `ManualBookingModal`: Form to add new reservations manually
- `FileUploader`: Drag-drop CSV import with multi-file support
- `CancellationList` / `ModifiedList`: Collapsible alert panels for flagged reservations
- `CalendarView`: Grid/vertical calendar with smart scrolling, date ID targeting, availability rendering
- `App` component: Main orchestrator managing authentication, Firebase sync, data processing, and UI state

### Data Model
Reservations are stored in Firestore at `calendar/latest` with structure:
```json
{
  "reservations": [
    {
      "予約区分": "キャンセル|変更|" (empty for normal),
      "予約番号": "unique ID",
      "チェックイン日": "YYYY/MM/DD or YYYY-MM-DD",
      "チェックアウト日": "YYYY/MM/DD or YYYY-MM-DD",
      "宿泊者氏名": "guest name",
      "部屋タイプ名称": "room type",
      "予約サイト名称": "booking site",
      "備考1": "notes 1",
      "備考2": "notes 2"
    }
  ],
  "updatedAt": "ISO timestamp"
}
```
**Deduplication**: Uses `予約番号_部屋タイプ名称` as composite key; falls back to `氏名-チェックイン日-部屋タイプ` if number missing. Latest entry wins.

**Date filtering**: Active/cancelled/modified lists filtered by `予約区分` field and checked-in date >= today.

## Development Workflows

### Setup & Running
```bash
npm install              # Install dependencies
npm run dev              # Start Vite dev server (HMR enabled, http://localhost:5173)
npm run build            # Production build → dist/
npm run lint             # ESLint check (rules in eslint.config.js)
npm run preview          # Preview production build locally
```

### Adding Features
1. **New React components**: Keep utilities (DateUtils, Icons) at module level for reuse
2. **Styling**: Use Tailwind classes directly; no CSS-in-JS (CSS modules are in [src/App.css](src/App.css) but rarely used)
3. **Firebase operations**: Import from `./firebase.js` (`db`, `onSnapshot`, `setDoc`, `doc`)
4. **Date handling**: Always use `DateUtils` methods to ensure consistent locale/parsing

### Building & Deployment
- `npm run build` outputs optimized bundle to `dist/`
- Export feature generates **standalone HTML** with inline React + CSS (for sharing)

## Project Conventions

### Authentication
- **Method**: Passcode-based (numeric, 4+ digits)
- **Config**: `VITE_APP_PASSCODE` environment variable in `.env` (defaults to "0000" if missing)
- **Persistence**: Stored in `localStorage['calendar_auth']` as 'true'/'false'
- **Login**: `LoginScreen` component intercepts until `handleLogin()` is called
- **Logout**: Clears localStorage and resets all UI state (called manually if needed)

### Date Formatting
- **Internal**: YYYY-MM-DD (ISO format)
- **Display**: Japanese locale ("年 MM月" / "E" for weekday)
- Always use `DateUtils.parseDate()` and `DateUtils.formatDate()` to avoid timezone issues

### CSV Import Handling
- First row = headers (room types, sites derived from them)
- Columns: チェックイン日, チェックアウト日, 宿泊者氏名, 部屋タイプ名称, 予約サイト名称, 備考1, 備考2
- Rows with all empty cells auto-filtered during import
- Dates parsed as YYYY/MM/DD or YYYY-MM-DD

### State Management
- **Reservations**: Real-time array from Firestore, filtered into active/cancelled/modified lists
- **UI state** (modal visibility, month view): Local React state via `useState`
- Use `useMemo` for computed properties (availability map, grouped lists)

### UI Patterns
- **Collapsible panels**: Use `useState(false)` for `isOpen`, with `Icons.ChevronUp/ChevronDown`
- **Scroll behavior**: `useRef` + `scrollIntoView` with ID targeting (e.g., `date-YYYY-MM-DD`)
- **Orientation toggle**: `isVertical` state switches between horizontal/vertical calendar layouts

### Error Handling
- No try-catch for Firebase (assume real-time listener works; errors log to console)
- CSV parsing silently skips invalid date rows
- Modal submissions validate before `setDoc()`

## File Structure Reference
- [src/App.jsx](src/App.jsx) — Main app component (all logic)
- [src/firebase.js](src/firebase.js) — Firebase config & Firestore export
- [src/index.css](src/index.css) — Global Tailwind + custom styles
- [src/App.css](src/App.css) — Component-specific CSS (minimal usage)
- [tailwind.config.js](tailwind.config.js) — Tailwind theme (no custom theme yet)
- [vite.config.js](vite.config.js) — Vite + React plugin config
- [eslint.config.js](eslint.config.js) — ESLint rules (React hooks, no unused vars)

## Critical Integration Points

### Firebase Real-Time Sync
- Connection only established after `isAuthenticated = true`
- Uses `onSnapshot()` on `doc(db, "calendar", "latest")` to listen for changes
- Writes to Firestore with `setDoc(doc(db, "calendar", "latest"), { reservations: data, updatedAt: timestamp })`
- Data processing: `processData()` deduplicates, filters by status, and updates React state atomically

### Data Deduplication Algorithm
1. Create `Map` with composite keys: `{予約番号}_{部屋タイプ名称}`
2. If no 予約番号, fall back to: `{氏名}-{チェックイン日}-{部屋タイプ名称}`
3. Later entries override earlier ones in the map (latest wins)
4. Extract filtered arrays for active/cancelled/modified by `予約区分` field

### CSV Import Data Format
The static HTML export includes embedded JSON with `activeReservations`, `cancelledReservations`, `modifiedReservations`, and room list. When modifying export logic, ensure JSON stringification is valid.

### Responsive Calendar Layout
- Horizontal (default): Uses sticky left column for room names; horizontal scroll by date
- Vertical: Full-width day rows; vertical scroll by room
- Always check scroll container ref (`scrollContainerRef`) in both orientations
- Date targeting: `id={`date-${DateUtils.formatDate(d,'yyyy-MM-dd')}`}` for smooth scroll anchoring
