# MarkPlus Meet - Meeting Room Booking System

## Overview
World-class meeting room booking system built with Next.js 16 App Router + TypeScript. Features visual timeline booking interface, role-based access control, WIB timezone handling, email notifications, and real-time updates.

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router, Turbopack)
- **Language**: TypeScript
- **Database**: PostgreSQL (VPS at 145.79.10.104) via Prisma 6 (env: VPS_DATABASE_URL)
- **Auth**: NextAuth v5 (credentials provider, JWT sessions)
- **Styling**: Tailwind CSS 4, Framer Motion animations
- **State**: TanStack Query (per-query polling, not global)
- **Email**: Resend (optional, gracefully degrades)
- **Mobile UX**: vaul (Drawer/Bottom Sheet for mobile modals)
- **Font**: Geist Sans/Mono

## Project Structure
```
src/
├── app/
│   ├── (dashboard)/          # Protected routes with AppShell layout
│   │   ├── dashboard/        # Main dashboard with stats bento grid
│   │   ├── rooms/            # Unified room listing + daily schedule (tabs)
│   │   │   └── [roomId]/     # Timeline booking for specific room
│   │   ├── my-bookings/      # User's bookings with modify/extend/cancel
│   │   ├── analytics/        # Room usage analytics (recharts)
│   │   ├── admin/sync/       # Legacy Google Sheets sync (admin only)
│   │   ├── profile/          # User profile + settings
│   │   ├── book/             # (redirect → /rooms)
│   │   ├── schedules/        # (redirect → /rooms?tab=schedule)
│   │   └── schedule/         # (redirect → /my-bookings)
│   ├── api/
│   │   ├── auth/[...nextauth]/ # NextAuth handlers
│   │   ├── rooms/            # GET rooms with access control
│   │   ├── bookings/         # GET bookings with filters
│   │   ├── stats/            # Dashboard statistics
│   │   └── analytics/        # Analytics data
│   ├── login/                # Public login page
│   └── register/             # Public registration page
├── actions/                  # Server Actions (booking CRUD, auth, sync)
├── components/
│   ├── booking/              # Timeline, BookingModal (responsive drawer/dialog)
│   ├── dashboard/            # BentoGrid, StatsCard
│   ├── layout/               # AppShell, Sidebar, BottomNav, Header
│   └── ui/                   # Button, Card, Badge, Input, Dialog
├── hooks/                    # useMediaQuery, useIsMobile
├── lib/                      # Prisma client, timezone utils, email
├── providers/                # Session, Query, Theme providers
└── types/                    # NextAuth type extensions
prisma/
├── schema.prisma             # User, Room, Booking models
└── seed.mts                  # Seed 3 users + 10 rooms
```

## Navigation Structure
### Desktop (Sidebar + Header)
- Sidebar: Home | Rooms | My Bookings | Analytics | Profile + admin: Google Sheets Sync
- Header: Page title + subtitle (left), date/time chip, theme toggle, role badge, avatar (right)

### Mobile (Bottom Nav 4+1 + Header)
- Header: Page title only (non-sticky), no "MEET MarkPlus" branding
- Bottom Nav: Home | Rooms | Bookings | Profile | More
- More menu: Horizontal expansion bar above bottom nav (not vertical drawer) — Analytics, Sync, Sign Out laid out in a row for thumb reach

## Key Features
- **10 Rooms** (real-world specs):
  - Meet 1 (30p, Projector+Whiteboard), Meet 2 (6p), Meet 3-7 (6-8p)
  - Philip Kotler Classroom (150p), MarkPlus Gallery (100p), Museum of Marketing (50p)
- **3 Roles**: EMPLOYEE (public rooms only), ADMIN (all rooms), SUPER_ADMIN (all rooms + management)
- **Unified Rooms Page**: Tab switcher (Rooms grid + Schedule daily view)
  - Rooms tab: Search/filter, real-time availability badges, room cards with occupancy status
  - Schedule tab: Daily view with date nav, room filters, clickable booking rows
  - Booking Action Sheet: Tap booking → bottom sheet (mobile) / dialog (desktop) with Modify/Extend/Cancel/Check-in/End Early (role-based)
- **Visual Timeline**: Flexible time picker, 7 AM - 9 PM WIB, color-coded
- **Booking Actions**: Create, Modify/Reschedule, Extend, End Early, Cancel, Check-in
- **Conflict Prevention**: Server-side overlap detection
- **Real-time**: Per-query 30-60 second polling (disabled when modals open)
- **Responsive Modal**: Desktop = centered Dialog, Mobile = Bottom Sheet (vaul Drawer)
- **Dark Mode**: Class-based toggle with localStorage persistence
- **Analytics**: Room usage, daily/hourly trends (recharts)
- **Google Sheets Sync**: Two-way sync — Users (sheet "user") + Bookings (sheet "meets"), pull from sheet + push to sheet
- **Glassmorphic UI**: backdrop-blur, gradients, animations
- **Mobile-first**: Bottom nav 4+1 (mobile), collapsible sidebar (desktop)

## Room Data (Updated)
1. Meet 1: 30 people, [Projector, Whiteboard]
2. Meet 2: 6 people, [Whiteboard]
3. Meet 3: 6 people, [Monitor, Whiteboard]
4. Meet 4: 8 people, [Monitor, Whiteboard]
5. Meet 5: 8 people, [Whiteboard]
6. Meet 6: 8 people, [Whiteboard]
7. Meet 7: 8 people, [Monitor, Whiteboard]
8. Philip Kotler Classroom: 150 people, [Projector, Large Whiteboard, Sound System]
9. MarkPlus Gallery: 100 people, [Projector, Whiteboard, Sound System]
10. Museum of Marketing: 50 people, [Projector, Large Whiteboard, Sound System]

## User Credentials
- Super Admin: admin@markplus.com / admin123
- Admin: manager@markplus.com / admin123
- Employee: employee@markplus.com / employee123

## Architecture Decisions
- Prisma 6 (not v7) due to v7's breaking adapter-based client initialization
- UTC storage in DB, WIB conversion on display using date-fns-tz
- Server Actions for mutations, API routes for queries
- Custom UI components (no shadcn/ui package dependency)
- Per-query refetchInterval instead of global (prevents modal focus loss)
- vaul Drawer for mobile booking modal (industry standard bottom sheet UX)
- Unified /rooms page replaces separate /book and /schedules (fewer pages, better UX)
- Bottom nav 4+1 pattern: 4 main items + More drawer for additional options
- Old routes (/book, /schedule, /schedules) redirect to new routes for backward compatibility

## User Preferences
- Communicate in Bahasa Indonesia in chat

## Running
- Dev: `npm run dev` (port 5000)
- Build: `npm run build`
- Seed: `npx tsx prisma/seed.mts`
