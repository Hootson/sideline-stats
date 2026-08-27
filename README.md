# Sideline Stats V3.4b

Fix:
- The manual possession button now works with the derived down-and-distance engine.
- A manual possession change is stored as a game-state event instead of being overwritten during recalculation.
- Switching possession resets the new offense to 1st & 10.
- Undo can remove the possession-switch event just like another game event.

Retained:
- Automatic first downs from down/distance + yards gained
- Fixed Reset All Data
- Offline PWA support
- Custom Sideline Stats Home Screen icon

Upload:
- index.html
- manifest.webmanifest
- service-worker.js
- icon.png
- README.md (optional)
