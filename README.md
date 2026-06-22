# Braintune — Kids Focus + Learning Mobile Game

Braintune is a premium, offline-first mobile focus and learning game designed for children ages 4–8. It combines essential early-learning concepts (letters, numbers, shapes, and colors) with focus and attention training.

---

## Why React Native?

We chose **React Native (Bare Workflow)** as the core framework for Braintune over Flutter for the following reasons:
1. **Developer Ecosystem**: The development environment pre-installed Node.js and NPM, which allows for instant scaffolding and package management without separate SDK setup.
2. **Standard Android Tooling**: Pure React Native checks the `android/` directory directly into source control, enabling exact control over the Gradle files (`android/app/build.gradle`), version increments, and standard signing configurations.
3. **No-Dependency Design**: We implemented core features (animations, custom shapes, and icons) using standard React Native `<View>` styles and native emojis. This eliminates the risk of native module compilation breaks during automated CI/CD builds.
4. **Rich Animated UI**: React Native's `Animated` library provides high-performance breathing, floating, and scale-up mascot animations, satisfying the requirement for premium, responsive micro-animations.

---

## Repository Structure

Braintune has a highly modular architecture, making it easy to independently add or update games:

```
braintune/
├── .github/
│   └── workflows/
│       ├── ci.yml            # CI: Lints, tests, builds debug APK
│       └── cd.yml            # CD: Decodes keystore, builds & signs release APK/AAB, deploys
├── __tests__/
│   ├── App.test.tsx          # App rendering smoke tests
│   └── gameLogic.test.ts     # Unit tests for game configs and DB profile storage
├── android/                  # Android native project files
├── docs/
│   ├── RELEASE.md            # Release runbook and branching strategy
│   └── SECRETS.md            # Setup checklist for keystores and API credentials
├── ios/                      # iOS native project files
├── src/
│   ├── components/
│   │   ├── Mascot.tsx        # "Bino the Brain" mascot with expressions
│   │   └── ParentGate.tsx    # Parental gate validation dialog
│   ├── games/
│   │   ├── colors/           # Scaffolded colors & shapes game
│   │   ├── letters/          # Scaffolded letters & phonics game
│   │   ├── memory/           # Memory Match & Attention game (Reference implementation)
│   │   ├── numbers/          # Scaffolded numbers & counting game
│   │   └── GameRegistry.ts   # Mini-game configuration database
│   ├── state/
│   │   └── AppContext.tsx    # Global state manager (child profiles, stats, settings)
│   ├── storage/
│   │   └── db.ts             # AsyncStorage wrapper for offline profiles and analytics
│   └── theme/
│       └── colors.ts         # Soft pastel palette & responsive shadow styles
└── App.tsx                   # Screen navigator and profile dashboard
```

---

## Local Setup & Development

### Prerequisites

- Node.js (>= 22.11.0)
- npm (>= 11.0.0)
- Android SDK / Emulator (to run locally)

### 1. Install Dependencies

Install project packages:
```bash
npm install
```

### 2. Start the Dev Server (Metro)

Launch the Metro package builder:
```bash
npm start
```

### 3. Run on Android Emulator/Device

In another terminal window, start the compiler to deploy onto your emulator:
```bash
npm run android
```

---

## Running Quality Checks & Tests

Before pushing code, always run the linter and test suite:

- **Run Unit Tests**:
  ```bash
  npm test
  ```
- **Run Linter**:
  ```bash
  npm run lint
  ```

---

## CI/CD Pipeline & Releases

Braintune has fully automated pipelines configured via GitHub Actions:

- **Continuous Integration (CI)**: Runs on every push/PR to `main` and `dev`. It validates code lint rules, executes Jest unit tests, compiles the code, and generates a debug `.apk` package.
- **Continuous Deployment (CD)**: Runs on tag pushes matching `v*` (e.g., `v1.2.0`). It decodes your keystore, compiles and signs a production release APK and AAB, publishes a GitHub Release with the APK, and uploads the AAB package to Google Play's internal testing track.

For instructions on configuring certificates, keys, and credentials, see the [Secrets Setup Guide](file:///e:/code/braintune/docs/SECRETS.md).

For step-by-step procedures on cut releases and version bumps, check the [Release Runbook](file:///e:/code/braintune/docs/RELEASE.md).
