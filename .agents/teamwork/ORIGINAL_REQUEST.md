# Original User Request

## Initial Request — 2026-11-09T13:08:09Z

Implement mobile UX enhancements for production users of the family tree web application, including a collapsible top navigation bar on scroll, a full-screen view mode, pinch-to-zoom touch gestures, and UI animations.

Working directory: c:\B-Tech 1st year\Family Tree
Integrity mode: development

Reference material:
- Oil-motion: https://github.com/oil-oil/oil-motion
- FormKit AutoAnimate: https://github.com/formkit/auto-animate
- Motion: https://github.com/motiondivision/motion
- Live Firebase Hosting URL: https://vanshvriksha.web.app (project: gupta-family-tree-akg)
- GitHub repository: https://github.com/arpitkumar81008-cmd/family-tree.git

## Requirements

### R1. Collapsible Top Navigation Bar on Mobile
On mobile devices, when scrolling upwards, the top bar containing "Copy Link", "GitHub", "Sign In", "Home", and "Demo Tree" must collapse into a small size or become invisible to reduce screen clutter and provide more screen real estate when viewing the family tree. It must become visible only when scrolling down. Either collapsing into a compact bar or becoming invisible is acceptable.

### R2. Full-Screen Mode for Mobile Family Tree
Provide a full-screen viewing mode on mobile devices for exploring the family tree, accessible via a dedicated toggle button or control, allowing users to enter and exit full-screen mode to maximize screen real estate.

### R3. Pinch-to-Zoom Gesture Controls
On mobile devices when viewing the family tree, pinching inward with two fingers must zoom out, and expanding outward with two fingers must zoom in smoothly without interfering with tree pan or navigation.

### R4. UI Animations
Add basic UI animations to the application using a suitable approach or library selected from or inspired by the referenced repositories (motiondivision/motion, formkit/auto-animate, oil-oil/oil-motion, or lightweight CSS/JS).

### R5. Non-Regression and Stability
Ensure that all existing functionality across the family tree application remains intact and that all existing features continue to work without breaking. Verify that nothing else breaks once all features are implemented.

## Acceptance Criteria

### Mobile Top Bar Behavior
- [ ] On mobile viewports, scrolling upwards causes the top bar containing Copy Link, GitHub, Sign In, Home, and Demo Tree to collapse into a compact size or become invisible.
- [ ] Scrolling down makes the top bar visible again.
- [ ] Top bar interactive elements (Copy Link, GitHub, Sign In, Home, Demo Tree) remain fully functional when visible.

### Full-Screen Mode
- [ ] A dedicated toggle control allows mobile users to enter and exit full-screen mode when viewing the family tree.
- [ ] In full-screen mode, the family tree utilizes the full viewport height and width.
- [ ] Exiting full-screen mode cleanly restores the standard layout and controls.

### Pinch-to-Zoom Touch Gestures
- [ ] In mobile viewport touch interactions on the family tree, pinching two fingers inward zooms out the tree view.
- [ ] Spreading two fingers outward zooms in the tree view.
- [ ] Touch zoom interactions operate smoothly without conflicting with single-finger panning or breaking tree navigation.

### UI Animations
- [ ] Smooth UI animations are applied to interactive components (such as header collapse/expand, full-screen transitions, and tree controls) using an integrated animation library or CSS transitions.
- [ ] Animations run smoothly without layout thrashing, stutter, or performance degradation on mobile viewports.

### Non-Regression and Verification
- [ ] Existing desktop and mobile features, navigation links, demo tree loading, and authentication flows remain intact and functional without console errors.
- [ ] Automated tests and mobile emulation checks pass cleanly.
