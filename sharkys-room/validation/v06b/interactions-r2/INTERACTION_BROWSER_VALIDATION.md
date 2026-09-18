# v0.4 Interaction Browser Validation

- Generated: 2026-09-18T06:48:23.884Z
- URL: http://127.0.0.1:3000
- Browser: Installed Google Chrome; Playwright headless; ANGLE SwiftShader (software WebGL)
- Result: 37 passed; 0 failed
- Every UI state change is driven by native mouse, touch, or keyboard input.
- Exact camera/mechanical endpoints are observed only through the development-only debug bridge.
- Touch checks validate real browser event wiring at visible raycast pixels; synthetic coordinates do not replace a physical-device usability review.

| Check | Result |
| --- | --- |
| Initial state preserves the validated frozen room and all nine visible raycast paths | PASS |
| Hero → Monitor Projects focus → visible Back restores the exact Hero camera | PASS |
| MacBook hinge reaches its exact open endpoint and closes before returning to Hero | PASS |
| iPad activates the Memories prototype and ESC returns exactly to Hero | PASS |
| Marshall powers on, toggles Off/On with native controls, and persists after Back | PASS |
| Marshall explicitly switched Off stays Off after returning and refocusing | PASS |
| Piano moves exactly 0.65 m along the loaded rail axis and reaches both exact endpoints | PASS |
| Trash lid opens to its exact hinge endpoint; Back closes it before exact Hero return | PASS |
| Light Switch ON → OFF → ON changes only practical light intensities and exact switch endpoints | PASS |
| Phone focuses Contact placeholders without external navigation | PASS |
| Practical lights can remain OFF while Monitor screen stays active and the room stays navigable | PASS |
| Window native Time slider spans 00:00 through 24:00 and updates centralized state | PASS |
| Window selects Sunny with a native button and updates application state only | PASS |
| Window selects Cloudy with a native button and updates application state only | PASS |
| Window selects Overcast with a native button and updates application state only | PASS |
| Window selects Rainy with a native button and updates application state only | PASS |
| Window selects Snowy with a native button and updates application state only | PASS |
| Window state persists after Back without adding weather rendering | PASS |
| Non-interactive visible geometry does not start a semantic action or camera fly | PASS |
| Rapid competing object clicks preserve one focus and exact mechanical/return transforms | PASS |
| Rapid Piano control clicks remain safe and repeated extend/retract cycles have no drift | PASS |
| Back and ESC remain deterministic through repeated complete interaction sessions | PASS |
| Back requested during focus queues a safe return instead of leaving a stuck animation | PASS |
| Keyboard-accessible object selector provides a non-hover path and restores keyboard focus after Back | PASS |
| 390×844 real touchscreen monitor focus and visible Back path | PASS |
| 390×844 real touchscreen macbook focus and visible Back path | PASS |
| 390×844 real touchscreen ipad focus and visible Back path | PASS |
| 390×844 real touchscreen marshall focus and visible Back path | PASS |
| 390×844 real touchscreen piano focus and visible Back path | PASS |
| 390×844 real touchscreen trashcan focus and visible Back path | PASS |
| 390×844 real touchscreen lightswitch focus and visible Back path | PASS |
| 390×844 real touchscreen phone focus and visible Back path | PASS |
| 390×844 real touchscreen window focus and visible Back path | PASS |
| Mobile Window slider, weather, and Marshall controls work with native touch controls | PASS |
| Reduced-motion preference keeps focus, hinge, piano and Back functional at exact endpoints | PASS |
| Demand rendering stops while idle, advances during GSAP focus and stops after animation | PASS |
| All interaction sessions finish without critical console errors, React warnings or failed assets | PASS |

Raw snapshots, input coordinates, errors and screenshot references: `interaction_browser.json`.
