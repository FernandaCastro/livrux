import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import i18n from '../i18n';
import type { CoGuardian, GuardianInvitation } from '../types';

export const GUARDIANS_KEY   = (ownerId: string) => ['guardians', ownerId] as const;
export const INVITATIONS_KEY = (ownerId: string) => ['guardian_invitations', ownerId] as const;

async function fetchCoGuardians(ownerId: string): Promise<CoGuardian[]> {
  // Fetch all co-guardians for this family and join their display_name from user_profiles.
  const { data, error } = await supabase
    .from('co_guardians')
    .select('owner_id, guardian_id, created_at, user_profiles!guardian_id(display_name)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    owner_id: row.owner_id,
    guardian_id: row.guardian_id,
    created_at: row.created_at,
    display_name: row.user_profiles?.display_name ?? null,
  })) as CoGuardian[];
}

async function fetchInvitations(ownerId: string): Promise<GuardianInvitation[]> {
  const { data, error } = await supabase
    .from('guardian_invitations')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as GuardianInvitation[];
}

export function useGuardians() {
  const { user, ownerId, fetchCoGuardianStatus, fetchFormula } = useAuthStore();
  const qc = useQueryClient();

  const guardiansKey   = ownerId ? GUARDIANS_KEY(ownerId)   : null;
  const invitationsKey = ownerId ? INVITATIONS_KEY(ownerId) : null;

  const { data: coGuardians = [], isLoading: guardiansLoading } = useQuery({
    queryKey: guardiansKey ?? ['guardians', null],
    queryFn: () => fetchCoGuardians(ownerId!),
    enabled: !!ownerId,
    retry: 1,
  });

  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: invitationsKey ?? ['guardian_invitations', null],
    queryFn: () => fetchInvitations(ownerId!),
    enabled: !!ownerId,
    retry: 1,
  });

  // Send an invitation email to a new co-guardian.
  const sendInvitationMutation = useMutation({
    mutationFn: async (email: string) => {
      const lang = i18n.language?.slice(0, 2) ?? 'en';
      const { error } = await supabase.functions.invoke('invite-guardian', {
        method: 'POST',
        body: { email, lang },
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      if (invitationsKey) qc.invalidateQueries({ queryKey: invitationsKey });
    },
  });

  // Cancel a pending invitation.
  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('guardian_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      if (!invitationsKey) return;
      qc.setQueryData(invitationsKey, (old: GuardianInvitation[] = []) =>
        old.filter((inv) => inv.id !== id)
      );
    },
  });

  // Accept an invitation using a token (the logged-in user joins another family).
  const acceptInvitationMutation = useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.functions.invoke('accept-invitation', {
        method: 'POST',
        body: { token },
      });
      if (error) {
        // Try to extract the error message from the response body.
        const detail = (data as { error?: string } | null)?.error;
        throw new Error(detail ?? error.message);
      }
      return data as { owner_id: string };
    },
    onSuccess: async () => {
      // Re-fetch co-guardian status so ownerId is updated in the store.
      await fetchCoGuardianStatus();
      // Re-fetch formula for the new owner's formula.
      await fetchFormula();
      // Invalidate readers so the new family's data is loaded.
      qc.invalidateQueries({ queryKey: ['readers'] });
    },
  });

  // Remove a co-guardian from the family (owner removing someone, or self-removal).
  const removeCoGuardianMutation = useMutation({
    mutationFn: async (guardianId: string) => {
      const { error } = await supabase
        .from('co_guardians')
        .delete()
        .eq('owner_id', ownerId!)
        .eq('guardian_id', guardianId);
      if (error) throw error;
      return guardianId;
    },
    onSuccess: (guardianId) => {
      if (!guardiansKey) return;
      qc.setQueryData(guardiansKey, (old: CoGuardian[] = []) =>
        old.filter((g) => g.guardian_id !== guardianId)
      );
    },
  });

  // Leave the family (co-guardian removing themselves).
  const leaveFamilyMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      // Find which family this user belongs to.
      const { data: link } = await supabase
        .from('co_guardians')
        .select('owner_id')
        .eq('guardian_id', user.id)
        .maybeSingle();
      if (!link) throw new Error('Not a co-guardian');

      const { error } = await supabase
        .from('co_guardians')
        .delete()
        .eq('owner_id', link.owner_id)
        .eq('guardian_id', user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      // Reset back to own account.
      await fetchCoGuardianStatus();
      await fetchFormula();
      qc.invalidateQueries({ queryKey: ['readers'] });
    },
  });

  const isCoGuardian = !!user && ownerId !== null && ownerId !== user.id;

  return {
    coGuardians,
    invitations,
    // Treat unresolved ownerId as loading — prevents content from flashing before
    // fetchCoGuardianStatus() completes and the queries actually run.
    isLoading: !ownerId || guardiansLoading || invitationsLoading,
    isCoGuardian,
    sendInvitation: (email: string) => sendInvitationMutation.mutateAsync(email),
    cancelInvitation: (id: string) => cancelInvitationMutation.mutateAsync(id),
    acceptInvitation: (token: string) => acceptInvitationMutation.mutateAsync(token),
    removeCoGuardian: (guardianId: string) => removeCoGuardianMutation.mutateAsync(guardianId),
    leaveFamily: () => leaveFamilyMutation.mutateAsync(),
    isSending:   sendInvitationMutation.isPending,
    isAccepting: acceptInvitationMutation.isPending,
    isLeaving:   leaveFamilyMutation.isPending,
    sendError:   sendInvitationMutation.error   ? (sendInvitationMutation.error   as Error).message : null,
    acceptError: acceptInvitationMutation.error ? (acceptInvitationMutation.error as Error).message : null,
    leaveError:  leaveFamilyMutation.error      ? (leaveFamilyMutation.error      as Error).message : null,
  };
}
