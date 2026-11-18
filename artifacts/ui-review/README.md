# UI verification — 18 November 2026

Implemented in `site/`; no deployment performed.

- Browser checked all five modules and all four learning steps with desktop (1280 × 720) and phone (360 × 800) viewport presets. No document or horizontal overflow was measured.
- Additional desktop (1366 × 768) and phone (390 × 844) visual checks; screenshots saved here as desktop.jpg and mobile.jpg.
- Confirmed a pointer drag changes the weightlifting target height and required energy.
- Confirmed scene load buttons change calculated outcomes in all applicable modules; keyboard arrows change the seat-belt speed handle.
- Confirmed original cycling worksheet answer remains 8 s after experimental mass changes, is graded correctly, and survives parameter reset and page reload.
- Verified no browser console errors during the module/step checks.
- npm test: 21 passed, 0 failed. Covers baseline physics, parameter editing, constraints, drag mapping, custom comparisons and independent A/B chart limits.
- git diff --check: passed.

Print CSS exposes all worksheet tasks and vector entries. Native printing and physical touchscreen hardware were not exercised.
