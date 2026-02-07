"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { syncFromGoogleSheet, syncUsersFromGoogleSheet } from "@/actions/sync";
import { toast } from "sonner";
import {
  RefreshCw,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Shield,
  Users,
  ArrowUpDown,
  Upload,
  Download,
} from "lucide-react";

export default function AdminSyncPage() {
  const { data: session } = useSession();
  const [isPendingBookings, startBookingTransition] = useTransition();
  const [isPendingUsers, startUserTransition] = useTransition();
  const [syncResult, setSyncResult] = useState<{
    synced: number;
    skipped: number;
    errors: number;
    totalRows: number;
    pushedToSheet: number;
  } | null>(null);
  const [userSyncResult, setUserSyncResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    totalRows: number;
    pushedToSheet: number;
  } | null>(null);

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Shield className="mb-4 h-16 w-16 text-zinc-300 dark:text-zinc-600" />
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Access Denied</h2>
        <p className="mt-1 text-sm text-zinc-500">You need admin privileges to access this page.</p>
      </div>
    );
  }

  const handleSyncBookings = () => {
    startBookingTransition(async () => {
      const result = await syncFromGoogleSheet();
      if ("error" in result) {
        toast.error(result.error);
      } else if (result.success) {
        setSyncResult({
          synced: result.synced!,
          skipped: result.skipped!,
          errors: result.errors!,
          totalRows: result.totalRows!,
          pushedToSheet: result.pushedToSheet ?? 0,
        });
        toast.success(`Bookings synced! ${result.synced} imported, ${result.pushedToSheet ?? 0} pushed to sheet`);
      }
    });
  };

  const handleSyncUsers = () => {
    startUserTransition(async () => {
      const result = await syncUsersFromGoogleSheet();
      if ("error" in result) {
        toast.error(result.error);
      } else if (result.success) {
        setUserSyncResult({
          created: result.created!,
          updated: result.updated!,
          skipped: result.skipped!,
          errors: result.errors!,
          totalRows: result.totalRows!,
          pushedToSheet: result.pushedToSheet ?? 0,
        });
        toast.success(`Users synced! ${result.created} created, ${result.updated} updated, ${result.pushedToSheet ?? 0} pushed to sheet`);
      }
    });
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Google Sheets Sync</h1>
          <Badge variant="warning">Admin</Badge>
        </div>
        <p className="text-sm text-zinc-500">
          Two-way sync — data baru dari Google Sheets masuk ke database, data baru dari database dikirim ke Google Sheets
        </p>
      </motion.div>

      <div className="rounded-xl border border-violet-200/50 bg-violet-50/50 p-4 dark:border-violet-800/30 dark:bg-violet-900/10">
        <div className="flex items-start gap-3">
          <ArrowUpDown className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-600 dark:text-violet-400" />
          <div>
            <p className="text-sm font-medium text-violet-900 dark:text-violet-200">Two-Way Sync Active</p>
            <p className="mt-0.5 text-xs text-violet-700/80 dark:text-violet-400/80">
              Sync berjalan dua arah — data baru di Google Sheets akan di-import ke database, dan data baru di database akan di-push ke Google Sheets. Data yang sudah ada tidak akan terduplikasi.
            </p>
          </div>
        </div>
      </div>

      <Card glass className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
            <Users className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Sync Users</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Two-way sync: import users baru dari Google Sheets, dan push users baru dari database ke Google Sheets.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 dark:bg-emerald-900/20">
                <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs text-emerald-700 dark:text-emerald-400">Sheet → Database (import)</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-2.5 dark:bg-blue-900/20">
                <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-700 dark:text-blue-400">Database → Sheet (push)</span>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-violet-50 p-3 dark:bg-violet-900/20">
              <p className="text-xs text-violet-700 dark:text-violet-400">
                <strong>Sheet:</strong> &quot;user&quot; | <strong>Columns:</strong> B: Name | C: Email | D: Role | E: Password | F: Created
              </p>
            </div>
          </div>
        </div>

        <Button onClick={handleSyncUsers} disabled={isPendingUsers} className="w-full gap-2">
          <RefreshCw className={`h-4 w-4 ${isPendingUsers ? "animate-spin" : ""}`} />
          {isPendingUsers ? "Syncing Users..." : "Sync Users (Two-Way)"}
        </Button>
      </Card>

      {userSyncResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card glass className="space-y-3">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">User Sync Results</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="flex items-center gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                <FileSpreadsheet className="h-4 w-4 text-zinc-500" />
                <div>
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{userSyncResult.totalRows}</p>
                  <p className="text-xs text-zinc-500">Sheet Rows</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{userSyncResult.created}</p>
                  <p className="text-xs text-zinc-500">Created</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                <RefreshCw className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{userSyncResult.updated}</p>
                  <p className="text-xs text-zinc-500">Updated</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-violet-50 p-3 dark:bg-violet-900/20">
                <Upload className="h-4 w-4 text-violet-500" />
                <div>
                  <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{userSyncResult.pushedToSheet}</p>
                  <p className="text-xs text-zinc-500">Pushed to Sheet</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{userSyncResult.skipped}</p>
                  <p className="text-xs text-zinc-500">Skipped</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">{userSyncResult.errors}</p>
                  <p className="text-xs text-zinc-500">Errors</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      <Card glass className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <FileSpreadsheet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Sync Bookings</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Two-way sync: import bookings baru dari Google Sheets, dan push bookings baru dari database ke Google Sheets.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-2.5 dark:bg-emerald-900/20">
                <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs text-emerald-700 dark:text-emerald-400">Sheet → Database (import)</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-2.5 dark:bg-blue-900/20">
                <Upload className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-700 dark:text-blue-400">Database → Sheet (push)</span>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <strong>Sheet:</strong> &quot;meets&quot; | <strong>Columns:</strong> A: ID | B: Room | C: User | D: Email | E: Title | F: Start | G: End | H: Participants | I: Status
              </p>
            </div>
          </div>
        </div>

        <Button onClick={handleSyncBookings} disabled={isPendingBookings} className="w-full gap-2">
          <RefreshCw className={`h-4 w-4 ${isPendingBookings ? "animate-spin" : ""}`} />
          {isPendingBookings ? "Syncing Bookings..." : "Sync Bookings (Two-Way)"}
        </Button>
      </Card>

      {syncResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card glass className="space-y-3">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Booking Sync Results</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <div className="flex items-center gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                <FileSpreadsheet className="h-4 w-4 text-zinc-500" />
                <div>
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{syncResult.totalRows}</p>
                  <p className="text-xs text-zinc-500">Sheet Rows</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{syncResult.synced}</p>
                  <p className="text-xs text-zinc-500">Imported</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-violet-50 p-3 dark:bg-violet-900/20">
                <Upload className="h-4 w-4 text-violet-500" />
                <div>
                  <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{syncResult.pushedToSheet}</p>
                  <p className="text-xs text-zinc-500">Pushed to Sheet</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{syncResult.skipped}</p>
                  <p className="text-xs text-zinc-500">Skipped</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">{syncResult.errors}</p>
                  <p className="text-xs text-zinc-500">Errors</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
