import { useState, useMemo, useCallback, useEffect } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ZAxis,
  Cell,
} from 'recharts'
import {
  buildDecisionTree,
  predictTree,
  decisionTreeGrid,
  treeToString,
  type TrainingPoint,
  type TreeNode,
} from '@/lib/decisionTree'
import { TreeVisualization } from '@/components/TreeVisualization'
import { generatePresetDataset } from '@/lib/knn'
import { createSeededRng } from '@/lib/random'
import type { KNNDatasetPreset } from '@/types/knn'
import styles from './MarkovChainSection.module.css'

function renderLatex(latex: string, displayMode = false): string {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false })
  } catch {
    return latex
  }
}

const PRESETS: { id: KNNDatasetPreset; label: string }[] = [
  { id: 'blobs', label: 'Two blobs' },
  { id: 'xor', label: 'XOR' },
  { id: 'circles', label: 'Circles' },
  { id: 'moons', label: 'Moons' },
  { id: 'three-blobs', label: 'Three blobs' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'nested', label: 'Nested rectangle' },
]

const PALETTE = [
  'var(--accent)',
  '#0ea5e9',
  '#22c55e',
  '#a855f7',
  '#eab308',
  '#ef4444',
  '#06b6d4',
  '#f97316',
]

const N_PER_CLASS = 50
const DOMAIN = { xMin: -4, xMax: 4, yMin: -4, yMax: 4 }

const DEFAULT_LABELS = 'A, B'
const DEFAULT_DATA = '-1, -1, A\n1, 1, A\n-1, 1, B\n1, -1, B'

function parseDataPoints(text: string): TrainingPoint[] {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  const out: TrainingPoint[] = []
  for (const line of lines) {
    const parts = line.split(/[\s,;]+/).map((s) => s.trim())
    if (parts.length >= 3) {
      const x = parseFloat(parts[0])
      const y = parseFloat(parts[1])
      const label = parts[2]
      if (Number.isFinite(x) && Number.isFinite(y) && label) {
        out.push({ x, y, label })
      }
    }
  }
  return out
}

export function DecisionTreeSection() {
  const [preset, setPreset] = useState<KNNDatasetPreset>('blobs')
  const [labelsInput, setLabelsInput] = useState(DEFAULT_LABELS)
  const [dataInput, setDataInput] = useState(DEFAULT_DATA)
  const [training, setTraining] = useState<TrainingPoint[]>(() => parseDataPoints(DEFAULT_DATA))
  const [addX, setAddX] = useState('')
  const [addY, setAddY] = useState('')
  const [addLabel, setAddLabel] = useState('A')
  const [maxDepth, setMaxDepth] = useState(5)
  const [showDecisionBoundary, setShowDecisionBoundary] = useState(true)
  const [gridRes, setGridRes] = useState(32)
  const [seed, setSeed] = useState('')
  const [treeView, setTreeView] = useState<'visual' | 'text'>('visual')
  const [query, setQuery] = useState<{ x: number; y: number } | null>(null)
  const [predictedLabel, setPredictedLabel] = useState<string | null>(null)
  const [loadMessage, setLoadMessage] = useState<string | null>(null)

  const labelsList = useMemo(
    () => labelsInput.split(',').map((s) => s.trim()).filter(Boolean),
    [labelsInput]
  )
  useEffect(() => {
    if (labelsList.length > 0 && !labelsList.includes(addLabel)) {
      setAddLabel(labelsList[0])
    }
  }, [labelsInput])

  useEffect(() => {
    setLoadMessage(null)
  }, [dataInput])

  const labelOrder = useMemo(
    () => (labelsList.length > 0 ? labelsList : [...new Set(training.map((p) => p.label))]),
    [labelsList, training]
  )
  const getColor = useCallback(
    (label: string) => PALETTE[labelOrder.indexOf(label) % PALETTE.length] ?? '#94a3b8',
    [labelOrder]
  )

  const generateData = useCallback(() => {
    const rand =
      seed.trim() !== '' && !Number.isNaN(Number(seed))
        ? createSeededRng(Number(seed))
        : Math.random
    const points = generatePresetDataset(preset, N_PER_CLASS, rand)
    setTraining(points)
    setDataInput(points.map((p) => `${p.x}, ${p.y}, ${p.label}`).join('\n'))
    setQuery(null)
    setPredictedLabel(null)
    setLabelsInput(
      preset === 'xor' ? '0, 1' : preset === 'three-blobs' ? 'A, B, C' : 'A, B'
    )
  }, [preset, seed])

  const handlePresetChange = (p: KNNDatasetPreset) => {
    setPreset(p)
    setTraining([])
    setDataInput('')
    setQuery(null)
    setPredictedLabel(null)
    setLabelsInput(
      p === 'xor' ? '0, 1' : p === 'three-blobs' ? 'A, B, C' : 'A, B'
    )
  }

  const handleLoadData = useCallback(() => {
    const points = parseDataPoints(dataInput)
    setTraining(points)
    setQuery(null)
    setPredictedLabel(null)
    setLoadMessage(points.length > 0 ? `Loaded ${points.length} points.` : 'No valid rows. Use one point per line: x, y, label (e.g. 1, 2, A).')
  }, [dataInput])

  const handleAddPoint = useCallback(() => {
    const x = Number(addX)
    const y = Number(addY)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    setTraining((prev) => [...prev, { x, y, label: addLabel }])
    setAddX('')
    setAddY('')
  }, [addX, addY, addLabel])

  const tree = useMemo((): TreeNode | null => {
    if (training.length === 0) return null
    return buildDecisionTree(training, { maxDepth })
  }, [training, maxDepth])

  const decisionGridData = useMemo(() => {
    if (!showDecisionBoundary || training.length === 0 || !tree) return []
    return decisionTreeGrid(
      tree,
      DOMAIN.xMin,
      DOMAIN.xMax,
      DOMAIN.yMin,
      DOMAIN.yMax,
      gridRes,
      gridRes
    )
  }, [tree, showDecisionBoundary, gridRes, training.length])

  const handlePredict = useCallback(() => {
    if (training.length === 0 || !tree) return
    const q = query ?? { x: 0, y: 0 }
    setQuery(q)
    setPredictedLabel(predictTree(tree, q))
  }, [training, tree, query])

  const scatterByLabel = useMemo(() => {
    const byLabel: Record<string, { x: number; y: number; label: string }[]> = {}
    for (const p of training) {
      if (!byLabel[p.label]) byLabel[p.label] = []
      byLabel[p.label].push({ x: p.x, y: p.y, label: p.label })
    }
    return Object.entries(byLabel)
  }, [training])

  return (
    <div className={styles.section}>
      <div className={styles.intro}>
        <p className={styles.introText}>
          <strong>Decision trees</strong> split the feature space on one feature at a time (here: x or y), choosing the threshold that minimizes{' '}
          <span dangerouslySetInnerHTML={{ __html: renderLatex('\\mathrm{Gini} = 1 - \\sum_k p_k^2') }} />.
          Add or paste data, then view the fitted tree and decision boundary. Bagging and boosting will be added separately.
        </p>
      </div>

      <div className={styles.editorBlock}>
        <h3 className={styles.optionsTitle}>Model</h3>
        <div className={styles.theoreticalForm}>
          <label className={styles.fieldLabel}>
            <span>Max depth</span>
            <input
              type="number"
              min={1}
              max={15}
              value={maxDepth}
              onChange={(e) => setMaxDepth(Math.max(1, Math.min(15, Number(e.target.value) || 1)))}
              className={styles.input}
            />
          </label>
        </div>
      </div>

      <div className={styles.editorBlock}>
        <h3 className={styles.optionsTitle}>Labels</h3>
        <p className={styles.hint}>
          Comma-separated class labels, e.g. <code>A, B, C</code> or <code>+1, -1</code>. Used for adding points and for colors.
        </p>
        <input
          type="text"
          className={styles.input}
          value={labelsInput}
          onChange={(e) => setLabelsInput(e.target.value)}
          placeholder="A, B, C"
        />
      </div>

      <div className={styles.editorBlock}>
        <h3 className={styles.optionsTitle}>Data (x, y, label)</h3>
        <p className={styles.hint}>
          One point per line: <code>x, y, label</code>. Paste a block or add points below.
        </p>
        <textarea
          className={styles.textarea}
          value={dataInput}
          onChange={(e) => setDataInput(e.target.value)}
          rows={6}
          spellCheck={false}
          placeholder="-1, -1, A&#10;1, 1, B"
        />
        <button type="button" className={styles.runBtn} onClick={handleLoadData}>
          Load data
        </button>
        {loadMessage !== null && (
          <p className={styles.hint} style={{ marginTop: '0.5rem', marginBottom: 0 }}>
            {loadMessage}
          </p>
        )}
      </div>

      <div className={styles.editorBlock}>
        <h3 className={styles.optionsTitle}>Add point</h3>
        <div className={styles.theoreticalForm}>
          <label className={styles.fieldLabel}>
            <span>x</span>
            <input
              type="number"
              step="any"
              className={styles.input}
              value={addX}
              onChange={(e) => setAddX(e.target.value)}
              placeholder="0"
            />
          </label>
          <label className={styles.fieldLabel}>
            <span>y</span>
            <input
              type="number"
              step="any"
              className={styles.input}
              value={addY}
              onChange={(e) => setAddY(e.target.value)}
              placeholder="0"
            />
          </label>
          {labelsList.length > 0 ? (
            <label className={styles.fieldLabel}>
              <span>Label</span>
              <select
                className={styles.input}
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
              >
                {labelsList.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className={styles.fieldLabel}>
              <span>Label</span>
              <input
                type="text"
                className={styles.input}
                value={addLabel}
                onChange={(e) => setAddLabel(e.target.value)}
                placeholder="A"
              />
            </label>
          )}
          <button
            type="button"
            className={styles.runBtn}
            onClick={handleAddPoint}
          >
            Add
          </button>
        </div>
      </div>

      <div className={styles.editorBlock}>
        <h3 className={styles.optionsTitle}>Preset (replace data)</h3>
        <div className={styles.theoreticalForm}>
          <label className={styles.fieldLabel}>
            <span>Preset</span>
            <select
              className={styles.input}
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value as KNNDatasetPreset)}
            >
              {PRESETS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.fieldLabel}>
            <span>Seed (optional)</span>
            <input
              type="text"
              className={styles.input}
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="e.g. 42"
            />
          </label>
          <button type="button" className={styles.runBtn} onClick={generateData}>
            Generate data &amp; train
          </button>
        </div>
      </div>

      <div className={styles.editorBlock}>
        <h3 className={styles.optionsTitle}>Visualization</h3>
        <div className={styles.theoreticalForm}>
          <label className={styles.fieldLabel}>
            <input
              type="checkbox"
              checked={showDecisionBoundary}
              onChange={(e) => setShowDecisionBoundary(e.target.checked)}
            />
            <span>Show decision boundary</span>
          </label>
          {showDecisionBoundary && (
            <label className={styles.fieldLabel}>
              <span>Grid resolution</span>
              <input
                type="number"
                min={12}
                max={60}
                value={gridRes}
                onChange={(e) => setGridRes(Math.max(12, Math.min(60, Number(e.target.value) || 32)))}
                className={styles.input}
              />
            </label>
          )}
        </div>
      </div>

      <div className={styles.editorBlock}>
        <h3 className={styles.optionsTitle}>Query point</h3>
        <div className={styles.theoreticalForm}>
          <label className={styles.fieldLabel}>
            <span>x</span>
            <input
              type="number"
              step={0.1}
              value={query?.x ?? ''}
              onChange={(e) =>
                setQuery((q) => ({
                  x: Number(e.target.value) || 0,
                  y: q?.y ?? 0,
                }))
              }
              className={styles.input}
              placeholder="0"
            />
          </label>
          <label className={styles.fieldLabel}>
            <span>y</span>
            <input
              type="number"
              step={0.1}
              value={query?.y ?? ''}
              onChange={(e) =>
                setQuery((q) => ({
                  x: q?.x ?? 0,
                  y: Number(e.target.value) || 0,
                }))
              }
              className={styles.input}
              placeholder="0"
            />
          </label>
          <button
            type="button"
            className={styles.runBtn}
            onClick={handlePredict}
            disabled={training.length === 0}
          >
            Predict
          </button>
          {predictedLabel !== null && (
            <span className={styles.introText} style={{ alignSelf: 'center' }}>
              Predicted: <strong style={{ color: getColor(predictedLabel) }}>{predictedLabel}</strong>
            </span>
          )}
        </div>
      </div>

      {training.length > 0 && (
        <div className={styles.graphBlock}>
          <h3 className={styles.graphTitle}>
            Training data {showDecisionBoundary && 'and decision boundary'}
          </h3>
          <ResponsiveContainer width="100%" height={420}>
            <ScatterChart
              margin={{ top: 16, right: 16, left: 16, bottom: 16 }}
              data={training}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[DOMAIN.xMin, DOMAIN.xMax]}
                stroke="var(--text-muted)"
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                domain={[DOMAIN.yMin, DOMAIN.yMax]}
                stroke="var(--text-muted)"
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              />
              <ZAxis range={[50, 400]} />
              <Tooltip
                cursor={{ stroke: 'var(--border)' }}
                contentStyle={{
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius)',
                }}
                formatter={(value: number) => [value.toFixed(3), '']}
                labelFormatter={(_label, payload) =>
                  payload?.[0]
                    ? `(${payload[0].payload?.x?.toFixed(3)}, ${payload[0].payload?.y?.toFixed(3)})`
                    : ''
                }
              />
              {showDecisionBoundary && decisionGridData.length > 0 && (
                <Scatter
                  name="Boundary"
                  data={decisionGridData.map((d) => ({ ...d, z: 30 }))}
                  fillOpacity={0.25}
                  isAnimationActive={false}
                >
                  {decisionGridData.map((entry, i) => (
                    <Cell key={i} fill={getColor(entry.label)} fillOpacity={0.25} />
                  ))}
                </Scatter>
              )}
              {scatterByLabel.map(([label, points]) => (
                <Scatter
                  key={label}
                  name={`Class ${label}`}
                  data={points}
                  fill={getColor(label)}
                  shape="circle"
                  isAnimationActive={false}
                >
                  {points.map((_, i) => (
                    <Cell key={i} fill={getColor(label)} stroke="var(--text)" strokeWidth={1} />
                  ))}
                </Scatter>
              ))}
              {query !== null && (
                <Scatter
                  name="Query"
                  data={[{ ...query, label: predictedLabel ?? '?' }]}
                  fill="none"
                  shape="cross"
                  line={{ stroke: 'var(--text)', strokeWidth: 2 }}
                  isAnimationActive={false}
                >
                  <Cell stroke="var(--text)" strokeWidth={2} />
                </Scatter>
              )}
              <Legend />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {tree && training.length > 0 && (
        <div className={styles.graphBlock}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h3 className={styles.graphTitle} style={{ margin: 0 }}>Tree structure</h3>
            <label className={styles.fieldLabel} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="radio"
                name="treeView"
                checked={treeView === 'visual'}
                onChange={() => setTreeView('visual')}
              />
              <span>Visual</span>
            </label>
            <label className={styles.fieldLabel} style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="radio"
                name="treeView"
                checked={treeView === 'text'}
                onChange={() => setTreeView('text')}
              />
              <span>Text</span>
            </label>
          </div>
          {treeView === 'visual' ? (
            <TreeVisualization tree={tree} getColor={getColor} />
          ) : (
            <pre
              className={styles.theoreticalHint}
              style={{
                margin: 0,
                marginTop: '0.75rem',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                whiteSpace: 'pre-wrap',
                overflow: 'auto',
                maxHeight: '280px',
                padding: '0.75rem',
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
              }}
            >
              {treeToString(tree)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
