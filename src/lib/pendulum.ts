/**
 * Simple pendulum: θ'' = -(g/L) sin(θ) - b θ'
 * State (θ, ω) with ω = θ'. Integrated with RK4.
 */

export type PendulumConfig = {
  /** Length (m). */
  length: number
  /** Gravity (m/s²). */
  gravity: number
  /** Damping coefficient (1/s). 0 = undamped. */
  damping: number
  /** Initial angle (radians). */
  theta0: number
  /** Initial angular velocity (rad/s). */
  omega0: number
  /** Duration (s). */
  duration: number
  /** Time step (s). */
  dt: number
}

export type PendulumResult = {
  t: number[]
  theta: number[]
  omega: number[]
}

function rk4Step(
  theta: number,
  omega: number,
  dt: number,
  g: number,
  L: number,
  b: number
): [number, number] {
  const dtheta = (om: number) => om
  const domega = (th: number, om: number) => -(g / L) * Math.sin(th) - b * om

  const k1t = dtheta(omega)
  const k1o = domega(theta, omega)
  const k2t = dtheta(omega + 0.5 * dt * k1o)
  const k2o = domega(theta + 0.5 * dt * k1t, omega + 0.5 * dt * k1o)
  const k3t = dtheta(omega + 0.5 * dt * k2o)
  const k3o = domega(theta + 0.5 * dt * k2t, omega + 0.5 * dt * k2o)
  const k4t = dtheta(omega + dt * k3o)
  const k4o = domega(theta + dt * k3t, omega + dt * k3o)

  const newTheta = theta + (dt / 6) * (k1t + 2 * k2t + 2 * k3t + k4t)
  const newOmega = omega + (dt / 6) * (k1o + 2 * k2o + 2 * k3o + k4o)
  return [newTheta, newOmega]
}

/**
 * Integrate pendulum ODE; return time, angle, and angular velocity arrays.
 */
export function integratePendulum(config: PendulumConfig): PendulumResult {
  const { length, gravity, damping, theta0, omega0, duration, dt } = config
  const g = Math.max(1e-9, gravity)
  const L = Math.max(1e-9, length)
  const b = Math.max(0, damping)

  const n = Math.max(1, Math.ceil(duration / dt))
  const t: number[] = new Array(n + 1)
  const theta: number[] = new Array(n + 1)
  const omega: number[] = new Array(n + 1)

  t[0] = 0
  theta[0] = theta0
  omega[0] = omega0

  let th = theta0
  let om = omega0
  for (let i = 0; i < n; i++) {
    const ti = (i + 1) * dt
    ;[th, om] = rk4Step(th, om, dt, g, L, b)
    t[i + 1] = ti
    theta[i + 1] = th
    omega[i + 1] = om
  }

  return { t, theta, omega }
}
