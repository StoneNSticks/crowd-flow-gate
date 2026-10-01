DROP POLICY IF EXISTS "Authenticated can read event images" ON storage.objects;
CREATE POLICY "Admins can read event images" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'event-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));