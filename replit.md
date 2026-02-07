# MarkPlus Meet - Meeting Room Booking System

## Overview
World-class meeting room booking system built with Next.js 16 App Router + TypeScript. Features visual timeline booking interface, role-based access control, WIB timezone handling, email notifications, and real-time updates.

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router, Turbopack)
- **Language**: TypeScript
- **Database**: PostgreSQL (Replit built-in, Neon-backed) via Prisma 6
- **Auth**: NextAuth v5 (credentials provider, JWT sessions)
- **Styling**: Tailwind CSS 4, Framer Motion animations
- **State**: TanStack Query (60s auto-refetch)
- **Email**: Resend (optional, gracefully degrades)
- **Font**: Geist Sans/Mono

## Project Structure
```
src/
├── app/
│   ├── (dashboard)/          # Protected routes with AppShell layout
│   │   ├── dashboard/        # Main dashboard with stats bento grid
│   │   ├── book/             # Room listing + [roomId] timeline booking
│   │   ├── schedule/         # User's bookings with cancel
│   │   └── profile/          # User profile + settings
│   ├── api/
│   │   ├── auth/[...nextauth]/ # NextAuth handlers
│   │   ├── rooms/            # GET rooms with access control
│   │   ├── bookings/         # GET bookings with filters
│   │   └── stats/            # Dashboard statistics
│   ├── login/                # Public login page
│   └── register/             # Public registration page
├── actions/                  # Server Actions (booking CRUD, auth)
├── components/
│   ├── booking/              # Timeline, BookingModal
│   ├── dashboard/            # BentoGrid, StatsCard
│   ├── layout/               # AppShell, Sidebar, BottomNav, Header
│   └── ui/                   # Button, Card, Badge, Input, Dialog
├── lib/                      # Prisma client, timezone utils, email
├── providers/                # Session + Query providers
└── types/                    # NextAuth type extensions
prisma/
├── schema.prisma             # User, Room, Booking models
└── seed.mts                  # Seed 3 users + 10 rooms
```

## Key Features
- **10 Rooms**: 7 PUBLIC (Meet 1-7) + 3 SPECIAL (Philip Kotler Classroom, MarkPlus Gallery, Museum of Marketing)
- **3 Roles**: EMPLOYEE (public rooms only), ADMIN (all rooms), SUPER_ADMIN (all rooms + management)
- **Visual Timeline**: 30-min slots, 7 AM - 9 PM WIB, color-coded (green/red/violet)
- **Conflict Prevention**: Server-side overlap detection
- **Real-time**: 60-second polling via TanStack Query
- **Glassmorphic UI**: backdrop-blur, gradients, animations
- **Mobile-first**: Bottom nav (mobile), collapsible sidebar (desktop)

## User Credentials
- Super Admin: admin@markplus.com / admin123
- Admin: manager@markplus.com / admin123
- Employee: employee@markplus.com / employee123

## Architecture Decisions
- Prisma 6 (not v7) due to v7's breaking adapter-based client initialization
- UTC storage in DB, WIB conversion on display using date-fns-tz
- Server Actions for mutations, API routes for queries
- Custom UI components (no shadcn/ui package dependency)

## Running
- Dev: `npm run dev` (port 5000)
- Build: `npm run build`
- Seed: `npx tsx prisma/seed.mts`
