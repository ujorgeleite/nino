const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Two iOS build fixes that have to survive `expo prebuild`.
//
// `ios/` is gitignored (Continuous Native Generation), so editing the Podfile
// or the Xcode project by hand works exactly once — the next prebuild throws it
// away. Both fixes therefore live here.

const PODFILE_MARKER = '# [withIosBuildFixes] explicit modules';
const PHASE_NAME = '[withIosBuildFixes] Sign embedded frameworks';

/**
 * Fix 1 — Xcode 26 builds C/ObjC clang modules explicitly by default. The
 * lottie_react_native module pulls in React-jsi's jsi.h, which is C++, from an
 * Objective-C compilation, so the C++ stdlib is not on the include path and
 * <cassert> fails to resolve during dependency scanning:
 *
 *   error: Clang dependency scanning failure: ... 'cassert' file not found
 *   error: Unable to resolve module dependency: 'lottie_react_native'
 *
 * Explicit modules only change build strategy, not semantics, so disabling them
 * is safe; it costs some build-time parallelism.
 */
function withoutExplicitClangModules(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');

      if (contents.includes(PODFILE_MARKER)) return cfg;

      // Append inside the existing post_install block, right after
      // react_native_post_install(...) closes.
      const anchor = /(\n\s*react_native_post_install\([\s\S]*?\n\s*\)\n)/;
      if (!anchor.test(contents)) {
        throw new Error(
          '[withIosBuildFixes] could not find react_native_post_install in the Podfile — ' +
            'the Expo template changed and this plugin needs updating.'
        );
      }

      contents = contents.replace(
        anchor,
        `$1
    ${PODFILE_MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
      end
    end
`
      );

      fs.writeFileSync(podfile, contents);
      return cfg;
    },
  ]);
}

/**
 * Fix 2 — Hermes, React and the Expo modules ship as prebuilt xcframeworks
 * (EXPO_USE_PRECOMPILED_MODULES / RCT_USE_PREBUILT_RNCORE). They land in
 * the app bundle without "Code Sign On Copy", and CocoaPods' embed script only
 * signs what it copies itself — so they arrive unsigned and the device rejects
 * the whole bundle at install time:
 *
 *   Failed to verify code signature of .../hermesvm.framework
 *     : No code signature found.  (ApplicationVerificationFailed)
 *
 * This build phase signs every embedded framework. It is appended last, which
 * still runs before Xcode's own signing of the .app, so the outer signature
 * stays valid.
 */
const SIGN_SCRIPT = [
  'set -euo pipefail',
  '# Nothing to do for simulator builds or when signing is off.',
  'if [ "${CODE_SIGNING_ALLOWED:-YES}" = "NO" ] || [ -z "${EXPANDED_CODE_SIGN_IDENTITY:-}" ]; then',
  '  echo "note: signing not required for this configuration; skipping"',
  '  exit 0',
  'fi',
  'FRAMEWORKS="${CODESIGNING_FOLDER_PATH}/Frameworks"',
  '[ -d "$FRAMEWORKS" ] || exit 0',
  'for fw in "$FRAMEWORKS"/*.framework; do',
  '  [ -e "$fw" ] || continue',
  '  echo "Signing $(basename "$fw")"',
  '  /usr/bin/codesign --force --sign "${EXPANDED_CODE_SIGN_IDENTITY}" ${OTHER_CODE_SIGN_FLAGS:-} --preserve-metadata=identifier,entitlements "$fw"',
  'done',
  // The pbxproj format stores the script as a single quoted string: newlines
  // have to be escaped, or the project file no longer parses. The `xcode` lib
  // escapes quotes for us but not these.
].join('\\n');

function withSignedEmbeddedFrameworks(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;

    // addBuildPhase appends, so this lands after the embed phases.
    const existing = project.pbxItemByComment(PHASE_NAME, 'PBXShellScriptBuildPhase');
    if (existing) return cfg;

    const phase = project.addBuildPhase([], 'PBXShellScriptBuildPhase', PHASE_NAME, null, {
      shellPath: '/bin/sh',
      shellScript: SIGN_SCRIPT,
    });

    // The frameworks it signs are produced by earlier phases, so there is no
    // input/output file set to declare. Opting out of dependency analysis makes
    // it run every build deliberately, instead of Xcode warning that it does so
    // by accident. `addBuildPhase` does not forward this key, so set it here.
    phase.buildPhase.alwaysOutOfDate = 1;

    return cfg;
  });
}

module.exports = (config) =>
  withSignedEmbeddedFrameworks(withoutExplicitClangModules(config));
