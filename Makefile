# Makefile — Pedrinho Travels
#
# Every target here is a command that actually works in this project today.
# Run `make` or `make help` to see them.
#
# Note: this project has a pre-existing peer-dependency conflict in its tree
# (react-dom 19.2.7 wants react ^19.2.7, the project pins react 19.2.3), so
# installs go through --legacy-peer-deps. See `make install`.

.DEFAULT_GOAL := help
.PHONY: help install reinstall doctor start android web \
        ios ios-phone ios-preflight ios-shutdown simulators \
        device device-build device-eas device-tunnel \
        verify typecheck lint lint-fix check-worklets check-expect format format-check \
        test watch test-file coverage sounds music item-sounds e2e e2e-headed e2e-report check-bundle \
        clean clean-cache clean-all outdated ci

NPM_FLAGS := --legacy-peer-deps

# Simulator devices. Override per-run if you have different ones installed:
#   make ios IPAD="iPad Pro 13-inch (M4)"
# `make simulators` lists what this Mac actually has.
IPAD   ?= iPad Pro 11-inch (M4)
IPHONE ?= iPhone 16 Pro

## ---------------------------------------------------------------------------
## Help
## ---------------------------------------------------------------------------

help: ## Show this help
	@echo ""
	@echo "  Pedrinho Travels — development commands"
	@echo ""
	@grep -E '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "  Most days:  make ios     (develop)"
	@echo "              make watch   (TDD loop)"
	@echo "              make verify  (before you commit)"
	@echo ""

## ---------------------------------------------------------------------------
## Setup
## ---------------------------------------------------------------------------

install: ## Install dependencies
	npm install $(NPM_FLAGS)

reinstall: ## Nuke node_modules and reinstall from scratch
	rm -rf node_modules package-lock.json
	npm install $(NPM_FLAGS)

doctor: ## Check the Expo SDK 57 dependency tree is coherent
	npx expo-doctor

outdated: ## Show dependencies that drifted from what Expo SDK 57 expects
	npx expo install --check

sounds: ## Regenerate the sound cues in assets/sounds from their specified frequencies
	node scripts/generate-sounds.js

music: ## Regenerate the per-country ambient loops in assets/music
	node scripts/generate-music.js

item-sounds: ## Regenerate the item voices (duck, horse, bicycle…) in assets/sounds/items
	node scripts/generate-item-sounds.js

## ---------------------------------------------------------------------------
## Run the app
## ---------------------------------------------------------------------------

start: ## Start the Expo dev server (pick a platform interactively)
	npx expo start

ios: ## Run on an iPad simulator — the primary target device
	@$(MAKE) --no-print-directory ios-preflight
	@echo "==> Booting $(IPAD)"
	@xcrun simctl boot "$(IPAD)" 2>/dev/null || echo "    (already booted)"
	@open -a Simulator
	@echo "==> Rotate to landscape: Cmd+Left Arrow (the app is landscape-only)"
	npx expo start --ios

ios-phone: ## Run on an iPhone simulator (secondary — layout is tuned for iPad)
	@$(MAKE) --no-print-directory ios-preflight
	@xcrun simctl boot "$(IPHONE)" 2>/dev/null || echo "    (already booted)"
	@open -a Simulator
	npx expo start --ios

# --- Physical iPad ----------------------------------------------------------
#
# This app CANNOT run in Expo Go. @shopify/react-native-skia ships its own
# native code, and Expo Go only contains the native modules baked into the
# Expo SDK. WoodCard.tsx imports Skia, so the game screen would crash.
#
# A physical iPad therefore needs a *development build* — your own build of the
# app with this project's native modules compiled in, plus the dev tooling.
# Build it once; after that `make device` just reconnects the JS bundle and
# you develop normally with fast refresh.
#
# Two ways to produce it:
#   make device-build   local, needs Xcode, works with a FREE Apple ID
#   make device-eas     cloud, no Xcode, needs a PAID Apple Developer account

device-build: ## Build + install a dev build on a connected iPad (needs Xcode, free Apple ID)
	@$(MAKE) --no-print-directory ios-preflight
	@echo "==> Connect the iPad by USB and trust this Mac, then pick it from the list."
	npx expo run:ios --device

device-eas: ## Build a dev build in Expo's cloud (no Xcode; needs PAID Apple account)
	@command -v eas >/dev/null 2>&1 || { \
		echo "eas-cli is not installed. Run: npm install -g eas-cli"; exit 1; }
	eas build --profile development --platform ios

device: ## Reconnect an ALREADY-INSTALLED dev build to this dev server
	@echo "==> Open the dev build on the iPad; it should find this server."
	@echo "==> If iPad and Mac are on different networks, use: make device-tunnel"
	npx expo start --dev-client

device-tunnel: ## Same as `device`, routed through a tunnel (different networks / locked-down WiFi)
	npx expo start --dev-client --tunnel

simulators: ## List the iOS simulators installed on this Mac
	@$(MAKE) --no-print-directory ios-preflight
	@xcrun simctl list devices available

ios-shutdown: ## Shut down every running simulator
	@xcrun simctl shutdown all 2>/dev/null || true
	@echo "==> All simulators shut down"

# Preflight: full Xcode (not just Command Line Tools) is required for simctl.
# Fails with an actionable message instead of a cryptic xcrun error.
ios-preflight:
	@xcrun simctl help >/dev/null 2>&1 || { \
		echo ""; \
		echo "  iOS simulators are not available on this Mac."; \
		echo ""; \
		echo "  simctl ships with the full Xcode app, not the Command Line Tools."; \
		echo "  Current developer dir: $$(xcode-select -p)"; \
		echo ""; \
		echo "  To fix:"; \
		echo "    1. Install Xcode from the App Store (~10GB, takes a while)"; \
		echo "    2. sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"; \
		echo "    3. xcodebuild -runFirstLaunch"; \
		echo "    4. Open Xcode > Settings > Components and install an iOS runtime"; \
		echo ""; \
		echo "  Note: Expo Go is NOT an option for this project — it cannot load"; \
		echo "  @shopify/react-native-skia. A real iPad needs a development build:"; \
		echo "  'make device-build' (needs Xcode) or 'make device-eas' (paid account)."; \
		echo "  'make web' gives a rough layout preview with no native modules."; \
		echo ""; \
		exit 1; \
	}

android: ## Start on an Android emulator
	npx expo start --android

web: ## Start in the browser (layout sanity only; native modules are stubbed)
	npx expo start --web

clean-cache: ## Start with a cleared Metro bundler cache (fixes stale-module weirdness)
	npx expo start --clear

## ---------------------------------------------------------------------------
## Quality gate
## ---------------------------------------------------------------------------

verify: ## THE GATE — typecheck + lint + worklets + tests. Nothing ships until this passes
	npm run verify

typecheck: ## TypeScript only (strict mode, no emit)
	npm run typecheck

lint: ## ESLint only
	npm run lint

lint-fix: ## ESLint with --fix
	npx eslint . --fix

check-worklets: ## Catch Reanimated worklet-boundary bugs (invisible on web, fatal on device)
	node scripts/check-worklets.js

check-offline: ## Prove the app never touches the network
	npm run check:offline

check-bundle: ## Fail if the shipped assets grow past their budget
	node scripts/check-bundle.js

check-expect: ## Catch Playwright-style expect(value, 'msg') inside Jest tests
	node scripts/check-jest-expect.js

# Formatting is NOT part of `verify` and NOT enforced in CI. The codebase was
# written before Prettier existed here, so `make format` would rewrite ~25 files
# in one commit and bury real changes in diff noise. The hand-aligned lookup
# tables in constants/ are in .prettierignore for the same reason.
# Run it deliberately on files you already touched, not repo-wide.

format: ## Rewrite files with Prettier (see caveat above — rewrites ~25 files)
	npm run format

format-check: ## List files Prettier would rewrite (informational, not a gate)
	npx prettier --check . || true

## ---------------------------------------------------------------------------
## Tests
## ---------------------------------------------------------------------------

test: ## Run the test suite once
	npm run test

watch: ## Re-run tests on save — the TDD loop for hooks
	npm run test:watch

test-file: ## Run one test file: make test-file F=hooks/useMemoryGame.test.ts
	@test -n "$(F)" || (echo "Usage: make test-file F=path/to/file.test.ts" && exit 1)
	npx jest $(F)

coverage: ## Test suite with a coverage report for hooks/, utils/, components/
	npx jest --coverage

## ---------------------------------------------------------------------------
## End-to-end
## ---------------------------------------------------------------------------
#
# Playwright drives the app for real, built for web. True device E2E (Detox /
# Maestro) needs a simulator, which this machine has no Xcode for. Web E2E
# covers wiring, game rules, layout and visibility — NOT iPad touch, haptics,
# native audio or on-device frame rate.

e2e: ## Run the end-to-end suite (builds for web, drives a real browser)
	npx playwright test

e2e-headed: ## Same, with a visible browser — useful when a test is confusing
	npx playwright test --headed

e2e-report: ## Open the last E2E report
	npx playwright show-report

## ---------------------------------------------------------------------------
## Housekeeping
## ---------------------------------------------------------------------------

clean: ## Remove build caches (keeps node_modules)
	rm -rf .expo dist coverage
	rm -rf $(TMPDIR)metro-* $(TMPDIR)haste-map-* 2>/dev/null || true

clean-all: clean reinstall ## Full reset: caches + node_modules + reinstall

ci: ## Exactly what CI runs (see .github/workflows/ci.yml)
	npm ci
	npm run verify
