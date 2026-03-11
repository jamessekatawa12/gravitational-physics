# Solar System Digital Twin (Interactive 3D)

A lightweight browser-based digital twin that supports:

- Continuous scale transitions from **planetary mass** to **solar mass**, **stellar black hole**, and **supermassive black hole** representations.
- Planetarium-style free exploration with smooth orbit controls, logarithmic depth rendering, and object focus tracking.
- Day / night mode for Solar System bodies and enhanced emissive style for exotic objects (neutron stars, black holes).
- Event simulation controls for:
  - collisions
  - stellar core collapse
  - supernova pulse
  - multi-body gravitational evolution (approximate N-body)
- Included known objects beyond planets: Moon, Ceres, Halley's Comet, synthetic neutron star, stellar black hole, SMBH core.

## Run locally

Because the app is static, you can run it with any local server:

```bash
python3 -m http.server 4173
```

Then open:

- <http://localhost:4173>

## Physics notes

- Gravity uses Newtonian N-body integration with softening and visual scale normalization for stability.
- Extreme compact objects use Schwarzschild-radius-derived metrics for collapse/morph visualizations.
- Distances and radii are rescaled for real-time visualization while preserving relative behavior.

## Performance notes

- No heavy build pipeline required.
- No bundled textures or model downloads by default.
- Stars and orbital trails are procedurally generated.
- Suitable for laptop execution and direct browser deployment.
