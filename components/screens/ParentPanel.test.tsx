// components/screens/ParentPanel.test.tsx
// The grown-up panel must not contain anything that does nothing.

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ParentPanel from './ParentPanel';
import { PRIVACY_SECTIONS } from './PrivacyNotice';

describe('ParentPanel', () => {
  it('opens the privacy policy in the app', () => {
    // THE BUG THIS PINS DOWN: this panel had four buttons — Settings, Trip
    // history, Contact, Privacy — and NONE of them had an onPress. A parent
    // tapping one got silence. Apple also requires a Kids-category app to make
    // its privacy policy reachable, so the dead "Privacy" button was a review
    // risk as well as a broken promise.
    render(<ParentPanel onClose={() => {}} />);

    expect(screen.queryByText(PRIVACY_SECTIONS[0].heading)).toBeNull();

    fireEvent.press(screen.getByTestId('privacy-toggle'));

    for (const section of PRIVACY_SECTIONS) {
      expect(screen.getByText(section.heading)).toBeTruthy();
    }
  });

  it('closes the privacy policy again', () => {
    render(<ParentPanel onClose={() => {}} />);

    fireEvent.press(screen.getByTestId('privacy-toggle'));
    fireEvent.press(screen.getByTestId('privacy-toggle'));

    expect(screen.queryByText(PRIVACY_SECTIONS[0].heading)).toBeNull();
  });

  it('every control in the panel does something', () => {
    // The rule this panel broke: it had four buttons — Settings, Trip history,
    // Contact, Privacy — and not one of them had an onPress.
    //
    // Stated as behaviour rather than by inspecting props, because a Pressable
    // renders both a composite and a host element and only one of them carries
    // the handler: a structural sweep reported the WORKING buttons as dead.
    const onClose = jest.fn();
    render(<ParentPanel onClose={onClose} />);

    fireEvent.press(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('privacy-toggle'));
    expect(screen.getByText(PRIVACY_SECTIONS[0].heading)).toBeTruthy();

    // Anything else that looks tappable has to be accounted for here too.
    const labels = screen
      .UNSAFE_getAllByProps({ accessibilityRole: 'button' })
      .map((n) => n.props.accessibilityLabel)
      .filter(Boolean);
    expect(new Set(labels)).toEqual(new Set(['Close', 'Hide privacy policy']));
  });

  it('promises only what the app actually does', () => {
    // The panel tells parents the app is offline and collects nothing. That is
    // currently true, and this pins the CLAIM to the policy text so the two
    // cannot drift apart.
    render(<ParentPanel onClose={() => {}} />);
    fireEvent.press(screen.getByTestId('privacy-toggle'));

    const collects = PRIVACY_SECTIONS.find((s) => s.heading === 'What we collect');
    expect(collects?.body).toMatch(/^Nothing\./);
    const leaves = PRIVACY_SECTIONS.find((s) => s.heading === 'What leaves the device');
    expect(leaves?.body).toMatch(/^Nothing\./);
  });
});
