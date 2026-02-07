"use client";

import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { User, Mail, Shield, Calendar, LogOut, Building2 } from "lucide-react";

export default function ProfilePage() {
  const { data: session } = useSession();

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const userRole = (session?.user as { role?: string })?.role || "EMPLOYEE";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card glass className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-violet-600 to-purple-600" />
          <div className="relative pt-12">
            <div className="flex items-end gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br from-violet-500 to-purple-500 text-2xl font-bold text-white shadow-xl dark:border-zinc-900">
                {session?.user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="mb-1">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{session?.user?.name}</h2>
                <p className="text-sm text-zinc-500">{session?.user?.email}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <Shield className="h-5 w-5 text-violet-500" />
              <div>
                <p className="text-xs text-zinc-500">Role</p>
                <Badge variant={userRole === "EMPLOYEE" ? "secondary" : "default"} className="mt-1">
                  {userRole}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <Calendar className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-xs text-zinc-500">My Bookings</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{stats?.myBookings || 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <Building2 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-zinc-500">Access Level</p>
                <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {userRole === "EMPLOYEE" ? "Public rooms" : "All rooms"}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card glass>
          <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Account Details</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <User className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-400">Full Name</p>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{session?.user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <Mail className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-400">Email</p>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{session?.user?.email}</p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          variant="destructive"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full sm:w-auto"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </motion.div>
    </div>
  );
}
