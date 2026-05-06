-- Allow the addressee of a pending friend request to read the requester's
-- reader profile. Without this, the RLS join on readers returns null for
-- pending requests, making them invisible in the UI.
CREATE POLICY "View pending friend request readers"
  ON public.readers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.reader_friendships rf
      WHERE rf.status = 'pending'
        AND rf.requester_id = readers.id
        AND rf.addressee_id IN (SELECT public.my_reader_ids())
    )
  );
