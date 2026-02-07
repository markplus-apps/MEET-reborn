"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-media-query";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";
import { createUser, updateUser, deleteUser } from "@/actions/user";
import { toast } from "sonner";
import {
  Search, Plus, Pencil, Trash2, X, Shield, Mail, Calendar, Users, User as UserIcon, AlertTriangle,
} from "lucide-react";

type UserData = {
  id: string;
  name: string;
  email: string;
  role: "EMPLOYEE" | "ADMIN" | "SUPER_ADMIN";
  avatar: string | null;
  status: string | null;
  createdAt: string;
  _count: { bookings: number };
};

type ModalMode = "create" | "edit" | "delete" | null;

const roleColors: Record<string, string> = {
  EMPLOYEE: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  SUPER_ADMIN: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

export default function UserManagementPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "EMPLOYEE" as string });

  const userRole = (session?.user as { role?: string })?.role;

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json() as Promise<UserData[]>;
    },
    refetchInterval: 30000,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; email: string; password: string; role: "EMPLOYEE" | "ADMIN" | "SUPER_ADMIN" }) => createUser(data),
    onSuccess: (result) => {
      if ("error" in result) { toast.error(result.error); return; }
      toast.success("User created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; email?: string; role?: "EMPLOYEE" | "ADMIN" | "SUPER_ADMIN"; password?: string } }) =>
      updateUser(id, data),
    onSuccess: (result) => {
      if ("error" in result) { toast.error(result.error); return; }
      toast.success("User updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: (result) => {
      if ("error" in result) { toast.error(result.error); return; }
      toast.success("User deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      closeModal();
    },
  });

  const closeModal = () => {
    setModalMode(null);
    setSelectedUser(null);
    setFormData({ name: "", email: "", password: "", role: "EMPLOYEE" });
  };

  const openCreate = () => {
    setFormData({ name: "", email: "", password: "", role: "EMPLOYEE" });
    setModalMode("create");
  };

  const openEdit = (user: UserData) => {
    setSelectedUser(user);
    setFormData({ name: user.name, email: user.email, password: "", role: user.role });
    setModalMode("edit");
  };

  const openDelete = (user: UserData) => {
    setSelectedUser(user);
    setModalMode("delete");
  };

  const handleSubmit = () => {
    if (modalMode === "create") {
      createMutation.mutate({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role as "EMPLOYEE" | "ADMIN" | "SUPER_ADMIN",
      });
    } else if (modalMode === "edit" && selectedUser) {
      const data: Record<string, string> = {};
      if (formData.name !== selectedUser.name) data.name = formData.name;
      if (formData.email !== selectedUser.email) data.email = formData.email;
      if (formData.role !== selectedUser.role) data.role = formData.role;
      if (formData.password) data.password = formData.password;
      updateMutation.mutate({ id: selectedUser.id, data: data as { name?: string; email?: string; role?: "EMPLOYEE" | "ADMIN" | "SUPER_ADMIN"; password?: string } });
    }
  };

  const filtered = (users || []).filter((u: UserData) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const isFormValid = modalMode === "create"
    ? formData.name && formData.email && formData.password && formData.password.length >= 6
    : formData.name && formData.email;

  const isPending = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const modalContent = modalMode === "delete" ? (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 dark:bg-red-900/20">
        <AlertTriangle className="h-6 w-6 text-red-500" />
        <div>
          <p className="font-medium text-red-700 dark:text-red-400">Delete User</p>
          <p className="text-sm text-red-600 dark:text-red-300">This action cannot be undone. All bookings by this user will also be deleted.</p>
        </div>
      </div>
      <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{selectedUser?.name}</p>
        <p className="text-sm text-zinc-500">{selectedUser?.email}</p>
      </div>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={closeModal} className="flex-1" disabled={isPending}>Cancel</Button>
        <Button variant="destructive" onClick={() => selectedUser && deleteMutation.mutate(selectedUser.id)} className="flex-1" disabled={isPending}>
          {isPending ? "Deleting..." : "Delete User"}
        </Button>
      </div>
    </div>
  ) : (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Name</label>
        <Input value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Full name" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email</label>
        <Input type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} placeholder="email@company.com" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Password {modalMode === "edit" && <span className="text-zinc-400">(leave blank to keep current)</span>}
        </label>
        <Input type="password" value={formData.password} onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))} placeholder={modalMode === "edit" ? "••••••" : "Min 6 characters"} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Role</label>
        <div className="flex gap-2">
          {(["EMPLOYEE", "ADMIN", ...(userRole === "SUPER_ADMIN" ? ["SUPER_ADMIN"] : [])] as const).map((role) => (
            <button
              key={role}
              onClick={() => setFormData(p => ({ ...p, role }))}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-medium transition-all",
                formData.role === role ? roleColors[role] + " ring-2 ring-violet-400" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              )}
            >
              {role.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={closeModal} className="flex-1" disabled={isPending}>Cancel</Button>
        <Button onClick={handleSubmit} className="flex-1" disabled={!isFormValid || isPending}>
          {isPending ? "Saving..." : modalMode === "create" ? "Create User" : "Save Changes"}
        </Button>
      </div>
    </div>
  );

  const modalTitle = modalMode === "create" ? "Add New User" : modalMode === "edit" ? "Edit User" : "Confirm Delete";

  return (
    <div className="space-y-4 p-4 md:space-y-6 md:p-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={openCreate} className="gap-2 whitespace-nowrap">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add User</span>
        </Button>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card glass className="!p-3 text-center">
          <Users className="mx-auto h-5 w-5 text-violet-500" />
          <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">{users?.length || 0}</p>
          <p className="text-[10px] text-zinc-500">Total Users</p>
        </Card>
        <Card glass className="!p-3 text-center">
          <UserIcon className="mx-auto h-5 w-5 text-zinc-500" />
          <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">{users?.filter((u: UserData) => u.role === "EMPLOYEE").length || 0}</p>
          <p className="text-[10px] text-zinc-500">Employees</p>
        </Card>
        <Card glass className="!p-3 text-center">
          <Shield className="mx-auto h-5 w-5 text-blue-500" />
          <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">{users?.filter((u: UserData) => u.role === "ADMIN").length || 0}</p>
          <p className="text-[10px] text-zinc-500">Admins</p>
        </Card>
        <Card glass className="!p-3 text-center">
          <Shield className="mx-auto h-5 w-5 text-violet-500" />
          <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">{users?.filter((u: UserData) => u.role === "SUPER_ADMIN").length || 0}</p>
          <p className="text-[10px] text-zinc-500">Super Admins</p>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((user: UserData, i: number) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card glass className="!p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
                      user.role === "SUPER_ADMIN" ? "bg-gradient-to-br from-violet-500 to-purple-600" :
                      user.role === "ADMIN" ? "bg-gradient-to-br from-blue-500 to-cyan-500" :
                      "bg-gradient-to-br from-zinc-400 to-zinc-500"
                    )}>
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        user.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">{user.name}</p>
                        <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", roleColors[user.role])}>
                          {user.role.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{user.email}</span>
                        <span className="hidden sm:flex items-center gap-1"><Calendar className="h-3 w-3" />{user._count.bookings} bookings</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {user.role !== "SUPER_ADMIN" && user.id !== (session?.user as { id?: string })?.id && (
                        <button
                          onClick={() => openDelete(user)}
                          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && !isLoading && (
            <div className="py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" />
              <p className="mt-3 text-sm text-zinc-500">No users found</p>
            </div>
          )}
        </div>
      )}

      {isMobile ? (
        <Drawer.Root open={modalMode !== null} onOpenChange={(open) => !open && closeModal()}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-[20px] bg-white dark:bg-zinc-900">
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <div className="p-6">
                <Drawer.Title className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{modalTitle}</Drawer.Title>
                <Drawer.Description className="sr-only">User management form</Drawer.Description>
                {modalContent}
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      ) : (
        <Dialog open={modalMode !== null} onOpenChange={(open) => !open && closeModal()}>
          <div className="mx-auto max-w-md">
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogDescription className="sr-only">User management form</DialogDescription>
            {modalContent}
          </div>
        </Dialog>
      )}
    </div>
  );
}
