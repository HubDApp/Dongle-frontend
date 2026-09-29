"use client";

import React, { useState, useCallback, useEffect } from "react";
import { MessageSquare, AtSign, Users, Activity, Save, X, MoreVertical, Share2, Lock, Eye, Edit2, UserPlus, UserMinus, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { useTeamCollaboration } from "@/hooks/useTeamCollaboration";
import { useWallet } from "@/context/wallet.context";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { Card } from "@/components/ui/Card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/DropdownMenu";
import { formatDate } from "@/lib/date";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface SubmissionCollaborationPanelProps {
  submissionId: string;
  submissionName: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  editor: "Editor",
  commenter: "Commenter",
  viewer: "Viewer",
};

const ROLE_BADGE_STYLES: Record<string, string> = {
  owner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  editor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  commenter: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  viewer: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400",
};

export function SubmissionCollaborationPanel({
  submissionId,
  submissionName,
}: SubmissionCollaborationPanelProps) {
  const { address: userAddress, userName } = useWallet();
  const [activeTab, setActiveTab] = useState<"comments" | "team" | "views" | "activity">("comments");
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberAddress, setNewMemberAddress] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"editor" | "commenter" | "viewer">("commenter");
  const [confirmRemove, setConfirmRemove] = useState<{ memberId: string; name: string } | null>(null);
  const [showCreateView, setShowCreateView] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [showNewComment, setShowNewComment] = useState(false);
  const [commentText, setCommentText] = useState("");

  const {
    team,
    userRole,
    canComment,
    canEdit,
    canManageTeam,
    canSaveView,
    addTeamMember,
    updateTeamMemberRole,
    removeTeamMember,
    refreshTeam,
    comments,
    addComment,
    refreshComments,
    sharedViews,
    createSharedView,
    deleteSharedView,
    refreshSharedViews,
    activity,
    recordActivity,
    isLoading,
    error,
  } = useTeamCollaboration({
    submissionId,
    currentUserAddress: userAddress ?? "",
    currentUserName: userName ?? "Anonymous",
  });

  // Load data on mount and when tab changes
  useEffect(() => {
    if (activeTab === "team") refreshTeam();
    else if (activeTab === "comments") refreshComments();
    else if (activeTab === "views") refreshSharedViews();
    else if (activeTab === "activity") refreshComments(); // activity is loaded with comments
  }, [activeTab, refreshTeam, refreshComments, refreshSharedViews]);

  const handleAddComment = useCallback(async () => {
    if (!commentText.trim()) return;
    const result = await addComment(commentText.trim());
    if (result.success) {
      setCommentText("");
      setShowNewComment(false);
      toast.success("Comment added");
    } else {
      toast.error(result.error ?? "Failed to add comment");
    }
  }, [addComment, commentText]);

  const handleAddMember = useCallback(async () => {
    if (!newMemberAddress.trim()) return;
    const result = await addTeamMember({
      addressOrId: newMemberAddress.trim(),
      name: newMemberAddress.slice(0, 8) + "...",
      role: newMemberRole,
    });
    if (result.success) {
      setNewMemberAddress("");
      setShowAddMember(false);
      toast.success(`${ROLE_LABELS[newMemberRole]} added`);
    } else {
      toast.error(result.error ?? "Failed to add member");
    }
  }, [addTeamMember, newMemberAddress, newMemberRole]);

  const handleRemoveMember = useCallback(async () => {
    if (!confirmRemove) return;
    const result = await removeTeamMember(confirmRemove.memberId);
    if (result.success) {
      toast.success(`${confirmRemove.name} removed`);
    } else {
      toast.error(result.error ?? "Failed to remove member");
    }
    setConfirmRemove(null);
  }, [removeTeamMember, confirmRemove]);

  const handleCreateView = useCallback(async () => {
    if (!newViewName.trim()) return;
    const result = await createSharedView(newViewName.trim(), {
      status: "pending",
      search: "",
    });
    if (result.success) {
      setNewViewName("");
      setShowCreateView(false);
      toast.success("View created");
    } else {
      toast.error(result.error ?? "Failed to create view");
    }
  }, [createSharedView, newViewName]);

  if (!userAddress) {
    return (
      <Card className="p-6 text-center">
        <Users className="w-12 h-12 mx-auto text-zinc-400 mb-4" />
        <h3 className="text-lg font-medium">Connect wallet to collaborate</h3>
        <p className="text-zinc-500 mt-1">Team collaboration features require a connected wallet.</p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center text-red-600">
        Error: {error}
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Tab Navigation */}
      <div className="border-b border-zinc-200 dark:border-zinc-700">
        <nav className="flex -mb-px" aria-label="Collaboration tabs">
          {[
            { id: "comments", label: "Comments", icon: MessageSquare, count: comments.length },
            { id: "team", label: "Team", icon: Users, count: team.length },
            { id: "views", label: "Views", icon: Share2, count: sharedViews.length },
            { id: "activity", label: "Activity", icon: Activity, count: activity.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <span className="px-2 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-800 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="p-4">
        {/* Comments Tab */}
        {activeTab === "comments" && (
          <div className="space-y-4">
            {canComment && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowNewComment(true)}
                  className="w-full flex items-center gap-2 p-3 border border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-500 hover:border-primary hover:text-primary transition-colors"
                >
                  <MessageSquare className="w-5 h-5" />
                  Add a comment
                </button>
                {showNewComment && (
                  <div className="space-y-2">
                    <TextAreaField
                      label=""
                      placeholder="Write a comment... Use @ to mention team members"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setShowNewComment(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleAddComment} disabled={!commentText.trim()}>
                        Comment
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {comments.length === 0 && !showNewComment && (
              <div className="text-center py-8 text-zinc-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No comments yet. Start the conversation!</p>
              </div>
            )}

            <ul className="space-y-4" role="list" aria-label="Comments">
              {comments.map((comment) => (
                <li key={comment.id} className="flex gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.authorAddress}`} alt="" />
                    <AvatarFallback>{comment.authorName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{comment.authorName}</span>
                      <span className="text-xs text-zinc-500">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{comment.content}</p>
                    {comment.mentions && comment.mentions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {comment.mentions.map((mention) => (
                          <span key={mention} className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                            @{mention}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === "team" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Team Members</h4>
              {canManageTeam && (
                <Button size="sm" onClick={() => setShowAddMember(true)}>
                  <UserPlus className="w-4 h-4 mr-1" />
                  Add Member
                </Button>
              )}
            </div>

            {showAddMember && (
              <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg space-y-3">
                <h5 className="font-medium">Add Team Member</h5>
                <Input
                  placeholder="Wallet address or email"
                  value={newMemberAddress}
                  onChange={(e) => setNewMemberAddress(e.target.value)}
                />
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as "editor" | "commenter" | "viewer")}
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-800"
                >
                  <option value="editor">Editor</option>
                  <option value="commenter">Commenter</option>
                  <option value="viewer">Viewer</option>
                </select>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddMember(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddMember} disabled={!newMemberAddress.trim()}>
                    Add
                  </Button>
                </div>
              </div>
            )}

            {team.length === 0 && (
              <div className="text-center py-8 text-zinc-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No team members yet.</p>
              </div>
            )}

            <ul className="space-y-2" role="list" aria-label="Team members">
              {team.map((member) => (
                <li key={member.id} className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.addressOrId}`} alt="" />
                      <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-zinc-500 truncate max-w-xs">{member.addressOrId}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${ROLE_BADGE_STYLES[member.role]}`}>
                      {ROLE_LABELS[member.role]}
                    </span>
                  </div>
                  {canManageTeam && member.addressOrId !== userAddress && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => updateTeamMemberRole(member.id, "editor")}
                          className={member.role === "editor" ? "font-medium" : ""}
                        >
                          Make Editor
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateTeamMemberRole(member.id, "commenter")}
                          className={member.role === "commenter" ? "font-medium" : ""}
                        >
                          Make Commenter
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateTeamMemberRole(member.id, "viewer")}
                          className={member.role === "viewer" ? "font-medium" : ""}
                        >
                          Make Viewer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setConfirmRemove({ memberId: member.id, name: member.name })}
                          className="text-red-600"
                        >
                          <UserMinus className="w-4 h-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Shared Views Tab */}
        {activeTab === "views" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Shared Views</h4>
              {canSaveView && (
                <Button size="sm" onClick={() => setShowCreateView(true)}>
                  <Save className="w-4 h-4 mr-1" />
                  Save View
                </Button>
              )}
            </div>

            {showCreateView && (
              <div className="p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg space-y-3">
                <h5 className="font-medium">Create Shared View</h5>
                <Input
                  placeholder="View name (e.g., 'My Pending Reviews')"
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowCreateView(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleCreateView} disabled={!newViewName.trim()}>
                    Create
                  </Button>
                </div>
              </div>
            )}

            {sharedViews.length === 0 && !showCreateView && (
              <div className="text-center py-8 text-zinc-500">
                <Share2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No saved views. Create one to quickly filter submissions.</p>
              </div>
            )}

            <ul className="space-y-2" role="list" aria-label="Shared views">
              {sharedViews.map((view) => (
                <li key={view.id} className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Eye className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{view.name}</p>
                      <p className="text-sm text-zinc-500">
                        {view.filters.status ? `Status: ${view.filters.status}` : "All statuses"}
                        {view.filters.search && ` • Search: "${view.filters.search}"`}
                      </p>
                    </div>
                    {view.isPublic && (
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded">
                        Public
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {view.createdBy === userAddress && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => deleteSharedView(view.id)} className="text-red-600">
                            <X className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                    <Button variant="ghost" size="sm">
                      <Share2 className="w-4 h-4 mr-1" />
                      Apply
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === "activity" && (
          <div className="space-y-3">
            {activity.length === 0 && (
              <div className="text-center py-8 text-zinc-500">
                <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No activity recorded yet.</p>
              </div>
            )}
            <ul className="space-y-2" role="list" aria-label="Activity history">
              {activity.map((entry) => (
                <li key={entry.id} className="flex gap-3 p-3 border border-zinc-100 dark:border-zinc-800 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{entry.actorName}</span>
                      <span className="text-xs text-zinc-500">{formatDate(entry.timestamp)}</span>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{entry.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Confirm Dialog for removing team member */}
      <ConfirmDialog
        isOpen={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        onConfirm={handleRemoveMember}
        title="Remove team member?"
        description={`Are you sure you want to remove ${confirmRemove?.name} from the team? This action cannot be undone.`}
        confirmText="Remove"
        variant="destructive"
      />
    </Card>
  );
}

export default SubmissionCollaborationPanel;