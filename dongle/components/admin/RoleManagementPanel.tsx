"use client";

/**
 * RoleManagementPanel
 *
 * Allows super-admins to assign and change roles for admin users.
 * Role changes are logged in the audit trail.
 */

import { useState } from "react";
import {
  AdminRole,
  AdminUser,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
} from "@/types/admin-permissions";
import { formatDate } from "@/lib/date";
import AddressDisplay from "@/components/ui/AddressDisplay";
import { Shield, UserCog, AlertTriangle, Check } from "lucide-react";

interface RoleManagementPanelProps {
  adminUsers: AdminUser[];
  currentUserRole: AdminRole;
  onRoleChange: (address: string, newRole: AdminRole) => Promise<void>;
}

function roleBadgeClass(role: AdminRole): string {
  switch (role) {
    case "super_admin":
      return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
    case "verifier":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "moderator":
      return "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400";
    default:
      return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  }
}

export default function RoleManagementPanel({
  adminUsers,
  currentUserRole,
  onRoleChange,
}: RoleManagementPanelProps) {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState<AdminRole | null>(null);
  const [isChanging, setIsChanging] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const canManageRoles = currentUserRole === "super_admin";

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole) return;
    setIsChanging(true);
    try {
      await onRoleChange(selectedUser.address, newRole);
      setSelectedUser(null);
      setNewRole(null);
      setShowConfirm(false);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="w-2 h-8 bg-violet-500 rounded-full" />
          Role Management
        </h2>
        {!canManageRoles && (
          <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Super-admin access required
          </span>
        )}
      </div>

      {/* Role overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.keys(ROLE_LABELS) as AdminRole[]).map((role) => (
          <div
            key={role}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4"
          >
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleBadgeClass(role)}`}>
              <Shield className="w-3 h-3" />
              {ROLE_LABELS[role]}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
              {ROLE_DESCRIPTIONS[role]}
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              {ROLE_PERMISSIONS[role].length} permissions
            </p>
          </div>
        ))}
      </div>

      {/* Admin users table */}
      <div className="overflow-x-auto rounded-3xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
              <th className="text-left px-6 py-3 font-semibold text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-wider">
                Address
              </th>
              <th className="text-left px-6 py-3 font-semibold text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-wider">
                Role
              </th>
              <th className="text-left px-6 py-3 font-semibold text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-wider">
                Assigned
              </th>
              <th className="text-right px-6 py-3 font-semibold text-zinc-500 dark:text-zinc-400 uppercase text-xs tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {adminUsers.map((user) => (
              <tr key={user.address} className="bg-white dark:bg-zinc-900">
                <td className="px-6 py-4">
                  <AddressDisplay address={user.address} />
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${roleBadgeClass(user.role)}`}>
                    <Shield className="w-3 h-3" />
                    {ROLE_LABELS[user.role]}
                  </span>
                </td>
                <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                  {formatDate(user.assignedAt)}
                </td>
                <td className="px-6 py-4 text-right">
                  {canManageRoles && (
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setNewRole(user.role);
                        setShowConfirm(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                    >
                      <UserCog className="w-4 h-4" />
                      Change Role
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role change modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <UserCog className="w-5 h-5 text-violet-500" />
              Change Role
            </h3>

            <div className="mb-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">User</p>
              <AddressDisplay address={selectedUser.address} />
            </div>

            <div className="mb-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">New Role</p>
              <div className="space-y-2">
                {(Object.keys(ROLE_LABELS) as AdminRole[]).map((role) => (
                  <label
                    key={role}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      newRole === role
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role}
                      checked={newRole === role}
                      onChange={() => setNewRole(role)}
                      className="sr-only"
                    />
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        newRole === role
                          ? "border-violet-500"
                          : "border-zinc-300 dark:border-zinc-600"
                      }`}
                    >
                      {newRole === role && (
                        <div className="w-2 h-2 rounded-full bg-violet-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{ROLE_LABELS[role]}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {ROLE_DESCRIPTIONS[role]}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {!showConfirm ? (
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={!newRole || newRole === selectedUser.role}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-500 rounded-xl hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Continue
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Changing role from <strong>{ROLE_LABELS[selectedUser.role]}</strong> to{" "}
                    <strong>{ROLE_LABELS[newRole!]}</strong>. This action will be logged.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleRoleChange}
                    disabled={isChanging}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-violet-500 rounded-xl hover:bg-violet-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {isChanging ? (
                      "Saving..."
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Confirm Change
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
