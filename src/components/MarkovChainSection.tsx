import { useState } from 'react'
import { parseMarkovDSL } from '@/lib/markovChain'
import type { MarkovChainDef } from '@/types/markov'
import { MarkovChainGraph } from '@/components/MarkovChainGraph'
import styles from './MarkovChainSection.module.css'

const DEFAULT_DSL = `States: A, B, C
A -> B : 0.5, A -> C : 0.5, B -> A : 1, C -> C : 1`

export function MarkovChainSection() {
  const [dsl, setDsl] = useState(DEFAULT_DSL)
  const [chain, setChain] = useState<MarkovChainDef | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = () => {
    setError(null)
    const result = parseMarkovDSL(dsl)
    if (result.ok) {
      setChain(result.chain)
    } else {
      setError(result.error)
      setChain(null)
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.editorBlock}>
        <label className={styles.label} htmlFor="markov-dsl">
          Markov chain definition
        </label>
        <p className={styles.hint}>
          First line: <code>States: A, B, C, ...</code> — then one or more lines: <code>A -&gt; B : 0.5</code> (comma or newline separated).
        </p>
        <textarea
          id="markov-dsl"
          className={styles.textarea}
          value={dsl}
          onChange={(e) => setDsl(e.target.value)}
          rows={8}
          spellCheck={false}
        />
        {error && <p className={styles.error}>{error}</p>}
        <button type="button" className={styles.generateBtn} onClick={handleGenerate}>
          Generate graph
        </button>
      </div>

      {chain && (
        <div className={styles.graphBlock}>
          <h3 className={styles.graphTitle}>Transition graph</h3>
          <MarkovChainGraph chain={chain} />
        </div>
      )}
    </div>
  )
}
