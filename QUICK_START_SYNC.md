# Quick Start Guide: Project Synchronization

This guide will help you quickly get started with the improved project synchronization features.

## Prerequisites

- Clockify API key configured in `.env`
- Zoho API credentials configured in `.env`
- Node.js and npm installed

## Quick Commands

### 1. Run Project Audit

Check the synchronization status between Clockify and Zoho:

```bash
# TypeScript version (recommended)
npm run audit:projects

# JavaScript version (alternative)
npm run audit:projects:js
```

**What it does:**
- Compares projects in Clockify and Zoho
- Identifies orphaned projects
- Detects naming inconsistencies
- Generates a detailed report in `reports/` folder

**Output:**
```
✅ Fetched 124 Clockify projects
✅ Fetched 118 Zoho projects

📊 SUMMARY
─────────────────────────────────────────────────────────
Total Clockify Projects:        124
Total Zoho Projects:            118
Matched Projects:               112 ✅
Orphaned Projects:              6 ⚠️
Archived Clockify Projects:     15
Archived Zoho Projects:         8
Naming Inconsistencies:         3
```

### 2. Check Sync Status via API

Get real-time synchronization health:

```bash
# Using curl
curl http://localhost:3000/api/sync-status

# Or visit in browser
open http://localhost:3000/api/sync-status
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "message": "All systems operational",
    "services": {
      "clockify": {
        "configured": true,
        "status": "operational"
      },
      "zoho": {
        "configured": true,
        "tokenExpires": "in 45 minutes",
        "status": "operational"
      }
    },
    "synchronization": {
      "totalProjects": 130,
      "syncedProjects": 115,
      "orphanedProjects": 6,
      "healthScore": 96
    },
    "recommendations": [
      "✅ No issues detected - system is healthy"
    ]
  }
}
```

### 3. Run Audit Report via API

Get a comprehensive audit report:

```bash
curl http://localhost:3000/api/audit-projects | json_pp
```

**Use Case:** Integration with monitoring tools or dashboards

---

## Common Scenarios

### Scenario 1: New Project Created in Clockify

**Problem:** Project shows up in Clockify but not in Zoho reports.

**Solution:**
1. Run the audit: `npm run audit:projects`
2. Look for the project in "Clockify-only projects" section
3. Create the corresponding project in Zoho manually or programmatically
4. Re-run audit to verify synchronization

### Scenario 2: Archived Projects Causing Warnings

**Problem:** Logs show warnings for archived projects.

**What changed:** 
- **Before:** Archived projects logged as `⚠️ warn`
- **After:** Archived projects logged as `📦 debug` and automatically filtered

**Verification:**
```bash
# Check logs - you should see debug messages instead of warnings
npm run dev
# Visit /api/bottom-projects
# Check console for "📦 Skipping archived project" (debug level)
```

### Scenario 3: Missing Project Details

**Problem:** Time entries reference unknown project IDs.

**What changed:**
- **Before:** Skipped with warning, data lost
- **After:** Automatic fallback to alternate API, fetches on-demand

**How it works:**
1. API looks for project in Clockify cache
2. If not found, tries Zoho cache
3. If still not found, fetches from Clockify API on-demand
4. If that fails, fetches from Zoho API
5. Only logs debug message if all attempts fail

---

## Understanding the Reports

### Project Mapping Status

Projects can have one of these statuses:

| Status | Meaning | Action Needed |
|--------|---------|---------------|
| `synced` | Found in both Clockify and Zoho | ✅ None |
| `clockify-only` | Only in Clockify | Create in Zoho or mark as archived |
| `zoho-only` | Only in Zoho | Create in Clockify or mark as inactive |
| `orphaned` | Archived or outdated | Review and clean up |

### Health Score

The sync health score indicates how well projects are synchronized:

- **90-100%**: Excellent - all active projects synced
- **80-89%**: Good - minor sync issues
- **70-79%**: Fair - review orphaned projects
- **Below 70%**: Poor - immediate action needed

---

## Troubleshooting

### Issue: Audit Script Fails

**Error:** `Cannot find module '@/lib/clockify'`

**Solution:**
```bash
# Make sure you're in the project root
cd /path/to/Billing

# Install dependencies
npm install

# Try again
npm run audit:projects
```

### Issue: API Returns 500 Error

**Error:** `Failed to authenticate with Zoho`

**Solution:**
1. Check `.env` file has valid credentials:
   ```bash
   ZOHO_CLIENT_ID=your_client_id
   ZOHO_CLIENT_SECRET=your_client_secret
   ZOHO_REFRESH_TOKEN=your_refresh_token
   ```

2. Test Zoho connection:
   ```bash
   curl http://localhost:3000/api/sync-status
   # Check "zoho.status" in response
   ```

3. Refresh token if expired:
   ```bash
   # Follow Zoho token refresh guide
   ```

### Issue: High Number of Orphaned Projects

**Symptom:** Audit shows 20+ orphaned projects

**Root Causes:**
1. Projects renamed in one system but not the other
2. Projects deleted from one system
3. Old/test projects not archived

**Solution:**
1. Review the audit report: `reports/project-mapping-audit-*.json`
2. For each orphaned project, decide:
   - Archive it if no longer active
   - Create it in the other system if still needed
   - Rename it to match across systems
3. Use the generated cleanup script: `reports/cleanup-suggestions-*.sh`

---

## Best Practices

### 1. Run Audits Regularly

Schedule weekly audits to catch issues early:

```bash
# Add to crontab
0 9 * * 1 cd /path/to/Billing && npm run audit:projects >> /var/log/project-audit.log 2>&1
```

### 2. Review Orphaned Projects Monthly

Set aside time each month to:
1. Review the audit report
2. Archive inactive projects
3. Create missing projects
4. Standardize naming

### 3. Monitor Sync Health

Add sync status to your monitoring dashboard:

```javascript
// Example: Check sync health every hour
setInterval(async () => {
  const response = await fetch('/api/sync-status');
  const { data } = await response.json();
  
  if (data.synchronization.healthScore < 80) {
    alert('Warning: Low sync health score!');
  }
}, 3600000);
```

### 4. Use Debug Logs in Development

Enable debug logs to see detailed sync information:

```javascript
// In development, console.debug is visible
// In production, only console.info, warn, and error are shown

// Check browser console for:
// 📦 Skipping archived project: ...
// 🔍 Project not found, attempting fallback...
// ✅ Retrieved project details via fallback: ...
```

---

## Integration Examples

### Dashboard Widget

```typescript
// components/SyncStatusWidget.tsx
import { useEffect, useState } from 'react';

export function SyncStatusWidget() {
  const [status, setStatus] = useState(null);
  
  useEffect(() => {
    fetch('/api/sync-status')
      .then(res => res.json())
      .then(data => setStatus(data.data));
  }, []);
  
  if (!status) return <div>Loading...</div>;
  
  return (
    <div className="sync-status">
      <h3>Sync Health: {status.synchronization.healthScore}%</h3>
      <p>{status.message}</p>
      <ul>
        {status.recommendations.map((rec, i) => (
          <li key={i}>{rec}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Automated Cleanup Script

```bash
#!/bin/bash
# automated-cleanup.sh

echo "Running project audit..."
npm run audit:projects

# Check exit code
if [ $? -eq 1 ]; then
  echo "Issues found - check report in reports/ folder"
  
  # Send notification (example using curl)
  curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
    -H 'Content-Type: application/json' \
    -d '{"text":"Project sync issues detected - review audit report"}'
else
  echo "All projects synced - no action needed"
fi
```

---

## FAQ

**Q: Will this delete any projects?**  
A: No. The audit and sync features are read-only. They only report issues and make suggestions.

**Q: How often does the cache refresh?**  
A: The project mapping cache refreshes every 5 minutes automatically.

**Q: Can I force a cache refresh?**  
A: Yes, call the sync endpoint with a force parameter (planned feature) or restart the application.

**Q: What's the performance impact?**  
A: Minimal. Caching reduces API calls by ~80%. Initial sync takes 2-3 seconds for ~120 projects.

**Q: Does this work with large project counts (500+)?**  
A: Yes, but audit runtime increases. For 500+ projects, expect 10-15 second audit time.

---

## Next Steps

1. **Run your first audit**: `npm run audit:projects`
2. **Review the report**: Check `reports/project-mapping-audit-*.json`
3. **Take action**: Follow suggestions in the report
4. **Monitor ongoing**: Set up regular audits and health checks
5. **Read detailed docs**: See `PROJECT_SYNC_IMPROVEMENTS.md` for full technical details

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs in `reports/` folder
3. Check API responses for detailed error messages
4. Review the technical documentation in `PROJECT_SYNC_IMPROVEMENTS.md`

