# Stochastic Processes Simulator

A browser-based app to simulate stochastic differential equations (SDEs): choose built-in or custom processes, run many paths, and view trajectories, statistics, and analytical solutions.

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Build

```bash
npm run build
npm run preview   # serve dist/
```

## Features

- **Built-in processes**: Brownian motion, Ornstein–Uhlenbeck, Geometric Brownian motion, Langevin (overdamped)
- **Custom SDE**: Define your own drift `f(x,t)` and diffusion `g(x,t)` (e.g. `theta * (mu - x)` and `sigma`)
- **Simulation**: Euler–Maruyama method; configurable end time, step size, number of paths, and optional seed for reproducibility
- **Views**: Paths (sample of trajectories), Statistics (mean ± 2σ band), and Solutions (analytical formulas and theory vs simulation comparison for OU, Brownian, GBM)

See [DESIGN.md](./DESIGN.md) for architecture and future plans.
