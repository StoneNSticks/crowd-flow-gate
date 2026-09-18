create policy "Admins can upload event images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'event-images' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can update event images"
  on storage.objects for update to authenticated
  using (bucket_id = 'event-images' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete event images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'event-images' and public.has_role(auth.uid(), 'admin'));

create policy "Authenticated can read event images"
  on storage.objects for select to authenticated
  using (bucket_id = 'event-images');