import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { integratePendulum } from '@/lib/pendulum'
import styles from './MarkovChainSection.module.css'

const PENDULUM_PIVOT = { x: 160, y: 40 }
const PENDULUM_SCALE = 80

function renderLatex(latex: string, displayMode = false): string {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false })
  } catch {
    return latex
  }
}

const RAD2DEG = 180 / Math.PI

export function PendulumSection() {
  const [length, setLength] = useState(1)
  const [gravity, setGravity] = useState(9.81)
  const [damping, setDamping] = useState(0)
  const [theta0Deg, setTheta0Deg] = useState(90)
  const [omega0, setOmega0] = useState(0)
  const [duration, setDuration] = useState(10)
  const [dt, setDt] = useState(0.02)
  const [result, setResult] = useState<{
    t: number[]
    theta: number[]
    omega: number[]
  } | null>(null)
  const [timeIndex, setTimeIndex] = useState(0)
  const [playing, setPlaying] = useState(false)

  const runSimulation = useCallback(() => {
    const res = integratePendulum({
      length,
      gravity,
      damping,
      theta0: (theta0Deg * Math.PI) / 180,
      omega0,
      duration,
      dt,
    })
    setResult(res)
    setTimeIndex(0)
    setPlaying(false)
  }, [length, gravity, damping, theta0Deg, omega0, duration, dt])

  const phaseData = useMemo(() => {
    if (!result) return []
    return result.t.map((t, i) => ({
      theta: result.theta[i],
      omega: result.omega[i],
      t,
    }))
  }, [result])

  const timeSeriesData = useMemo(() => {
    if (!result) return []
    return result.t.map((t, i) => ({
      t,
      theta: result.theta[i] * RAD2DEG,
      omega: result.omega[i],
    }))
  }, [result])

  const timeIndexClamped = result
    ? Math.min(timeIndex, result.t.length - 1)
    : 0
  const currentTheta = result ? result.theta[timeIndexClamped] : 0
  const currentOmega = result ? result.omega[timeIndexClamped] : 0
  const currentT = result ? result.t[timeIndexClamped] : 0
  const bobX = PENDULUM_PIVOT.x + PENDULUM_SCALE * Math.sin(currentTheta)
  const bobY = PENDULUM_PIVOT.y + PENDULUM_SCALE * Math.cos(currentTheta)

  const resultRef = useRef(result)
  const lineRef = useRef<SVGLineElement>(null)
  const bobRef = useRef<SVGCircleElement>(null)
  const timeDisplayRef = useRef<HTMLSpanElement>(null)
  const sliderRef = useRef<HTMLInputElement>(null)
  const startTimeRef = useRef(0)
  const startIndexRef = useRef(0)
  const lastIndexRef = useRef(0)
  const rafIdRef = useRef<number | null>(null)

  resultRef.current = result

  useEffect(() => {
    if (!result || !playing) return
    const res = result
    const n = res.t.length
    const dt = res.t[1] - res.t[0]
    const duration = res.t[n - 1] - res.t[0]
    startTimeRef.current = performance.now() - timeIndexClamped * dt * 1000
    startIndexRef.current = timeIndexClamped

    const tick = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000
      const t = (startIndexRef.current * dt + elapsed) % duration
      const fi = Math.max(0, t / dt)
      const i0 = Math.min(Math.floor(fi), Math.max(0, n - 2))
      const frac = fi - i0
      const theta = res.theta[i0] + frac * (res.theta[i0 + 1] - res.theta[i0])
      const omega = res.omega[i0] + frac * (res.omega[i0 + 1] - res.omega[i0])
      const tDisplay = res.t[i0] + frac * (res.t[i0 + 1] - res.t[i0])
      const idx = Math.min(Math.round(fi), n - 1)

      const bobX = PENDULUM_PIVOT.x + PENDULUM_SCALE * Math.sin(theta)
      const bobY = PENDULUM_PIVOT.y + PENDULUM_SCALE * Math.cos(theta)
      if (lineRef.current) {
        lineRef.current.setAttribute('x2', String(bobX))
        lineRef.current.setAttribute('y2', String(bobY))
      }
      if (bobRef.current) {
        bobRef.current.setAttribute('cx', String(bobX))
        bobRef.current.setAttribute('cy', String(bobY))
      }
      if (timeDisplayRef.current) {
        timeDisplayRef.current.textContent = `t = ${tDisplay.toFixed(2)} s · θ = ${(theta * RAD2DEG).toFixed(1)}° · ω = ${omega.toFixed(3)} rad/s`
      }
      if (sliderRef.current) {
        sliderRef.current.value = String(idx)
      }
      lastIndexRef.current = idx
      rafIdRef.current = requestAnimationFrame(tick)
    }
    rafIdRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [playing, result])

  const handlePause = useCallback(() => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    if (result) {
      setTimeIndex(Math.min(lastIndexRef.current, result.t.length - 1))
    }
    setPlaying(false)
  }, [result])

  const handlePlayPause = useCallback(() => {
    if (playing) {
      handlePause()
    } else {
      setPlaying(true)
    }
  }, [playing, handlePause])

  return (
    <div className={styles.section}>
      <div className={styles.intro}>
        <p className={styles.introText}>
          A <strong>simple pendulum</strong> obeys{' '}
          <span dangerouslySetInnerHTML={{ __html: renderLatex('\\ddot{\\theta} = -\\frac{g}{L}\\sin\\theta - b\\dot{\\theta}') }} />
          , where <span dangerouslySetInnerHTML={{ __html: renderLatex('\\theta') }} /> is the angle from vertical,{' '}
          <span dangerouslySetInnerHTML={{ __html: renderLatex('L') }} /> is length,{' '}
          <span dangerouslySetInnerHTML={{ __html: renderLatex('g') }} /> is gravity, and{' '}
          <span dangerouslySetInnerHTML={{ __html: renderLatex('b') }} /> is damping. Set initial conditions and run to see the phase portrait (θ vs <span dangerouslySetInnerHTML={{ __html: renderLatex('\\dot{\\theta}') }} />) and time series.
        </p>
      </div>

      <div className={styles.editorBlock}>
        <h3 className={styles.optionsTitle}>Parameters</h3>
        <div className={styles.theoreticalForm}>
          <label className={styles.fieldLabel}>
            <span>Length L (m)</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={length}
              onChange={(e) => setLength(Math.max(0.1, Number(e.target.value) || 0.1))}
              className={styles.input}
            />
          </label>
          <label className={styles.fieldLabel}>
            <span>Gravity g (m/s²)</span>
            <input
              type="number"
              min={0.1}
              step={0.1}
              value={gravity}
              onChange={(e) => setGravity(Math.max(0.1, Number(e.target.value) || 9.81))}
              className={styles.input}
            />
          </label>
          <label className={styles.fieldLabel}>
            <span>Damping b</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={damping}
              onChange={(e) => setDamping(Math.max(0, Number(e.target.value) || 0))}
              className={styles.input}
            />
          </label>
          <label className={styles.fieldLabel}>
            <span>Initial θ (deg)</span>
            <input
              type="number"
              value={theta0Deg}
              onChange={(e) => setTheta0Deg(Number(e.target.value) ?? 0)}
              className={styles.input}
            />
          </label>
          <label className={styles.fieldLabel}>
            <span>Initial ω (rad/s)</span>
            <input
              type="number"
              value={omega0}
              onChange={(e) => setOmega0(Number(e.target.value) ?? 0)}
              className={styles.input}
            />
          </label>
          <label className={styles.fieldLabel}>
            <span>Duration (s)</span>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={duration}
              onChange={(e) => setDuration(Math.max(0.5, Number(e.target.value) || 0.5))}
              className={styles.input}
            />
          </label>
          <label className={styles.fieldLabel}>
            <span>Time step dt (s)</span>
            <input
              type="number"
              min={0.001}
              step={0.01}
              value={dt}
              onChange={(e) => setDt(Math.max(0.001, Number(e.target.value) || 0.02))}
              className={styles.input}
            />
          </label>
          <button type="button" className={styles.runBtn} onClick={runSimulation}>
            Run
          </button>
        </div>
      </div>

      {result && (
        <>
          <div className={styles.graphBlock}>
            <h3 className={styles.graphTitle}>Phase portrait (θ vs ω)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={phaseData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  dataKey="theta"
                  name="θ"
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickFormatter={(v) => (v * RAD2DEG).toFixed(0) + '°'}
                />
                <YAxis
                  type="number"
                  dataKey="omega"
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius)',
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]?.payload) return null
                    const p = payload[0].payload as { t: number; theta: number; omega: number }
                    return (
                      <div style={{ padding: '0.35rem 0.5rem' }}>
                        <div>t = {p.t.toFixed(2)} s</div>
                        <div>θ = {(p.theta * RAD2DEG).toFixed(2)}°</div>
                        <div>ω = {p.omega.toFixed(3)} rad/s</div>
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="omega"
                  stroke="var(--accent)"
                  dot={false}
                  strokeWidth={1.5}
                  name="ω"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.graphBlock}>
            <h3 className={styles.graphTitle}>Time series</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={timeSeriesData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  dataKey="t"
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                />
                <YAxis
                  yAxisId="left"
                  stroke="var(--text-muted)"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  tickFormatter={(v) => v + '°'}
                />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: 'var(--radius)',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'θ' ? (value as number).toFixed(2) + '°' : (value as number).toFixed(3),
                    name,
                  ]}
                  labelFormatter={(label) => `t = ${Number(label).toFixed(2)} s`}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="theta"
                  stroke="var(--accent)"
                  dot={false}
                  strokeWidth={1.5}
                  name="θ (deg)"
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="omega"
                  stroke="#0ea5e9"
                  dot={false}
                  strokeWidth={1.5}
                  name="ω (rad/s)"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.graphBlock}>
            <h3 className={styles.graphTitle}>Pendulum</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
              <svg width={320} height={180} viewBox="0 0 320 180" style={{ overflow: 'visible' }}>
                <line
                  ref={lineRef}
                  x1={PENDULUM_PIVOT.x}
                  y1={PENDULUM_PIVOT.y}
                  x2={bobX}
                  y2={bobY}
                  stroke="var(--text)"
                  strokeWidth={2}
                />
                <circle cx={PENDULUM_PIVOT.x} cy={PENDULUM_PIVOT.y} r={4} fill="var(--text-muted)" />
                <circle ref={bobRef} cx={bobX} cy={bobY} r={12} fill="var(--accent)" stroke="var(--text)" strokeWidth={1} />
              </svg>
              <div className={styles.theoreticalForm} style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
                <label className={styles.fieldLabel}>
                  <span>Time (s)</span>
                  <input
                    ref={sliderRef}
                    type="range"
                    min={0}
                    max={result.t.length - 1}
                    value={timeIndexClamped}
                    onChange={(e) => setTimeIndex(Number(e.target.value))}
                    className={styles.input}
                    style={{ width: 200 }}
                  />
                </label>
                <span ref={timeDisplayRef} className={styles.hint} style={{ alignSelf: 'center' }}>
                  t = {currentT.toFixed(2)} s · θ = {(currentTheta * RAD2DEG).toFixed(1)}° · ω = {currentOmega.toFixed(3)} rad/s
                </span>
                <button
                  type="button"
                  className={styles.runBtn}
                  onClick={handlePlayPause}
                >
                  {playing ? 'Pause' : 'Play'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
