"use client";

import { useState, useTransition } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { syncFromGoogleSheet } from "@/actions/sync";
import { toast } from "sonner";
import { RefreshCw, FileSpreadsheet, CheckCircle, AlertTriangle, XCircle, Shield } from "lucide-react";

export default function AdminSyncPage() {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [syncResult, setSyncResult] = useState<{
    synced: number;
    skipped: number;
    errors: number;
    totalRows: number;
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

  const handleSync = () => {
    startTransition(async () => {
      const result = await syncFromGoogleSheet();
      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        setSyncResult({
          synced: result.synced!,
          skipped: result.skipped!,
          errors: result.errors!,
          totalRows: result.totalRows!,
        });
        toast.success(`Synced ${result.synced} bookings from Google Sheets`);
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
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Legacy Sync</h1>
          <Badge variant="warning">Admin</Badge>
        </div>
        <p className="text-sm text-zinc-500">Import bookings from Google Sheets into the database</p>
      </motion.div>

      <Card glass className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
            <FileSpreadsheet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Pull from Legacy Sheets</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Reads booking data from the configured Google Sheet and imports new records into the database.
              Existing records (matched by Sheet Row ID) are skipped.
            </p>
            <div className="mt-3 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                <strong>Required secrets:</strong> GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY
              </p>
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
                <strong>Sheet columns:</strong> A: ID | B: Room Name | D: User Email | F: Start (UTC) | G: End (UTC) | H: Participants | I: Status
              </p>
            </div>
          </div>
        </div>

        <Button onClick={handleSync} disabled={isPending} className="w-full gap-2">
          <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
          {isPending ? "Syncing..." : "Pull from Legacy Sheets"}
        </Button>
      </Card>

      {syncResult && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card glass className="space-y-3">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">Sync Results</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex items-center gap-2 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                <FileSpreadsheet className="h-4 w-4 text-zinc-500" />
                <div>
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{syncResult.totalRows}</p>
                  <p className="text-xs text-zinc-500">Total Rows</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{syncResult.synced}</p>
                  <p className="text-xs text-zinc-500">Synced</p>
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
