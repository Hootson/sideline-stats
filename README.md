# Sideline Stats V4.4.4 — Step 4.5 Multi-Device Refresh Fix

## V4.4.4 fixes
- Fixes a restore/update race discovered during the real Device A → Supabase → Device B test.
- Device B now stores the cloud fingerprint from the exact snapshot it actually loaded.
- If Device A changes Supabase while Device B is restoring, Device B will correctly detect that the cloud is newer instead of incorrectly showing “Cloud synced.”
- Preserves the conservative conflict rule: remote changes are announced as “Cloud has updates” and are applied with Load Updates only when there are no pending local writes.
- Retains V4.4.3 UI restore and pending-item diagnostics.
- Service worker cache bumped to V4.4.4.
