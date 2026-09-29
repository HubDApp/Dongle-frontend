"use client";

import { useState, useCallback, useEffect } from "react";
import {
  teamCollaborationService,
  type TeamMember,
  type SubmissionComment,
  type SharedView,
  type SubmissionActivity,
} from "@/services/team/team-collaboration.service";
import type { TeamRole } from "@/types/team-collaboration";

export interface UseTeamCollaborationOptions {
  submissionId: string;
  currentUserAddress: string;
  currentUserName: string;
}

export interface UseTeamCollaborationReturn {
  // Team
  team: TeamMember[];
  userRole: TeamRole | null;
  canComment: boolean;
  canEdit: boolean;
  canManageTeam: boolean;
  canSaveView: boolean;
  addTeamMember: (
    member: Omit<TeamMember, "id" | "submissionId" | "addedAt">,
  ) => Promise<{ success: boolean; error?: string; member?: TeamMember }>;
  updateTeamMemberRole: (
    memberId: string,
    role: TeamRole,
  ) => Promise<{ success: boolean; error?: string }>;
  removeTeamMember: (memberId: string) => Promise<{ success: boolean; error?: string }>;
  refreshTeam: () => void;

  // Comments
  comments: SubmissionComment[];
  addComment: (content: string, mentions?: string[]) => Promise<{ success: boolean; error?: string; comment?: SubmissionComment }>;
  refreshComments: () => void;

  // Shared Views
  sharedViews: SharedView[];
  createSharedView: (
    name: string,
    filters: SharedView["filters"],
    isPublic?: boolean,
  ) => Promise<{ success: boolean; error?: string; view?: SharedView }>;
  updateSharedView: (
    viewId: string,
    updates: Partial<Pick<SharedView, "name" | "filters" | "isPublic">>,
  ) => Promise<{ success: boolean; error?: string; view?: SharedView }>;
  deleteSharedView: (viewId: string) => Promise<{ success: boolean; error?: string }>;
  refreshSharedViews: () => void;

  // Activity
  activity: SubmissionActivity[];
  recordActivity: (activity: Omit<SubmissionActivity, "id" | "submissionId">) => SubmissionActivity;
  refreshActivity: () => void;

  // Loading states
  isLoading: boolean;
  error: string | null;
}

export function useTeamCollaboration({
  submissionId,
  currentUserAddress,
  currentUserName,
}: UseTeamCollaborationOptions): UseTeamCollaborationReturn {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [comments, setComments] = useState<SubmissionComment[]>([]);
  const [sharedViews, setSharedViews] = useState<SharedView[]>([]);
  const [activity, setActivity] = useState<SubmissionActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userRole = teamCollaborationService.getUserRole(submissionId, currentUserAddress);
  const canComment = userRole ? teamCollaborationService.checkPermission(submissionId, currentUserAddress, "commenter") : false;
  const canEdit = userRole ? teamCollaborationService.checkPermission(submissionId, currentUserAddress, "editor") : false;
  const canManageTeam = userRole ? teamCollaborationService.checkPermission(submissionId, currentUserAddress, "owner") : false;
  const canSaveView = userRole ? teamCollaborationService.checkPermission(submissionId, currentUserAddress, "editor") : false;

  const loadAll = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      setTeam(teamCollaborationService.getTeam(submissionId));
      setComments(teamCollaborationService.getComments(submissionId));
      setSharedViews(teamCollaborationService.getSharedViews(submissionId));
      setActivity(teamCollaborationService.getActivity(submissionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team data");
    } finally {
      setIsLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const addTeamMember = useCallback(
    async (member: Omit<TeamMember, "id" | "submissionId" | "addedAt">) => {
      const result = teamCollaborationService.addTeamMember(
        submissionId,
        currentUserAddress,
        member,
      );
      if (result.success) {
        loadAll();
      }
      return result;
    },
    [submissionId, currentUserAddress, loadAll],
  );

  const updateTeamMemberRole = useCallback(
    async (memberId: string, role: TeamRole) => {
      const result = teamCollaborationService.updateTeamMemberRole(
        submissionId,
        currentUserAddress,
        memberId,
        role,
      );
      if (result.success) {
        loadAll();
      }
      return result;
    },
    [submissionId, currentUserAddress, loadAll],
  );

  const removeTeamMember = useCallback(
    async (memberId: string) => {
      const result = teamCollaborationService.removeTeamMember(
        submissionId,
        currentUserAddress,
        memberId,
      );
      if (result.success) {
        loadAll();
      }
      return result;
    },
    [submissionId, currentUserAddress, loadAll],
  );

  const addComment = useCallback(
    async (content: string, mentions: string[] = []) => {
      const result = teamCollaborationService.addComment(
        submissionId,
        currentUserAddress,
        currentUserName,
        content,
        mentions,
      );
      if (result.success) {
        loadAll();
      }
      return result;
    },
    [submissionId, currentUserAddress, currentUserName, loadAll],
  );

  const createSharedView = useCallback(
    async (name: string, filters: SharedView["filters"], isPublic = false) => {
      const result = teamCollaborationService.createSharedView(
        currentUserAddress,
        submissionId,
        name,
        filters,
        isPublic,
      );
      if (result.success) {
        loadAll();
      }
      return result;
    },
    [submissionId, currentUserAddress, loadAll],
  );

  const updateSharedView = useCallback(
    async (
      viewId: string,
      updates: Partial<Pick<SharedView, "name" | "filters" | "isPublic">>,
    ) => {
      const result = teamCollaborationService.updateSharedView(viewId, currentUserAddress, updates);
      if (result.success) {
        loadAll();
      }
      return result;
    },
    [currentUserAddress, loadAll],
  );

  const deleteSharedView = useCallback(
    async (viewId: string) => {
      const result = teamCollaborationService.deleteSharedView(viewId, currentUserAddress);
      if (result.success) {
        loadAll();
      }
      return result;
    },
    [currentUserAddress, loadAll],
  );

  const recordActivity = useCallback(
    (activityData: Omit<SubmissionActivity, "id" | "submissionId">) => {
      return teamCollaborationService.recordActivity({
        ...activityData,
        submissionId,
      });
    },
    [submissionId],
  );

  const refreshTeam = useCallback(() => {
    setTeam(teamCollaborationService.getTeam(submissionId));
  }, [submissionId]);

  const refreshComments = useCallback(() => {
    setComments(teamCollaborationService.getComments(submissionId));
  }, [submissionId]);

  const refreshSharedViews = useCallback(() => {
    setSharedViews(teamCollaborationService.getSharedViews(submissionId));
  }, [submissionId]);

  const refreshActivity = useCallback(() => {
    setActivity(teamCollaborationService.getActivity(submissionId));
  }, [submissionId]);

  return {
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
    updateSharedView,
    deleteSharedView,
    refreshSharedViews,
    activity,
    recordActivity,
    refreshActivity,
    isLoading,
    error,
  };
}