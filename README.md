

<p align="center" style="margin-bottom: 0">
  <img src="./assets/livrux.png" width="120" />
</p>

<h1 align="center" >Livrux</h1>

<p align="center">
  📚 Gamify children's reading with rewards  💰
</p>

<p align="center" style="margin-top: 10px;">
  <strong>Turn pages into coins. Make reading an adventure.</strong>
</p>

Livrux is a cross-platform mobile app (iOS & Android) that gamifies reading for kids. Parents create reader profiles for their children and define a custom reward formula — every book a child finishes earns them **Livrux coins** based on the number of pages read. A virtual wallet tracks their growing balance and full reading history.

Children spend their Livrux coins in real life (a treat, a trip, an activity) and log each expense in the app with a short description of where the coins went. Every transaction — earned or spent — is recorded in the wallet history.

---

## ✨ Features

- **Multiple readers per account** — manage all your kids from a single login
- **Custom reward formula** — set a base reward + a per-page rate; configure bonus rules (min pages, foreign language) — Livrux calculates coins automatically
- **Smart book entry** — search by title/author via Google Books API or scan the ISBN barcode with the camera; title, author, pages, and cover are filled automatically
- **Live coin preview** — as you type the page count when logging a book, the earned coins update in real time
- **Book status** — log a book as *currently reading* or *completed*; complete it later via a dedicated flow that awards coins and checks badges
- **Book ratings** — readers can rate each book as 👎 disliked / 👍 liked / ❤️ loved and leave a free-text review
- **Book library** — each book stores title, author, page count, cover, date started, date completed, and reading notes
- **Virtual wallet** — full transaction history with earned and spent coins per reader
- **Reading streaks** — daily streak counter based on reading sessions (long books) or completed short books; all-time best streak tracked
- **XP system** — separate gamification score earned through badges and reading sessions; shown on friend profiles for friendly competition
- **Badges** — 10 unlockable badges (first book, bookworms, page hunters, polyglot, streak milestones, book club); awarded automatically on book completion, revoked with XP claw-back if a book is deleted and criteria no longer met
- **Friends** — readers connect via unique 6-character codes; send, accept, and reject friend requests; browse a friend's public book list and badges; parental controls let parents decide whether a reader can manage friendships independently
- **Avatars** — seed-based Multiavatar generation (no file uploads)
- **Parental controls** — PIN protection for settings (parental PIN) and individual reader profiles (per-reader PIN); configurable unlock duration
- **Account deletion** — full GDPR-compliant self-service account deletion with double confirmation; cascades to all user data; consent record retained 3 years
- **GDPR / DSGVO compliance** — consent checkbox at sign-up with links to Privacy Policy and Terms of Use; consent timestamp stored; 3-year post-deletion audit log; contact: livrux@fecastro.com
- **Secure authentication** — email/password sign-up with Supabase Auth (Google & Apple OAuth ready)
- **3 languages** — English, German, and Portuguese; auto-detected from device locale, switchable in-app
- **Error boundaries** — graceful in-app error fallback screen; developer error details shown in `__DEV__` mode
- **Modern design** — warm, playful UI designed for families, with custom fonts and smooth interactions; visual identity distinguishes reader screens (dusty blue) from friend screens (soft jade)

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
| **Backend / Database** | [Supabase](https://supabase.com) | PostgreSQL with relational integrity, Row-Level Security, built-in Auth, Edge Functions |
| **Authentication** | Supabase Auth | Email/password + Google/Apple OAuth; JWT sessions persisted via AsyncStorage |
| **State management** | [Zustand](https://zustand-demo.pmnd.rs) | Lightweight stores for auth session and selected reader context |
| **Forms & validation** | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) | Type-safe form validation with minimal re-renders |
| **Internationalization** | [i18next](https://www.i18next.com) + [expo-localization](https://docs.expo.dev/versions/latest/sdk/localization/) | Device locale auto-detection; runtime language switching |
| **Book search** | [Google Books API](https://developers.google.com/books) | Auto-fill title, author, cover, and page count by text search or ISBN barcode |
| **Avatars** | [Multiavatar](https://multiavatar.com) | Seed-based avatar generation — no image uploads required for reader profiles |
| **Image handling** | expo-camera | ISBN barcode scanning; book cover from Google Books |
| **Typography** | Fredoka One (headings) + Nunito (body) | Rounded, friendly, and highly legible — designed for kids and parents |

---

### Project Structure

```
livrux/
├── app/                        # Expo Router — every file is a route
│   ├── _layout.tsx             # Root layout: font loading, auth gate, session listener, ErrorBoundary
│   ├── index.tsx               # Home screen — reader picker grid
│   ├── auth/
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx         # Includes GDPR consent checkbox + Terms / Privacy links
│   │   └── forgot-password.tsx
│   └── app/
│       ├── _layout.tsx         # Bottom tab navigator (Home · Wallet · Settings)
│       ├── reader/
│       │   ├── [id].tsx        # Reader dashboard (balance, streak, badges, books list)
│       │   └── add.tsx         # Add / edit reader
│       ├── book/
│       │   ├── add.tsx         # Log a book (live coin preview, status, rating)
│       │   └── [id].tsx        # Book detail
│       ├── rewards/
│       │   └── index.tsx       # Livrux wallet & transaction history
│       ├── spend.tsx           # Log a real-life Livrux expense
│       └── settings/
│           ├── index.tsx       # Account, legal links, sign out, delete account
│           ├── edit-name.tsx   # Edit display name
│           └── formula.tsx     # Reward formula editor
│
├── src/
│   ├── components/
│   │   ├── ErrorBoundary.tsx   # Class-based error boundary with friendly fallback UI
│   │   ├── ui/                 # Button, TextInput — reusable primitives
│   │   ├── reader/             # ReaderCard
│   │   └── book/               # BookCard, BookSearchBar
│   ├── hooks/
│   │   ├── useReaders.ts       # CRUD for reader profiles
│   │   ├── useBooks.ts         # CRUD for book logs
│   │   └── useLivrux.ts        # Transaction history + logBookRpc + spendLivruxRpc
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
│   │   ├── config.ts           # Default formula values, image size limits
│   │   └── legal.ts            # Privacy Policy and Terms of Use URLs
│   └── i18n/
│       ├── index.ts            # i18next configuration + locale detection
│       └── locales/
│           ├── en.ts           # English
│           ├── de.ts           # German
│           └── pt.ts           # Portuguese
│
├── supabase/
│   ├── migrations/
│   │   ├── 0001_schema.sql     # Complete baseline schema (all tables, policies, RPCs, seed data)
│   │   └── 0002_gdpr.sql       # GDPR additions: terms_accepted_at + consent_logs
│   └── functions/
│       └── delete-account/
│           └── index.ts        # Edge Function: validates JWT, copies consent record, deletes user
│
└── web/                        # Static marketing & legal pages (hosted at livrux.app)
    ├── index.html              # Landing page (EN / PT / DE)
    ├── privacy.html            # Privacy Policy (EN / PT / DE)
    └── terms.html              # Terms of Use (EN / PT / DE)
```

---

### Database Schema

```
auth.users                ← managed by Supabase Auth
user_profiles             ← display name, parental PIN, consent timestamp (terms_accepted_at)
reward_formulas           ← base_reward + per_page_rate + bonus_rules (JSON)
readers                   ← name, avatar_seed, livrux_balance, xp, pin, friend_code, friends_autonomy
books                     ← title, author, total_pages, cover_url, livrux_earned,
                             status (reading|completed), date_start, date_completed,
                             is_foreign_language, rating, review
livrux_transactions       ← immutable audit log of every coin credit/debit
reading_sessions          ← daily last_page per reader/book; drives streak & XP for long books
reader_friendships        ← requester_id, addressee_id, status (pending|accepted|rejected)
badges                    ← static catalog (10 badges, seeded)
reader_badges             ← one row per (reader, badge) earned; stores bonus_xp awarded
xp_transactions           ← immutable audit log of every XP credit/debit
consent_logs              ← GDPR audit log (no FK to auth.users; survives account deletion)
```

All tables use **Row-Level Security** — users can only access their own data. Friend visibility is layered on top via separate SELECT policies. A `SECURITY DEFINER` helper (`my_reader_ids()`) breaks the RLS recursion cycle between `readers` and `reader_friendships`.

Key atomic RPC functions (all `SECURITY DEFINER`):

| Function | Returns | Description |
|---|---|---|
| `log_book(...)` | `JSONB` | Insert book + award Livrux + award XP (short books) + check badges |
| `complete_book(...)` | `JSONB` | Transition reading→completed + award Livrux + XP + check badges |
| `delete_book(p_book_id)` | `JSONB` | Delete book + deduct Livrux + revoke unqualified badges |
| `update_book(...)` | `VOID` | Update fields + record Livrux delta as audit transaction |
| `spend_livrux(...)` | `VOID` | Log real-life expense + deduct coins |
| `log_reading_session(...)` | `JSONB` | Upsert daily session + award XP (long books, 1 XP/page) |
| `check_and_award_badges(p_reader_id)` | `TABLE` | Evaluate and insert newly earned badges |
| `check_book_club_badge(p_reader_id)` | `BOOLEAN` | Award book_club badge if two friends read the same title |
| `revoke_unqualified_badges(p_reader_id)` | `TABLE` | Revoke badges + claw back XP (floor: 0) after book deletion |
| `calculate_streak(p_reader_id)` | `INTEGER` | Current active reading streak in days |
| `get_streak_info(p_reader_id)` | `TABLE` | Current streak + all-time best streak |
| `search_reader_by_code(p_code)` | `TABLE` | Find a reader by friend code (bypasses RLS safely) |

#### Reward Formula

```
Livrux earned = base_reward + (total_pages × per_page_rate) + bonuses
```

Each account has its own formula. The default is `2 + (pages × 0.01)` — a 200-page book earns **4 Livrux**.

Bonus rules are stored as a JSON array in `reward_formulas.bonus_rules` and evaluated at book-log time:

| Rule type | Condition | Config |
|---|---|---|
| `min_pages` | `total_pages >= threshold` | threshold (pages), bonus amount |
| `foreign_language` | book marked as foreign language at log time | bonus amount |

#### XP System

XP is a non-spendable gamification score separate from Livrux coins:

- **Short books** (≤ 100 pages): earn XP = total page count on completion
- **Long books** (> 100 pages): earn 1 XP per page advanced in each reading session
- **Badges**: each badge awards a fixed XP bonus (50–1000 XP depending on difficulty)
- XP is shown on friend profiles and used as a friendly ranking metric

#### Badges

| Badge | Slug | Criteria | XP Bonus |
|---|---|---|---|
| 📖 First Book | `first_book` | 1 book completed | 50 |
| 🐛 Bookworm | `bookworm_5` | 5 books completed | 100 |
| 📜 Page Hunter | `page_hunter_500` | 500 total pages | 50 |
| 🔥 Streak Week | `streak_7` | 7-day reading streak | 100 |
| 🦋 Bookworm Pro | `bookworm_25` | 25 books completed | 250 |
| 🌍 Polyglot | `polyglot` | 3 foreign-language books | 150 |
| 🤝 Book Club | `book_club` | Same title as a friend | 100 |
| ⚡ Streak Month | `streak_30` | 30-day reading streak | 500 |
| 🗺️ Page Hunter Pro | `page_hunter_5000` | 5,000 total pages | 500 |
| 🏆 Centurion | `centurion` | 100 books completed | 1,000 |

---

### GDPR / DSGVO Compliance

Livrux is operated by **Fernanda Castro**, Germany. Contact: livrux@fecastro.com

- **Consent at sign-up** — users must explicitly accept the Terms of Use and Privacy Policy; the timestamp is stored in `user_profiles.terms_accepted_at`
- **Account deletion** — available in Settings → Danger Zone; double-confirmation required; the Supabase Edge Function `delete-account` cascades deletion to all personal data
- **Consent audit log** — before deletion, the consent record is copied to `consent_logs` (no FK to `auth.users`, so it survives the cascade); records are retained for 3 years (`retain_until`) as required by GDPR Art. 6
- **Legal pages** — Privacy Policy and Terms of Use hosted at `livrux.app` in English, German, and Portuguese; linked from the sign-up screen and Settings

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

Edit `.env` with your Supabase project credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY=your-google-books-api-key-here
```

### 3. Set up the database

In the Supabase dashboard, open the **SQL Editor** and run the migrations in order:

```
supabase/migrations/0001_schema.sql   ← full schema, all RPCs, seed data
supabase/migrations/0002_gdpr.sql     ← GDPR additions (consent timestamp + audit log)
```

Or push via the Supabase CLI:

```bash
supabase db push
```

### 4. Deploy the Edge Function

```bash
supabase functions deploy delete-account
```

The function requires `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` — these are automatically injected in hosted Supabase projects.

### 5. Start the app

```bash
npx expo start
```

Scan the QR code with [Expo Go](https://expo.dev/go) on your phone, or press `a` for Android emulator / `i` for iOS simulator.

---

## 🌍 Internationalization

The app ships with full translations for **English**, **German**, and **Portuguese**. The language is auto-detected from the device locale on first launch and can be changed at any time in **Settings → Language** without restarting the app.

The legal pages (`web/privacy.html`, `web/terms.html`) also support all three languages with automatic detection from `localStorage`.

To add a new language:
1. Create `src/i18n/locales/{lang}.ts` following the structure of the existing files
2. Register it in `src/i18n/index.ts`
3. Add the flag and label to the Settings language list

---

## 📦 Building for the App Store

This project is configured for [EAS Build](https://docs.expo.dev/build/introduction/).

```bash
# Development build (simulator)
eas build --profile development --platform ios

# Preview build (TestFlight)
eas build --profile preview --platform ios

# Production build (App Store)
eas build --profile production --platform ios
eas submit --platform ios
```

Before submitting, fill in the `ascAppId` and `appleTeamId` fields in `eas.json`.

---

## 🗺️ Roadmap

- [x] Book search via ISBN / Google Books API (auto-fill title, author, cover, pages)
- [x] Real-life Livrux spending — log expenses with amount and description
- [x] Bonus rules — min pages threshold and foreign language bonuses configurable per account
- [x] Milestone celebrations — confetti animation with animated book-count flip after each book is logged
- [x] **Friends** — connect readers via unique 6-character codes; send/accept/reject friend requests; browse a friend's public book list and badges; parental autonomy setting
- [x] **Reading streaks & badges** — 10 badges, XP system, streak tracking, automatic award and revocation
- [x] **Book status** — track books from first page to last; complete them later with a dedicated flow
- [x] **Book ratings** — disliked / liked / loved + free-text review
- [x] **Parental controls** — PIN protection for settings and individual reader profiles
- [x] **GDPR / DSGVO compliance** — consent at sign-up, self-service account deletion, 3-year consent audit log
- [x] **EAS Build** — configured for development, preview (TestFlight), and production (App Store) builds
- [x] **Error boundaries** — graceful in-app error fallback with reset
- [ ] Dark mode
- [ ] Push notifications for reading reminders
- [ ] Google & Apple OAuth sign-in

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---

## 📄 License

MIT
