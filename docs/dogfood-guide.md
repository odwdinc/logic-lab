# Logic Lab — Dogfood Testing Guide

Thanks for helping test Logic Lab! This guide explains what to look for and how to report issues you find.

---

## What is dogfooding?

You're using the app as a real user would, before it goes wider. Your job is to **break things** — click where you wouldn't normally click, try weird inputs, use it on your phone, do things in the wrong order. If something feels off, confusing, or broken, that's worth a report.

---

## How to report an issue

File a GitHub issue here: **[link to your repo]/issues/new/choose**

Two templates are available — pick the one that fits:

- **Bug Report** — something is broken or behaves unexpectedly
- **Feature / Improvement** — something is missing or could work better

The templates have prompts to guide you. Fill in as much as you can — even a partial report is useful.

---

## The most helpful thing you can do

If your bug is related to a specific circuit, **export your project before reporting**:

1. Click **File** (top-left menu)
2. Click **Save Project**
3. Click **Copy JSON**
4. Paste the copied text into the GitHub issue

This lets us load your exact circuit and reproduce the problem immediately.

---

## Getting browser info

Every bug report needs your browser and device. Here's how to find it:

| Browser | How to get version |
|---|---|
| Chrome | Address bar → type `chrome://version` → copy the first line |
| Safari | Menu bar → Safari → About Safari |
| Firefox | Address bar → type `about:support` → copy "Firefox" line |
| Edge | Address bar → type `edge://version` |

**Device type:** desktop, laptop, iPad, iPhone, Android phone/tablet, etc.

---

## Getting console errors (optional but very helpful)

If the app shows an unexpected blank screen or something stops responding:

1. Press **F12** on your keyboard (or right-click anywhere → "Inspect")
2. Click the **Console** tab
3. Look for red text — copy it and paste into your issue

On iPhone/iPad this isn't possible — just describe what you saw.

---

## Things that are known / not bugs

- **Clearing browser history or cache will erase your project.** Always use File → Save Project → Copy JSON to back up your work externally.
- **There is no undo yet.** Deleting a node or wire is permanent until you reload a saved snapshot.
- **First load may look blank** — press **F** or File → Fit to Screen to fit the circuit to the view.

---

## Tips for good testing

- Try it on your **phone or tablet** — touch interactions are different from mouse
- Try **making a custom block**, editing it, and placing multiple copies
- Try **loading a project** by pasting JSON into File → Load Project
- Try **renaming circuits**, closing tabs, and switching between them
- Try using it in a browser you don't normally use

---

## Questions?

Ping [your team contact / Slack channel] if you're unsure whether something is a bug or have trouble filing an issue.
