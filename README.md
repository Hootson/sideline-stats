# Sideline Stats V3.7.8

## Important update-delivery fix
Previous service workers used cache-first behavior for index.html/navigation.
On iPhone Safari/PWA this could cause a newly deployed version to look completely unchanged.

V3.7.8 changes the service worker so:
- app HTML/navigation is NETWORK-FIRST
- latest deployed index.html is requested with no-store
- cached HTML is used only as an offline fallback
- static assets remain cached for offline use
- old version caches are deleted on activation

This keeps offline capability while making future deployments reliably visible.

## UI included from V3.7.7
- Refined shareable stats header
- Mobile-first receiving table
- No horizontal receiving-table overflow on narrow phones
- Full data retained on wider screens and share images
