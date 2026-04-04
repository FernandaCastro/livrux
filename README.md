# 📚 Livrux

> **Turn pages into coins. Make reading an adventure.**

Livrux is a cross-platform mobile app (iOS & Android) that gamifies reading for kids. Parents create reader profiles for their children and define a custom reward formula — every book a child finishes earns them **Livrux coins** based on the number of pages read. A virtual wallet tracks their growing balance and full reading history.

---

## ✨ Features

- **Multiple readers per account** — manage all your kids from a single login
- **Custom reward formula** — set a base reward + a per-page rate; Livrux calculates coins automatically
- **Smart book entry** — search by title/author via Google Books API or scan the ISBN barcode with the camera; all fields (title, author, pages, cover) are filled automatically
- **Live coin preview** — as you type the page count when logging a book, the earned coins update in real time
- **Book library** — each book stores title, author, page count, cover photo, and date completed
- **Virtual wallet** — full transaction history with earned/spent coin tracking per reader
- **Profile photos** — readers and books have photo support via device camera or gallery
- **Secure authentication** — email/password sign-up with Supabase Auth (Google & Apple OAuth ready)
- **3 languages** — English, German, and Portuguese; auto-detected from device locale, switchable in-app
- **Modern design** — warm, playful UI designed for families, with custom fonts and smooth interactions

---

## 📱 Screenshots

> _Coming soon — run the app locally to see it in action._

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Mobile framework** | [Expo](https://expo.dev) (React Native) | Single codebase for iOS & Android; managed workflow with camera, image picker, and secure storage built-in |
| **Navigation** | [Expo Router v4](https://expo.github.io/router) | File-based routing, typed routes, nested layouts |
| **Backend / Database** | [Supabase](https://supabase.com) | PostgreSQL with relational integrity, Row-Level Security, built-in Auth, and Storage for images |
| **Authentication** | Supabase Auth | Email/password + Google/Apple OAuth; JWT sessions persisted via AsyncStorage |
| **State management** | [Zustand](https://zustand-demo.pmnd.rs) | Lightweight stores for auth session and selected reader context |
| **Forms & validation** | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) | Type-safe form validation with minimal re-renders |
| **Internationalization** | [i18next](https://www.i18next.com) + [expo-localization](https://docs.expo.dev/versions/latest/sdk/localization/) | Device locale auto-detection; runtime language switching |
| **Book search** | [Google Books API](https://developers.google.com/books) | Auto-fill title, author, cover, and page count by text search or ISBN barcode |
| **Image handling** | expo-image-picker + expo-image-manipulator + expo-camera | Pick from gallery or camera; resize & compress before upload; barcode scanning for ISBN |
| **Typography** | Fredoka One (headings) + Nunito (body) | Rounded, friendly, and highly legible — designed for kids and parents |

---

### Project Structure

```
livrux/
├── app/                        # Expo Router — every file is a route
│   ├── _layout.tsx             # Root layout: font loading, auth gate, session listener
│   ├── index.tsx               # Home screen — reader picker grid
│   ├── auth/
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   └── forgot-password.tsx
│   └── app/
│       ├── _layout.tsx         # Bottom tab navigator (Home · Wallet · Settings)
│       ├── reader/
│       │   ├── [id].tsx        # Reader dashboard (balance, books list)
│       │   └── add.tsx         # Add / edit reader
│       ├── book/
│       │   ├── add.tsx         # Log a book (live coin preview)
│       │   └── [id].tsx        # Book detail
│       ├── rewards/
│       │   └── index.tsx       # Livrux wallet & transaction history
│       └── settings/
│           ├── index.tsx       # Account, language, sign out
│           └── formula.tsx     # Reward formula editor
│
├── src/
│   ├── components/
│   │   ├── ui/                 # Button, TextInput — reusable primitives
│   │   ├── reader/             # ReaderCard
│   │   └── book/               # BookCard, BookSearchBar
│   ├── hooks/
│   │   ├── useReaders.ts       # CRUD for reader profiles
│   │   ├── useBooks.ts         # CRUD for book logs
│   │   └── useLivrux.ts        # Transaction history + atomic logBookRpc
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client singleton
│   │   ├── formula.ts          # Livrux calculation engine (pure function)
│   │   ├── googleBooks.ts      # Google Books API — text search + ISBN lookup
│   │   └── storage.ts          # Image upload/delete helpers
│   ├── stores/
│   │   ├── authStore.ts        # Zustand: session, user profile, formula
│   │   └── readerStore.ts      # Zustand: selected reader context
│   ├── types/index.ts          # TypeScript interfaces matching the DB schema
│   ├── constants/
│   │   ├── theme.ts            # Colors, fonts, spacing, border radii, shadows
│   │   └── config.ts           # Default formula values, image size limits
│   └── i18n/
│       ├── index.ts            # i18next configuration + locale detection
│       └── locales/
│           ├── en.ts           # English
│           ├── de.ts           # German
│           └── pt.ts           # Portuguese
│
└── supabase/
    └── migrations/
        └── 0001_initial_schema.sql   # Full DB schema, RLS policies, RPC, trigger
```

---

### Database Schema

```
auth.users              ← managed by Supabase Auth
user_profiles           ← display name, avatar
reward_formulas         ← base_reward + per_page_rate + bonus_rules (JSON)
readers                 ← name, avatar_url, livrux_balance
books                   ← title, author, total_pages, cover_url, livrux_earned, date_completed
livrux_transactions     ← immutable audit log of every coin credit/debit
```

All tables are protected by **Row-Level Security** — users can only access their own data. The `log_book` database function performs book insertion, transaction recording, and balance update **atomically** in a single transaction.

#### Reward Formula

```
Livrux earned = base_reward + (total_pages × per_page_rate) + bonuses
```

Each account has its own formula. The default is `5 + (pages × 0.1)` — a 200-page book earns **25 Livrux**.

---

### Design System

| Token | Value |
|---|---|
| Primary (gold) | `#F5A623` |
| Secondary (purple) | `#7B5EA7` |
| Accent (coral) | `#FF6B6B` |
| Background | `#FAFAF7` |
| Border radius — cards | `16px` |
| Border radius — buttons | `24px` |
| Heading font | Fredoka One |
| Body font | Nunito |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo-cli`)
- A [Supabase](https://supabase.com) project (free tier is sufficient)

### 1. Clone and install

```bash
git clone https://github.com/FernandaCastro/livrux.git
cd livrux
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase project credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Set up the database

In the Supabase dashboard, open the **SQL Editor** and run the migration:

```
supabase/migrations/0001_initial_schema.sql
```

This creates all tables, RLS policies, the `log_book` RPC, and the sign-up trigger.

Also create two **Storage buckets** in the Supabase dashboard:
- `avatars` — for reader profile photos
- `book-covers` — for book cover images

### 4. Start the app

```bash
npx expo start
```

Scan the QR code with [Expo Go](https://expo.dev/go) on your phone, or press `a` for Android emulator / `i` for iOS simulator.

---

## 🌍 Internationalization

The app ships with full translations for **English**, **German**, and **Portuguese**. The language is auto-detected from the device locale on first launch and can be changed at any time in **Settings → Language** without restarting the app.

To add a new language:
1. Create `src/i18n/locales/{lang}.ts` following the structure of the existing files
2. Register it in `src/i18n/index.ts`
3. Add the flag and label to the Settings language list

---

## 🗺️ Roadmap

- [ ] Spending / redeeming Livrux coins (reward shop)
- [ ] Milestone celebrations (confetti animation on balance thresholds)
- [x] Book search via ISBN / Google Books API (auto-fill title, author, cover, pages)
- [ ] Reading streaks and badges
- [ ] Dark mode
- [ ] Push notifications for reading reminders
- [ ] EAS Build + App Store / Google Play deployment

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

MIT
