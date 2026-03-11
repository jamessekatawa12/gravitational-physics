# Solar System Digital Twin (Interactive 3D)

A lightweight browser-based digital twin with visible real-time orbital dynamics.

## Features

- Planetarium-style 3D navigation (drag/orbit, pan, zoom).
- Dynamic N-body-inspired motion with adjustable simulation speed.
- Mass-class morphing for any focused object:
  - planet scale
  - solar mass
  - stellar black hole
  - supermassive black hole
- Event simulation controls:
  - collision injection
  - core collapse
  - supernova pulse
- Day/night modes for Solar System objects and enhanced stylization for exotic objects.

## Run locally

```bash
cd /workspace/gravitational-physics
python3 -m http.server 4173
```

Open <http://localhost:4173>.

## Quick start in-app

1. Keep **Run N-body dynamics** enabled.
2. Keep **Simulation speed** at ~45 or higher.
3. Set **Focus = Sun** to clearly see planetary motion.
4. Optionally enable **Auto-follow focus target** if you want the camera to track a body.

## Physics notes

- Dynamics use Newtonian gravity with softened acceleration to keep the real-time simulation numerically stable.
- Compact object transformations use Schwarzschild-radius calculations for physically grounded visual scaling.
- Distances are heavily rescaled to support browser rendering while preserving relative system behavior.
