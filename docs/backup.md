# Database Backup Strategy

## Neon Point-in-Time Recovery

The production database is hosted on **Neon** (Postgres). Neon provides built-in point-in-time recovery (PiTR) with a 7-day retention window on the Pro plan.

### What's covered

- **Automatic backups** — Neon takes continuous snapshots; no manual dump required.
- **PiTR** — You can restore to any point within the last 7 days from the Neon Console or API.
- **Branching** — Create a branch of your database at any past point for testing or recovery.

### What's NOT covered

- **DICOM files** stored in Backblaze B2 S3. These must be backed up separately.
- **Environment variables** (`.env`). Store them in a password manager or Vercel project settings.

### Recovery procedure

1. Go to [Neon Console](https://console.neon.tech) → Branches.
2. Click **Restore** and select the point in time to restore to.
3. (Optional) Create a branch instead to inspect data before restoring.
4. Update `DATABASE_URL` if restoring to a new branch.

### DICOM file backup

DICOM files are stored in Backblaze B2 in the `corevita` bucket. B2 provides 99.9% durability. For additional safety:

- Enable **B2 Lifecycle Rules** to archive files older than 90 days to a cheaper tier.
- Periodically sync the bucket to a second region or another provider using `rclone`.

### Suggested cron backup (optional)

For an extra layer of safety, you can run a daily pg_dump to S3-compatible storage:

```bash
pg_dump "$DATABASE_URL" | gzip | aws s3 cp - s3://corevita-backups/db/daily-$(date +%F).sql.gz
```

Schedule this as a GitHub Action cron job or a Neon cron job.
