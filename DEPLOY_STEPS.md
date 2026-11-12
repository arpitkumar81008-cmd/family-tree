# Manual Deployment & Security Hardening Steps

Follow these steps in order after pulling the latest changes.

## 1. Deploy Updated Firestore Security Rules & Indexes
Ensure the Firebase CLI is logged in and pointing to the `gupta-family-tree-akg` project:

```bash
firebase login
firebase use gupta-family-tree-akg
firebase deploy --only firestore:rules,firestore:indexes
```

## 2. Install & Deploy Cloud Functions (`redeemShareCode`)
The `redeemShareCode` callable function (`functions/index.js`, region `asia-south1`) requires the **Blaze (pay-as-you-go)** plan in Firebase.

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Verify in the Firebase Console (**Build → Functions**) that `redeemShareCode` is live in `asia-south1`.

## 3. Build & Deploy Hosting (with Security Headers & CSP)
```bash
npm run build
firebase deploy --only hosting
```

## 4. Restrict the Firebase Web API Key by HTTP Referrer (GCP Console)
Even though Firebase Web API keys are public identifiers, restricting them prevents unauthorized sites from calling your project's APIs:

1. Open [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials?project=gupta-family-tree-akg).
2. Click your **Browser key (auto created by Firebase)**.
3. Under **Application restrictions**, select **Websites (HTTP referrers)**.
4. Add your authorized origins:
   - `https://vanshvriksha.web.app/*`
   - `https://vanshvriksha.firebaseapp.com/*`
   - `https://gupta-family-tree-akg.web.app/*`
   - `https://gupta-family-tree-akg.firebaseapp.com/*`
   - `https://arpitkumar81008-cmd.github.io/*`
   - `http://localhost:*/*` (remove before strict production if not needed)
5. Under **API restrictions**, restrict the key to only the Firebase/Identity Toolkit/Firestore/Functions APIs used by the app, then click **Save**.

## 5. Enable Firebase App Check (reCAPTCHA Enterprise / v3)
1. In Firebase Console, open **Build → App Check**.
2. Register your web app with **reCAPTCHA v3** (or **reCAPTCHA Enterprise**).
3. Enforce App Check for **Cloud Firestore** and **Cloud Functions**.
4. Initialize `initializeAppCheck` in `src/services/firebase.js` with your reCAPTCHA site key once registered.

## 6. Search & Purge Sensitive Data from Git History (If Needed)
If personal family data, emails, or old tree IDs were ever committed in earlier revisions, inspect and purge them before making the repository public:

### Search git history for sensitive strings
```bash
git log -S "<sensitive-string>" --all --oneline
git grep "<sensitive-string>" $(git rev-list --all)
```

### Purge files or strings using `git-filter-repo` (Recommended)
Install `git-filter-repo` (`pip install git-filter-repo`), then run on a fresh mirror clone:

```bash
# Example: remove a file from all history
git filter-repo --invert-paths --path <path-to-file>

# Example: replace sensitive strings across all commits using a replacements.txt file
# Format of replacements.txt:
#   literal:old-sensitive-value==>REDACTED
git filter-repo --replace-text replacements.txt
```

After rewriting history, force-push only when you are ready and have coordinated with collaborators:
```bash
git push --force --all
git push --force --tags
```
