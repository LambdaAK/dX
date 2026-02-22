import type { ProcessDef, ParamDef, CustomProcessInput } from '@/types/process'
import { getBuiltInProcesses } from '@/lib/processes'
import styles from './ProcessPicker.module.css'

type Mode = 'built-in' | 'custom'

type Props = {
  mode: Mode
  onModeChange: (m: Mode) => void
  selectedId: string | null
  onSelectBuiltIn: (p: ProcessDef) => void
  customInput: CustomProcessInput
  onCustomInputChange: (c: CustomProcessInput) => void
  compiledCustom: ProcessDef | null
  customError: string | null
  params: Record<string, number>
  onParamsChange: (params: Record<string, number>) => void
  x0: number
  onX0Change: (x0: number) => void
}

const builtInList = getBuiltInProcesses()

export function ProcessPicker({
  mode,
  onModeChange,
  selectedId,
  onSelectBuiltIn,
  customInput,
  onCustomInputChange,
  compiledCustom,
  customError,
  params,
  onParamsChange,
  x0,
  onX0Change,
}: Props) {
  const currentProcess = mode === 'built-in'
    ? builtInList.find((p) => p.id === selectedId)
    : compiledCustom

  const allParams = currentProcess?.params ?? []

  const setParam = (id: string, value: number) => {
    onParamsChange({ ...params, [id]: value })
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>Process</h2>

      <div className={styles.modeTabs}>
        <button
          type="button"
          className={mode === 'built-in' ? styles.tabActive : styles.tab}
          onClick={() => onModeChange('built-in')}
        >
          Built-in
        </button>
        <button
          type="button"
          className={mode === 'custom' ? styles.tabActive : styles.tab}
          onClick={() => onModeChange('custom')}
        >
          Custom SDE
        </button>
      </div>

      {mode === 'built-in' && (
        <div className={styles.cards}>
          {builtInList.map((p) => (
            <button
              key={p.id}
              type="button"
              className={selectedId === p.id ? styles.cardActive : styles.card}
              onClick={() => onSelectBuiltIn(p)}
            >
              <span className={styles.cardName}>{p.name}</span>
              {p.description && (
                <span className={styles.cardDesc}>{p.description}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {mode === 'custom' && (
        <div className={styles.custom}>
          <label className={styles.label}>
            Drift <span className={styles.mono}>f(x, t)</span>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. theta * (mu - x)"
              value={customInput.driftExpr}
              onChange={(e) =>
                onCustomInputChange({ ...customInput, driftExpr: e.target.value })
              }
            />
          </label>
          <label className={styles.label}>
            Diffusion <span className={styles.mono}>g(x, t)</span>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. sigma"
              value={customInput.diffusionExpr}
              onChange={(e) =>
                onCustomInputChange({
                  ...customInput,
                  diffusionExpr: e.target.value,
                })
              }
            />
          </label>
          <p className={styles.hint}>
            Use variables <span className={styles.mono}>x</span>,{' '}
            <span className={styles.mono}>t</span>, and your parameter names.
            Math: +, -, *, /, ^, sqrt, exp, log, sin, cos.
          </p>
          {customError && <p className={styles.error}>{customError}</p>}
        </div>
      )}

      <div className={styles.initial}>
        <label className={styles.label}>
          Initial value <span className={styles.mono}>X₀</span>
          <input
            type="number"
            step="any"
            className={styles.inputNumber}
            value={x0}
            onChange={(e) => onX0Change(Number(e.target.value))}
          />
        </label>
      </div>

      {allParams.length > 0 && (
        <div className={styles.params}>
          <h3 className={styles.subheading}>Parameters</h3>
          {allParams.map((param) => (
            <ParamSlider
              key={param.id}
              param={param}
              value={params[param.id] ?? param.default}
              onChange={(v) => setParam(param.id, v)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function ParamSlider({
  param,
  value,
  onChange,
}: {
  param: ParamDef
  value: number
  onChange: (v: number) => void
}) {
  const min = param.min ?? 0
  const max = param.max ?? 10
  const step = param.step ?? (max - min) / 100

  return (
    <label className={styles.paramRow}>
      <span className={styles.paramName}>{param.name}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles.slider}
      />
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={styles.inputNumber}
      />
    </label>
  )
}
