import { useState, useMemo, useCallback } from 'react'
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
import {
  buildRandomForest,
  predictForest,
  randomForestGrid,
  type RandomForest,
} from '@/lib/randomForest'
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

type ModelMode = 'decision-tree' | 'random-forest'

const PRESETS: { id: KNNDatasetPreset; label: string }[] = [
  { id: 'blobs', label: 'Two blobs' },
  { id: 'xor', label: 'XOR' },
  { id: 'circles', label: 'Circles' },
]

const LABEL_COLORS: Record<string, string> = {
  A: 'var(--accent)',
  B: '#0ea5e9',
  '0': '#22c55e',
  '1': '#a855f7',
}

function getColor(label: string): string {
  return LABEL_COLORS[label] ?? '#94a3b8'
}

const N_PER_CLASS = 50
const DOMAIN = { xMin: -4, xMax: 4, yMin: -4, yMax: 4 }

export function DecisionTreeSection() {
  const [mode, setMode] = useState<ModelMode>('decision-tree')
  const [preset, setPreset] = useState<KNNDatasetPreset>('blobs')
  const [training, setTraining] = useState<TrainingPoint[]>(() => [])
  const [maxDepth, setMaxDepth] = useState(5)
  const [nTrees, setNTrees] = useState(50)
  const [showDecisionBoundary, setShowDecisionBoundary] = useState(true)
  const [gridRes, setGridRes] = useState(32)
  const [seed, setSeed] = useState('')
  const [query, setQuery] = useState<{ x: number; y: number } | null>(null)
  const [predictedLabel, setPredictedLabel] = useState<string | null>(null)

  const generateData = useCallback(() => {
    const rand =
      seed.trim() !== '' && !Number.isNaN(Number(seed))
        ? createSeededRng(Number(seed))
        : Math.random
    setTraining(generatePresetDataset(preset, N_PER_CLASS, rand))
    setQuery(null)
    setPredictedLabel(null)
  }, [preset, seed])

  const handlePresetChange = (p: KNNDatasetPreset) => {
    setPreset(p)
    setTraining([])
    setQuery(null)
    setPredictedLabel(null)
  }

  const tree = useMemo((): TreeNode | null => {
    if (training.length === 0 || mode !== 'decision-tree') return null
    return buildDecisionTree(training, { maxDepth })
  }, [training, mode, maxDepth])

  const forest = useMemo((): RandomForest => {
    if (training.length === 0 || mode !== 'random-forest') return []
    const rand =
      seed.trim() !== '' && !Number.isNaN(Number(seed))
        ? createSeededRng(Number(seed))
        : Math.random
    return buildRandomForest(
      training,
      { nTrees, maxDepth },
      rand
    )
  }, [training, mode, nTrees, maxDepth, seed])

  const decisionGridData = useMemo(() => {
    if (!showDecisionBoundary || training.length === 0) return []
    if (mode === 'decision-tree' && tree) {
      return decisionTreeGrid(
        tree,
        DOMAIN.xMin,
        DOMAIN.xMax,
        DOMAIN.yMin,
        DOMAIN.yMax,
        gridRes,
        gridRes
      )
    }
    if (mode === 'random-forest' && forest.length > 0) {
      return randomForestGrid(
        forest,
        DOMAIN.xMin,
        DOMAIN.xMax,
        DOMAIN.yMin,
        DOMAIN.yMax,
        gridRes,
        gridRes
      )
    }
    return []
  }, [mode, tree, forest, showDecisionBoundary, gridRes, training.length])

  const handlePredict = useCallback(() => {
    if (training.length === 0) return
    const q = query ?? { x: 0, y: 0 }
    const label =
      mode === 'decision-tree' && tree
        ? predictTree(tree, q)
        : forest.length > 0
          ? predictForest(forest, q)
          : ''
    setQuery(q)
    setPredictedLabel(label)
  }, [training, mode, tree, forest, query])

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
          <strong> Random forest</strong> trains many trees on bootstrap samples and predicts by majority vote, reducing overfitting and smoothing decision boundaries.
        </p>
        <p className={styles.introText}>
          Choose a preset, generate data, then compare a single tree (with optional tree view) to a random forest. Toggle the decision boundary to see how the model partitions the plane.
        </p>
      </div>

      <div className={styles.editorBlock}>
        <h3 className={styles.optionsTitle}>Model</h3>
        <div className={styles.theoreticalForm}>
          <label className={styles.fieldLabel}>
            <span>Mode</span>
            <select
              className={styles.input}
              value={mode}
              onChange={(e) => setMode(e.target.value as ModelMode)}
            >
              <option value="decision-tree">Decision tree</option>
              <option value="random-forest">Random forest</option>
            </select>
          </label>
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
          {mode === 'random-forest' && (
            <label className={styles.fieldLabel}>
              <span>Number of trees</span>
              <input
                type="number"
                min={5}
                max={200}
                value={nTrees}
                onChange={(e) => setNTrees(Math.max(5, Math.min(200, Number(e.target.value) || 50)))}
                className={styles.input}
              />
            </label>
          )}
        </div>
      </div>

      <div className={styles.editorBlock}>
        <h3 className={styles.optionsTitle}>Dataset</h3>
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

      {mode === 'decision-tree' && tree && training.length > 0 && (
        <div className={styles.graphBlock}>
          <h3 className={styles.graphTitle}>Tree structure</h3>
          <pre
            className={styles.theoreticalHint}
            style={{
              margin: 0,
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
        </div>
      )}
    </div>
  )
}
