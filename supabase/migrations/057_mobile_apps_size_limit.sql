-- Raise the mobile-apps bucket cap to 75 MB for projects that already applied 056.

update storage.buckets
set file_size_limit = 78643200
where id = 'mobile-apps';
