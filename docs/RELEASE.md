# Release Runbook — Braintune Kids Game

This runbook outlines the steps to cut new versions and manage production deployments of Braintune.

## Versioning Rules

- We use Semantic Versioning: `MAJOR.MINOR.PATCH` (e.g., `1.2.0`).
- Releases are driven by annotated Git tags matching `v*` (e.g., `v1.2.0`).
- Every release must bump both the user-facing `versionName` and internal `versionCode` in `android/app/build.gradle` before tagging.

## Cutting a Release

Follow these steps to publish a new release:

1. **Active Development**:
   Merge all features, fixes, and updates into the `dev` branch. Ensure the Android CI pipeline is green.

2. **Open a Release PR**:
   Create a Pull Request from `dev` to `main`. Require CI status checks to pass and perform a manual peer review.

3. **Prepare Locally**:
   Once merged, checkout the stable `main` branch locally and pull the latest changes:
   ```bash
   git checkout main
   git pull origin main
   ```

4. **Bump Version Details**:
   Modify `android/app/build.gradle` (approx. line 85) to increment the version parameters:
   - `versionCode`: increment by 1 (e.g., `versionCode 2`)
   - `versionName`: update to target version (e.g., `versionName "1.0.1"`)

5. **Update CHANGELOG.md**:
   Record release modifications under a new version heading using Conventional Commits log history.

6. **Commit, Tag, and Push**:
   Commit the version bump and apply the matching release tag:
   ```bash
   git commit -am "chore(release): v1.0.1"
   git tag -a v1.0.1 -m "v1.0.1"
   git push origin main --follow-tags
   ```

7. **CD Processing**:
   The tag push triggers the Android CD workflow, which:
   - Compiles and signs the release APK and AAB.
   - Automatically drafts and publishes a GitHub Release, attaching the signed APK.
   - Publishes the release AAB package to the Google Play **Internal Testing** track.

## Promoting on Google Play

- Package promotions from **Internal** ➔ **Closed (Beta)** ➔ **Production** tracks should be performed inside the Google Play Console UI, or using a local Fastlane supply command.
- **Families / Teacher Approved Policy**: Because Braintune is a children's game (ages 4–8), any store release will undergo deep privacy and safety checks. Ensure you complete the **Data Safety** form and declare no collection of children's identifiers in the Play Console.

## Rollback Strategy

- Google Play does not permit installing a package with an equal or lower `versionCode` than the active one.
- To execute a rollback, compile a build from the prior stable commit with a **higher** `versionCode` than the broken release, and deploy it.
- Mark the failed GitHub Release artifact as a `prerelease` or `draft` in the GitHub UI, directing users back to the previous tag.

## Hotfix Flow

1. Checkout a patch branch off main: `git checkout -b hotfix/v1.0.2 main`.
2. Apply changes, verify locally, and PR back into `main`.
3. Merge, pull locally, bump versions, tag `v1.0.2`, and push.
4. Merge/cherry-pick the hotfix commit back into `dev` to maintain branch sync.
