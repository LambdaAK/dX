import { useMemo, useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import styles from './MarkovChainSection.module.css'

function tex(latex: string, displayMode = false): string {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false })
  } catch {
    return latex
  }
}

function formatSigned(value: number, digits = 4): string {
  if (Object.is(value, -0)) return '0'
  if (Math.abs(value) < 1e-12) return '0'
  return value.toFixed(digits)
}

export function EulerIdentitySection() {
  const [thetaPi, setThetaPi] = useState(1)
  const theta = thetaPi * Math.PI

  const { cosTheta, sinTheta, realDiff, imagDiff } = useMemo(() => {
    const c = Math.cos(theta)
    const s = Math.sin(theta)
    return {
      cosTheta: c,
      sinTheta: s,
      realDiff: c + 1,
      imagDiff: s,
    }
  }, [theta])

  const identityError = Math.hypot(realDiff, imagDiff)

  return (
    <div className={styles.section}>
      <div className={styles.intro}>
        <p className={styles.introText}>
          This mini lab visualizes Euler&apos;s formula
          {' '}
          <span dangerouslySetInnerHTML={{ __html: tex('e^{i\\theta}=\\cos(\\theta)+i\\sin(\\theta)') }} />
          {' '}
          and the special case
          {' '}
          <span dangerouslySetInnerHTML={{ __html: tex('e^{i\\pi}+1=0') }} />
          .
        </p>
      </div>

      <div className={styles.editorBlock}>
        <label className={styles.label} htmlFor="theta-slider">
          Angle
        </label>
        <input
          id="theta-slider"
          type="range"
          min={-2}
          max={2}
          step={0.01}
          value={thetaPi}
          onChange={(e) => setThetaPi(Number(e.target.value))}
        />
        <p className={styles.hint}>
          θ = {thetaPi.toFixed(2)}π ≈ {theta.toFixed(4)} radians
        </p>
      </div>

      <div className={styles.matrixBlock}>
        <h4 className={styles.matrixTitle}>Computed values</h4>
        <p className={styles.matrixHint}>
          cos(θ) = {formatSigned(cosTheta)}, sin(θ) = {formatSigned(sinTheta)}
        </p>
        <p className={styles.matrixHint}>
          <span dangerouslySetInnerHTML={{ __html: tex('e^{i\\theta}') }} />
          {' '}
          = {formatSigned(cosTheta)} + i{formatSigned(sinTheta)}
        </p>
        <p className={styles.matrixHint}>
          <span dangerouslySetInnerHTML={{ __html: tex('e^{i\\theta}+1') }} />
          {' '}
          = {formatSigned(realDiff)} + i{formatSigned(imagDiff)}
        </p>
        <p className={styles.matrixHint}>
          Identity error
          {' '}
          <span dangerouslySetInnerHTML={{ __html: tex('\\left|e^{i\\theta}+1\\right|') }} />
          {' '}
          = {identityError.toExponential(3)}
        </p>
      </div>
    </div>
  )
}
