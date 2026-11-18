# Approved Võ Tướng screen — dragon palace

The approved visual reference is the red-and-gold dragon palace hero screen with Trương Phi centered, a six-slot equipment arrangement, left-side hero roster, four top tabs, and the detailed stats panel at right.

This restoration ports the previously approved hero UI from commit `552fad3` onto the latest main branch, rather than reverting the entire application or Cloud Save. The restored assets include the original animated spirit sheets. Do not replace this UI with the later three-column Triệu Vân design without new approval.

The onboarding tutorial portrait listener is registered before the scene navigation listener so selecting a portrait can advance the tutorial.

Do not modify player saves, user authentication, inventory ownership or Supabase schema as part of this visual restoration.
