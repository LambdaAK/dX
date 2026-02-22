import type { SimConfig } from '@/types/simulation'
import styles from './SimConfigForm.module.css'

type Props = {
  config: SimConfig
  onChange: (c: SimConfig) => void
  onRun: () => void
  running: boolean
}

export function SimConfigForm({ config, onChange, onRun, running }: Props) {
  const set = (k: keyof SimConfig, v: number) => onChange({ ...config, [k]: v })

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Simulation</h2>
      <div className={styles.grid}>
        <label className={styles.label}>
          End time <span className={styles.mono}>T</span>
          <input
            type="number"
            min={0.01}
            step="any"
            value={config.T}
            onChange={(e) => set('T', Number(e.target.value))}
            className={styles.input}
          />
        </label>
        <label className={styles.label}>
          Step size <span className={styles.mono}>dt</span>
          <input
            type="number"
            min={0.0001}
            step="any"
            value={config.dt}
            onChange={(e) => set('dt', Number(e.target.value))}
            className={styles.input}
          />
        </label>
        <label className={styles.label}>
          Paths <span className={styles.mono}>M</span>
          <input
            type="number"
            min={1}
            max={50000}
            step={1}
            value={config.M}
            onChange={(e) => set('M', Number(e.target.value))}
            className={styles.input}
          />
        </label>
      </div>
      <p className={styles.hint}>
        Euler–Maruyama · {Math.round((config.T - config.t0) / config.dt)} steps
        per path
      </p>
      <button
        type="button"
        className={styles.runButton}
        onClick={onRun}
        disabled={running}
      >
        {running ? 'Running…' : 'Run simulation'}
      </button>
    </section>
  )
}
