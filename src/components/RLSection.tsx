import { useState, useMemo } from 'react'
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
import {
  parseGridWorldDSL,
  valueIteration,
  qLearning,
  sarsa,
} from '@/lib/mdp'
import { createSeededRng } from '@/lib/random'
import type { GridWorld, RLResult } from '@/types/mdp'
import { GridWorldView } from '@/components/GridWorldView'
import styles from './MarkovChainSection.module.css'

function renderLatex(latex: string, displayMode = false): string {
  try {
    return katex.renderToString(latex, { displayMode, throwOnError: false })
  } catch {
    return latex
  }
}

const DEFAULT_DSL = `Size: 5x5
Start: 0,0
Grid:
. . W . G
. # # . .
. . F . .
. # W . .
. . . . P
Rewards: G:10, P:-10, W:-2, F:-5
Terminal: G, P
Discount: 0.9
Noise: 0.2`

const COLORS = ['var(--accent)', '#0ea5e9', '#22c55e', '#a855f7', '#f59e0b']

export function RLSection() {
  const [dsl, setDsl] = useState(DEFAULT_DSL)
  const [world, setWorld] = useState<GridWorld | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [selectedAlgorithms, setSelectedAlgorithms] = useState<Set<string>>(
    new Set(['value-iteration', 'q-learning'])
  )
  const [numEpisodes, setNumEpisodes] = useState(500)
  const [learningRate, setLearningRate] = useState(0.1)
  const [epsilon, setEpsilon] = useState(0.1)
  const [seed, setSeed] = useState<string>('')

  const [results, setResults] = useState<RLResult[]>([])
  const [running, setRunning] = useState(false)
  const [selectedResult, setSelectedResult] = useState<number>(0)

  const [showValues, setShowValues] = useState(true)
  const [showPolicy, setShowPolicy] = useState(true)

  const handleLoad = () => {
    setError(null)
    setResults([])
    const result = parseGridWorldDSL(dsl)
    if (result.ok) {
      setWorld(result.world)
    } else {
      setError(result.error)
      setWorld(null)
    }
  }

  const handleRun = () => {
    if (!world) return
    setRunning(true)
    setResults([])

    const rand =
      seed.trim() !== '' && !Number.isNaN(Number(seed))
        ? createSeededRng(Number(seed))
        : Math.random

    setTimeout(() => {
      const newResults: RLResult[] = []

      if (selectedAlgorithms.has('value-iteration')) {
        const result = valueIteration(world)
        newResults.push(result)
      }

      if (selectedAlgorithms.has('q-learning')) {
        const result = qLearning(world, numEpisodes, learningRate, epsilon, rand)
        newResults.push(result)
      }

      if (selectedAlgorithms.has('sarsa')) {
        const result = sarsa(world, numEpisodes, learningRate, epsilon, rand)
        newResults.push(result)
      }

      setResults(newResults)
      setSelectedResult(0)
      setRunning(false)
    }, 0)
  }

  const toggleAlgorithm = (alg: string) => {
    const newSet = new Set(selectedAlgorithms)
    if (newSet.has(alg)) {
      newSet.delete(alg)
    } else {
      newSet.add(alg)
    }
    setSelectedAlgorithms(newSet)
  }

  const rewardChartData = useMemo(() => {
    const learningResults = results.filter(r => r.rewardsPerEpisode)
    if (learningResults.length === 0) return []

    const maxLen = Math.max(...learningResults.map(r => r.rewardsPerEpisode?.length ?? 0))
    const data = []

    for (let i = 0; i < maxLen; i++) {
      const point: Record<string, number> = { episode: i + 1 }
      for (const result of learningResults) {
        if (result.rewardsPerEpisode && i < result.rewardsPerEpisode.length) {
          point[result.algorithm] = result.rewardsPerEpisode[i]
        }
      }
      data.push(point)
    }

    return data
  }, [results])

  const currentResult = results[selectedResult] ?? null

  return (
    <div className={styles.section}>
      <div className={styles.intro}>
        <p className={styles.introText}>
          A <strong>Markov Decision Process (MDP)</strong> is a tuple{' '}
          <span dangerouslySetInnerHTML={{ __html: renderLatex('(S, A, P, R, \\gamma)') }} /> where{' '}
          <span dangerouslySetInnerHTML={{ __html: renderLatex('S') }} /> is states,{' '}
          <span dangerouslySetInnerHTML={{ __html: renderLatex('A') }} /> is actions,{' '}
          <span dangerouslySetInnerHTML={{ __html: renderLatex('P(s\'|s,a)') }} /> is transition probability,{' '}
          <span dangerouslySetInnerHTML={{ __html: renderLatex('R(s,a,s\')') }} /> is reward, and{' '}
          <span dangerouslySetInnerHTML={{ __html: renderLatex('\\gamma') }} /> is discount. The goal is to find a policy{' '}
          <span dangerouslySetInnerHTML={{ __html: renderLatex('\\pi: S \\to A') }} /> maximizing expected cumulative reward.{' '}
          <strong>Value iteration</strong> computes{' '}
          <span dangerouslySetInnerHTML={{ __html: renderLatex('V(s) = \\max_a \\sum_{s\'} P(s\'|s,a)[R + \\gamma V(s\')]') }} />.{' '}
          <strong>Q-learning</strong> learns{' '}
          <span dangerouslySetInnerHTML={{ __html: renderLatex('Q(s,a)') }} /> from experience:{' '}
          <span dangerouslySetInnerHTML={{ __html: renderLatex('Q(s,a) \\leftarrow Q(s,a) + \\alpha[r + \\gamma \\max_{a\'} Q(s\',a\') - Q(s,a)]') }} />.
        </p>
      </div>

      <div className={styles.editorBlock}>
        <label className={styles.label} htmlFor="gridworld-dsl">
          Grid World Definition
        </label>
        <p className={styles.hint}>
          Define size, start, grid (. = empty, # = wall, any letter = custom symbol), rewards, optional terminal states, discount, and noise.
          Example: <code>Rewards: G:10, W:-2, F:-5</code> then <code>Terminal: G</code>
        </p>
        <textarea
          id="gridworld-dsl"
          className={styles.textarea}
          value={dsl}
          onChange={(e) => setDsl(e.target.value)}
          rows={12}
          spellCheck={false}
        />
        {error && <p className={styles.error}>{error}</p>}
        <button type="button" className={styles.loadBtn} onClick={handleLoad}>
          Load Grid World
        </button>
      </div>

      {world && (
        <>
          <div className={styles.graphBlock}>
            <h3 className={styles.graphTitle}>Grid World</h3>
            <GridWorldView world={world} />
            <div className={styles.theoreticalHint} style={{ marginTop: '8px' }}>
              <strong>S</strong> = start, <strong>G</strong> = goal ({world.grid.flat().find(c => c.type === 'goal')?.reward}),{' '}
              <strong>#</strong> = wall, discount γ = {world.discount}, noise = {world.noise}
            </div>
          </div>

          <div className={styles.optionsBlock}>
            <h3 className={styles.optionsTitle}>Algorithm Selection</h3>
            <div className={styles.simulateForm}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={selectedAlgorithms.has('value-iteration')}
                    onChange={() => toggleAlgorithm('value-iteration')}
                  />
                  <span>Value Iteration (model-based)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={selectedAlgorithms.has('q-learning')}
                    onChange={() => toggleAlgorithm('q-learning')}
                  />
                  <span>Q-Learning (off-policy)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={selectedAlgorithms.has('sarsa')}
                    onChange={() => toggleAlgorithm('sarsa')}
                  />
                  <span>SARSA (on-policy)</span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                {(selectedAlgorithms.has('q-learning') || selectedAlgorithms.has('sarsa')) && (
                  <>
                    <label className={styles.fieldLabel}>
                      <span>Episodes</span>
                      <input
                        type="number"
                        min={10}
                        max={10000}
                        value={numEpisodes}
                        onChange={(e) => setNumEpisodes(Number(e.target.value))}
                        className={styles.input}
                      />
                    </label>
                    <label className={styles.fieldLabel}>
                      <span>Learning rate (α)</span>
                      <input
                        type="number"
                        min={0.01}
                        max={1}
                        step={0.01}
                        value={learningRate}
                        onChange={(e) => setLearningRate(Number(e.target.value))}
                        className={styles.input}
                      />
                    </label>
                    <label className={styles.fieldLabel}>
                      <span>Exploration (ε)</span>
                      <input
                        type="number"
                        min={0}
                        max={1}
                        step={0.01}
                        value={epsilon}
                        onChange={(e) => setEpsilon(Number(e.target.value))}
                        className={styles.input}
                      />
                    </label>
                  </>
                )}
                <label className={styles.fieldLabel}>
                  <span>Seed (optional)</span>
                  <input
                    type="text"
                    placeholder="Random"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    className={styles.input}
                  />
                </label>
              </div>

              <button
                type="button"
                className={styles.runBtn}
                onClick={handleRun}
                disabled={running || selectedAlgorithms.size === 0}
              >
                {running ? 'Running…' : 'Run Algorithms'}
              </button>
            </div>

            {results.length > 0 && (
              <>
                <div className={styles.matrixBlock} style={{ marginTop: '24px' }}>
                  <h4 className={styles.matrixTitle}>Results</h4>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    {results.map((result, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setSelectedResult(i)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: selectedResult === i ? '2px solid var(--accent)' : '1px solid var(--border)',
                          background: selectedResult === i ? 'var(--bg-elevated)' : 'var(--bg)',
                          cursor: 'pointer',
                          fontWeight: selectedResult === i ? 600 : 400,
                        }}
                      >
                        {result.algorithm}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={showValues}
                        onChange={(e) => setShowValues(e.target.checked)}
                      />
                      <span>Show Values</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        checked={showPolicy}
                        onChange={(e) => setShowPolicy(e.target.checked)}
                      />
                      <span>Show Policy</span>
                    </label>
                  </div>

                  {currentResult && (
                    <>
                      <GridWorldView
                        world={world}
                        valueFunction={currentResult.valueFunction}
                        policy={currentResult.policy}
                        showValues={showValues}
                        showPolicy={showPolicy}
                      />

                      <p className={styles.theoreticalHint} style={{ marginTop: '8px' }}>
                        {currentResult.iterations && `Converged in ${currentResult.iterations} iterations`}
                        {currentResult.episodes && ` • Trained for ${currentResult.episodes} episodes`}
                      </p>
                    </>
                  )}
                </div>

                {rewardChartData.length > 0 && (
                  <div className={styles.chartBlock}>
                    <h4 className={styles.chartTitle}>Learning Curves (Reward per Episode)</h4>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={rewardChartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis
                          dataKey="episode"
                          type="number"
                          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                          label={{
                            value: 'Episode',
                            position: 'insideBottom',
                            offset: -4,
                            fill: 'var(--text-muted)',
                            fontSize: 12,
                          }}
                        />
                        <YAxis
                          type="number"
                          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                          label={{
                            value: 'Total Reward',
                            angle: -90,
                            position: 'insideLeft',
                            fill: 'var(--text-muted)',
                            fontSize: 12,
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number, name: string) => [Number(value).toFixed(2), name]}
                          labelFormatter={(ep) => `Episode ${ep}`}
                        />
                        <Legend />
                        {results
                          .filter(r => r.rewardsPerEpisode)
                          .map((result, i) => (
                            <Line
                              key={result.algorithm}
                              type="monotone"
                              dataKey={result.algorithm}
                              stroke={COLORS[i % COLORS.length]}
                              strokeWidth={2}
                              dot={false}
                            />
                          ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
