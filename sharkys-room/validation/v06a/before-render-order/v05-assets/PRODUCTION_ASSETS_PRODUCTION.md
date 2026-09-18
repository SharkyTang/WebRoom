# v0.5 Production Asset Browser Validation

Generated: 2026-09-17T17:46:27.269Z
Mode: production
Result: 8 passed; 0 failed.

Every state change uses native mouse/touch/keyboard or navigation; the debug API only observes. Expected fallback tests are separate from successful production-asset acceptance.

| Check | Result |
| --- | --- |
| Production desktop installs all families without any debug API | PASS |
| Production mouse enters monitor at its recorded real visual pixel and uses Back | PASS |
| Production mouse enters macbook at its recorded real visual pixel and uses Back | PASS |
| Production mouse enters marshall at its recorded real visual pixel and uses Back | PASS |
| Production 390px touch installs all families without any debug API | PASS |
| Production touch enters monitor at its recorded real visual pixel and uses Back | PASS |
| Production touch enters macbook at its recorded real visual pixel and uses Back | PASS |
| Production touch enters marshall at its recorded real visual pixel and uses Back | PASS |

Touch emulation, not a physical phone. Safari and real GPU not tested.

