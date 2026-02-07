"use client";

import { useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { updateProfile, getProfile } from "@/actions/user";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  User, Mail, Shield, Calendar, LogOut, Building2,
  Camera, Pencil, Check, X, MessageCircle, Smile, Sparkles,
} from "lucide-react";

const avatarOptions = [
  "bg-gradient-to-br from-violet-500 to-purple-600",
  "bg-gradient-to-br from-blue-500 to-cyan-500",
  "bg-gradient-to-br from-emerald-500 to-teal-500",
  "bg-gradient-to-br from-orange-500 to-amber-500",
  "bg-gradient-to-br from-pink-500 to-rose-500",
  "bg-gradient-to-br from-indigo-500 to-blue-600",
];

const statusEmojis = ["😊", "🎯", "💼", "🏠", "🎉", "☕", "🔥", "💪", "🌟", "📚", "🎮", "✈️"];

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingName, setEditingName] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [statusValue, setStatusValue] = useState("");
  const [bioValue, setBioValue] = useState("");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await getProfile();
      if ("error" in res) throw new Error(res.error);
      return res.user;
    },
    refetchInterval: 30000,
  });

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const profileMutation = useMutation({
    mutationFn: (data: { name?: string; avatar?: string; status?: string; bio?: string }) => updateProfile(data),
    onSuccess: async (result) => {
      if ("error" in result) { toast.error(result.error); return; }
      toast.success("Profile updated!");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      await updateSession();
      setEditingName(false);
      setEditingStatus(false);
      setEditingBio(false);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Avatar updated!");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  const handleGradientAvatar = (gradient: string) => {
    profileMutation.mutate({ avatar: gradient });
    setShowAvatarPicker(false);
  };

  const userRole = (session?.user as { role?: string })?.role || "EMPLOYEE";
  const displayName = profile?.name || session?.user?.name || "User";
  const displayEmail = profile?.email || session?.user?.email || "";
  const avatarValue = profile?.avatar || "";
  const isGradientAvatar = avatarValue.startsWith("bg-gradient");
  const isImageAvatar = avatarValue.startsWith("/") || avatarValue.startsWith("http");

  return (
    <div className="space-y-4 p-4 md:space-y-6 md:p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card glass className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjEpIi8+PC9zdmc+')] opacity-50" />
          </div>

          <div className="relative pt-16 pb-2">
            <div className="flex flex-col items-center sm:flex-row sm:items-end sm:gap-5">
              <div className="relative group">
                <div className={cn(
                  "flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-white text-3xl font-bold text-white shadow-xl dark:border-zinc-900 overflow-hidden",
                  isGradientAvatar ? avatarValue : !isImageAvatar ? "bg-gradient-to-br from-violet-500 to-purple-500" : ""
                )}>
                  {isImageAvatar ? (
                    <img src={avatarValue} alt={displayName} className="h-full w-full object-cover" />
                  ) : (
                    displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <button
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg transition-all hover:scale-110 dark:bg-zinc-800"
                >
                  <Camera className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              </div>

              <div className="mt-3 text-center sm:mb-1 sm:text-left flex-1">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      className="max-w-[200px] text-lg font-bold"
                      autoFocus
                    />
                    <button onClick={() => profileMutation.mutate({ name: nameValue })} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditingName(false)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{displayName}</h2>
                    <button
                      onClick={() => { setNameValue(displayName); setEditingName(true); }}
                      className="rounded-lg p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <p className="text-sm text-zinc-500">{displayEmail}</p>

                {editingStatus ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={statusValue}
                        onChange={(e) => setStatusValue(e.target.value)}
                        placeholder="What's on your mind?"
                        className="max-w-[250px] text-sm"
                        maxLength={60}
                        autoFocus
                      />
                      <button onClick={() => profileMutation.mutate({ status: statusValue })} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingStatus(false)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {statusEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => setStatusValue(prev => prev + emoji)}
                          className="rounded-md p-1 text-base hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setStatusValue(profile?.status || ""); setEditingStatus(true); }}
                    className="mt-1.5 flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {profile?.status ? (
                      <span className="text-zinc-700 dark:text-zinc-300">{profile.status}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-zinc-400">
                        <Smile className="h-3.5 w-3.5" />
                        Set your status...
                      </span>
                    )}
                  </button>
                )}
              </div>

              <div className="mt-3 sm:mt-0 sm:mb-1">
                <Badge variant={userRole === "EMPLOYEE" ? "secondary" : "default"} className="text-xs">
                  {userRole.replace("_", " ")}
                </Badge>
              </div>
            </div>

            {showAvatarPicker && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-700/60 dark:bg-zinc-800/50"
              >
                <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Choose Avatar Style</p>
                <div className="space-y-3">
                  <div>
                    <p className="mb-2 text-xs text-zinc-500">Color Gradients</p>
                    <div className="flex flex-wrap gap-2">
                      {avatarOptions.map((gradient) => (
                        <button
                          key={gradient}
                          onClick={() => handleGradientAvatar(gradient)}
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white transition-all hover:scale-110",
                            gradient,
                            avatarValue === gradient && "ring-2 ring-violet-400 ring-offset-2 dark:ring-offset-zinc-900"
                          )}
                        >
                          {displayName.charAt(0).toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs text-zinc-500">Upload Photo</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                      disabled={uploadMutation.isPending}
                    >
                      <Camera className="h-4 w-4" />
                      {uploadMutation.isPending ? "Uploading..." : "Choose from device"}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card glass>
          <div className="flex items-center justify-between mb-3">
            <h3 className="flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
              <MessageCircle className="h-4 w-4 text-violet-500" />
              About Me
            </h3>
            {!editingBio && (
              <button
                onClick={() => { setBioValue(profile?.bio || ""); setEditingBio(true); }}
                className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {editingBio ? (
            <div className="space-y-3">
              <textarea
                value={bioValue}
                onChange={(e) => setBioValue(e.target.value)}
                placeholder="Tell us about yourself..."
                maxLength={200}
                rows={3}
                className="w-full rounded-xl border border-zinc-200/80 bg-white/80 px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 dark:border-zinc-700/60 dark:bg-zinc-800/80 dark:text-zinc-100"
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">{bioValue.length}/200</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingBio(false)}>Cancel</Button>
                  <Button size="sm" onClick={() => profileMutation.mutate({ bio: bioValue })}>Save</Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {profile?.bio || <span className="italic text-zinc-400">No bio yet. Click the edit button to add one!</span>}
            </p>
          )}
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card glass>
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Quick Stats
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <Shield className="h-5 w-5 text-violet-500" />
              <div>
                <p className="text-xs text-zinc-500">Role</p>
                <Badge variant={userRole === "EMPLOYEE" ? "secondary" : "default"} className="mt-1">
                  {userRole.replace("_", " ")}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <Calendar className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-xs text-zinc-500">Total Bookings</p>
                <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{profile?._count?.bookings || stats?.myBookings || 0}</p>
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card glass>
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            <User className="h-4 w-4 text-zinc-400" />
            Account Details
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <User className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-400">Full Name</p>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{displayName}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <Mail className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-400">Email</p>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{displayEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
              <Calendar className="h-5 w-5 text-zinc-400" />
              <div>
                <p className="text-xs text-zinc-400">Member Since</p>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" }) : "—"}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
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
