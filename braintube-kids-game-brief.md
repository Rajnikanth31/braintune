# Antigravity Build Brief — Kids Focus + Learning Game

Drop this whole file into Antigravity. It contains three parts:

1. **The build prompt** — paste into Antigravity to scaffold the project.
2. **Release runbook** — `docs/RELEASE.md` for the repo.
3. **Secrets setup checklist** — `docs/SECRETS.md` for the repo.

---

## 1. Build Prompt (paste into Antigravity)

> **Build a focus + learning mobile game for children, GitHub-managed with CI/CD to APK and Google Play**
>
> Create a cross-platform mobile game for children ages 4–8 that builds focus/attention while teaching early-learning concepts. You choose the best framework (Flutter or React Native) and justify the choice briefly in the README. Set it up as a production-grade GitHub repository from day one so I can push regular updates and ship releases.
>
> **Repository & workflow**
> - Initialize a Git repo with clean structure, framework-appropriate `.gitignore`, `README.md`, `LICENSE`, and `CHANGELOG.md`.
> - Branch strategy: `main` (protected, stable releases) and `dev` (active work). Document a PR-based flow.
> - Use Conventional Commits and semantic versioning (tags drive releases).
>
> **CI/CD (GitHub Actions)**
> - **CI** on every push/PR: lint, static analysis, unit tests, and a debug build.
> - **CD** triggered on version tags (`v*`):
>   - Build a signed release **APK** and attach it to the GitHub Release.
>   - Build an **AAB** and publish to **Google Play** (internal/closed testing track) via a service-account secret.
> - Store signing keys and Play credentials as GitHub Secrets; document the setup in README (do not commit secrets). Include a sample `fastlane` config or equivalent if helpful.
>
> **Learning + focus gameplay (all concepts, combined)**
> Each mini-game teaches a concept *and* trains attention. Include all of:
> - **Letters & phonics** — tap/trace letters, match letter to sound.
> - **Numbers & counting** — count objects, match number to quantity, sequencing.
> - **Colors & shapes** — sorting and pattern completion.
> - **Memory/attention** — flip-card matching plus a "find and tap only the X among distractors" selective-attention task.
> - Adaptive difficulty based on performance; short 2–5 min sessions; positive reinforcement only (stars, encouraging audio, friendly mascot); no fail states.
>
> **Child-safe design**
> - Large tap targets, audio instructions (minimal reading), soft palette, no aggressive animations.
> - No ads, no in-app purchases, no tracking, fully offline.
> - Parent gate before settings; multiple child profiles with local progress and learning stats saved.
>
> **Technical**
> - Clean modular architecture: separate game logic, UI, audio, and data layers (each mini-game as an isolated module so I can add/update them independently).
> - Local storage only for per-child progress and learning analytics.
> - Sensible state management for the chosen framework.
> - Unit tests for game logic and adaptive-difficulty rules.
>
> **Deliverables (this pass)**
> - Initialized GitHub repo with CI and CD workflows wired up (CD can be in dry-run/test-track mode until secrets are added).
> - One learning mini-game fully working end-to-end as a reference implementation.
> - Module scaffolding for the remaining mini-games.
> - README covering local setup, build, signing, release tagging, and Play publishing steps.
> - Also generate `docs/RELEASE.md` and `docs/SECRETS.md` matching the runbook and checklist provided below.

---

## 2. Release Runbook → `docs/RELEASE.md`

### Versioning
- Semantic versioning: `MAJOR.MINOR.PATCH`.
- Releases are driven by annotated git tags matching `v*` (e.g. `v1.2.0`).
- The app's internal version/build number must be bumped before tagging.

### Cutting a release
1. Merge all intended work into `dev`, ensure CI is green.
2. Open a release PR `dev → main`. Require CI pass + review.
3. After merge, pull `main` locally:
   ```bash
   git checkout main && git pull
   ```
4. Bump the app version (Flutter: `pubspec.yaml` `version: 1.2.0+12`; RN: `android/app/build.gradle` `versionName`/`versionCode`).
5. Update `CHANGELOG.md` (use Conventional Commit history).
6. Commit, then tag:
   ```bash
   git commit -am "chore(release): v1.2.0"
   git tag -a v1.2.0 -m "v1.2.0"
   git push origin main --follow-tags
   ```
7. The CD workflow triggers on the tag and will:
   - Build signed APK → attach to the GitHub Release.
   - Build AAB → upload to Google Play **internal** track.

### Promoting on Google Play
- internal → closed (beta) → production is done in the Play Console, or via a `fastlane supply --track` promotion step.
- Always soak on internal/closed before production. A children's app gets extra review scrutiny — confirm the **Data safety** form and **Families / Teacher Approved** declarations are complete.

### Rollback
- Play does not allow re-using a `versionCode`. To roll back, build a *higher* versionCode from the previous good commit and release that.
- For GitHub artifacts, mark the bad Release as pre-release/draft and point users to the prior tag.

### Hotfix flow
1. Branch `hotfix/x` off `main`.
2. Fix, PR back to `main`, tag a PATCH release.
3. Cherry-pick / merge `main` back into `dev`.

---

## 3. Secrets Setup Checklist → `docs/SECRETS.md`

> Nothing here is committed to the repo. All values live in **GitHub → Settings → Secrets and variables → Actions**.

### Android signing
- [ ] Generate an upload keystore:
  ```bash
  keytool -genkey -v -keystore upload.jks -keyalg RSA -keysize 2048 \
    -validity 10000 -alias upload
  ```
- [ ] Base64-encode it for storage:
  ```bash
  base64 -w0 upload.jks > upload.jks.b64
  ```
- [ ] Add secrets:
  - `ANDROID_KEYSTORE_BASE64` — contents of `upload.jks.b64`
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`
- [ ] CI decodes the keystore at build time, signs, then deletes it.
- [ ] Keep the original `upload.jks` backed up **offline** — losing it means you can't update the app (unless enrolled in Play App Signing, which is recommended; enroll so Google holds the app signing key and you only manage the upload key).

### Google Play publishing
- [ ] In Google Cloud, create a **service account**; enable the **Google Play Android Developer API**.
- [ ] Create a JSON key for that service account.
- [ ] In Play Console → **Users and permissions**, invite the service account and grant **Release** (or admin) on the app.
- [ ] Add secret:
  - `PLAY_SERVICE_ACCOUNT_JSON` — full JSON key contents.
- [ ] **The app must be created manually in the Play Console once**, and a first build uploaded manually, before the API can publish to it.

### Repo hardening
- [ ] Protect `main`: require PR, require CI status checks, no force-push.
- [ ] Restrict who can push tags / trigger CD (use a GitHub Environment with required reviewers for the `production` deploy job).
- [ ] Enable Dependabot + secret scanning.

### Quick verification
- [ ] Push a `v0.0.1-test` tag → confirm CD runs, APK attaches, AAB lands on the internal track in dry-run/test mode.
- [ ] Remove the test release once verified.
