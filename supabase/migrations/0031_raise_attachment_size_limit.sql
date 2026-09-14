-- Match the app's MAX_ATTACHMENT_BYTES (see lib/attachments.ts) — a
-- scanned/phone-photographed multi-page vendor report easily exceeds the
-- previous 5MB bucket limit.
update storage.buckets
set file_size_limit = 20971520 -- 20MB
where id = 'attachments';
