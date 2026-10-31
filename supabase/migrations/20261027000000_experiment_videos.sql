-- Private storage for the short videos of real experiments.
-- Videos are uploaded through one-time signed URLs created by the API, analysed, then deleted:
-- no policy is needed because browsers never access this bucket directly.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('experiment-videos', 'experiment-videos', false, 52428800, array['video/mp4', 'video/quicktime'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
