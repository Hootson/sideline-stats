# Sideline Stats V3.3a

Bug fix for V3.3.

The Week 1-10 update removed the calendar field from the New Game screen, but one old JavaScript line still attempted to access `newGameDate` whenever the Game screen rendered. That runtime error prevented Start New Game from working.

V3.3a:
- removes the stale calendar reference
- keeps Week 1-10 game setup
- keeps Regular Season / Playoff week labeling
- keeps offline PWA support
- bumps the service-worker cache to force the fixed app onto the phone

The finished JavaScript was syntax checked and static button listener targets were validated.
