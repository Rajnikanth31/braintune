# Secrets Setup Checklist — Braintune Kids Game

None of these secrets are committed to Git. All credentials and signing parameters live in **GitHub ➔ Settings ➔ Secrets and variables ➔ Actions**.

---

## 1. Android Release Keystore Signing

- [ ] **Generate Keystore**:
  Run this command locally to generate a release upload keystore file named `upload.jks`:
  ```bash
  keytool -genkey -v -keystore upload.jks -keyalg RSA -keysize 2048 \
    -validity 10000 -alias upload
  ```
  *Note: Make sure to record the keystore password, alias, and key password securely.*

- [ ] **Base64-Encode the Keystore**:
  Encode the generated keystore binary to a plain-text string for GitHub Secrets:
  - **macOS/Linux**:
    ```bash
    base64 -i upload.jks -o upload.jks.b64
    ```
  - **Windows (PowerShell)**:
    ```powershell
    [Convert]::ToBase64String([IO.File]::ReadAllBytes("upload.jks")) > upload.jks.b64
    ```

- [ ] **Configure Action Secrets**:
  Add these secrets to your GitHub repository:
  - `ANDROID_KEYSTORE_BASE64` — Paste the full content of `upload.jks.b64`.
  - `ANDROID_KEYSTORE_PASSWORD` — The master password chosen for the keystore.
  - `ANDROID_KEY_ALIAS` — The alias name (e.g., `upload`).
  - `ANDROID_KEY_PASSWORD` — The password for the specific alias.

- [ ] **Backup Keystore File**:
  Save the original `upload.jks` file in a secure, offline backup directory. If you lose this keystore, you will be unable to push updates to existing Google Play listings unless you reset it through Google Support (which requires enrolling in Google Play App Signing).

---

## 2. Google Play API Access & Deployments

- [ ] **Google Cloud Project**:
  Log into the Google Cloud Console, select your app project, and enable the **Google Play Android Developer API**.

- [ ] **Create Service Account**:
  Go to **IAM & Admin ➔ Service Accounts**, create a service account (e.g., `play-publisher`), and generate a new **JSON key**. Download this key file.

- [ ] **Grant Play Console Permissions**:
  Go to your **Google Play Console ➔ Users & Permissions**, invite the service account email, and grant **Release Manager** (or Release permissions) for the Braintune app.

- [ ] **Configure Action Secret**:
  Add this secret in your GitHub repository:
  - `PLAY_SERVICE_ACCOUNT_JSON` — Paste the full content of the downloaded Service Account JSON key file.

- [ ] **First Release Upload**:
  Google Play API does not allow publishing completely new apps. You must create the app manually in the Google Play Console once and manually upload your first signed `.aab` package via the Web Console before the CD pipeline can deploy updates.

---

## 3. Repo Security Hardening

- [ ] **Branch Protection Rules**:
  Configure protection on `main` in GitHub:
  - Go to **Settings ➔ Branches**.
  - Require Pull Request reviews before merging.
  - Require status checks to pass (`lint-and-test` and `build-debug-apk`).
  - Restrict force-pushes and deletions.

- [ ] **Secrets & Code Scanning**:
  - Enable Dependabot version and security alerts.
  - Turn on Github Secret Scanning to prevent committing sensitive keys or credentials.
