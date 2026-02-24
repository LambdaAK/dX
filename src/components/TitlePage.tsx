import { useState, useMemo } from 'react'
import styles from './TitlePage.module.css'

export type SectionId =
  | 'stochastic-pde'
  | 'markov-chain'
  | 'ctmc'
  | 'bandit'
  | 'lln'
  | 'clt'
  | 'rl'
  | 'pendulum'
  | 'linear-regression'
  | 'logistic-regression'
  | 'kmeans'
  | 'dbscan'
  | 'knn'
  | 'decision-tree'
  | 'bagging'
  | 'boosting'
  | 'pca'
  | 'concentration-inequalities'
  | 'simplex'
  | 'perceptron'
  | 'qp'

type Lab = { id: SectionId; category: string; title: string; description: string }

const LABS: Lab[] = [
  { id: 'stochastic-pde', category: 'Stochastic processes', title: 'Stochastic PDE', description: 'Simulate SDEs, view paths, statistics, and the Fokker–Planck density p(x, t)' },
  { id: 'markov-chain', category: 'Probability', title: 'Markov Chain', description: 'Discrete-time Markov chains with empirical trials and theoretical distributions' },
  { id: 'ctmc', category: 'Probability', title: 'CTMC', description: 'Continuous-time Markov chains with exponential holding times and rate matrices' },
  { id: 'bandit', category: 'Reinforcement learning', title: 'Multi-Armed Bandits', description: 'Compare exploration strategies: ε-greedy, UCB, Thompson Sampling. Visualize regret over time' },
  { id: 'lln', category: 'Probability', title: 'Law of Large Numbers', description: 'See the sample average converge to the expected value for Bernoulli, Gaussian, or Uniform' },
  { id: 'clt', category: 'Probability', title: 'Central Limit Theorem', description: 'Histogram of sample means: see the distribution become normal as n grows' },
  { id: 'rl', category: 'Reinforcement learning', title: 'Markov Decision Process', description: 'MDPs and grid worlds: Value Iteration, Q-Learning, SARSA. Visualize policies and learning curves' },
  { id: 'linear-regression', category: 'Regression & classification', title: 'Linear regression', description: 'OLS fit y = β₀ + β₁x. Paste data or generate synthetic; see scatter, fitted line, R² and residual SE' },
  { id: 'logistic-regression', category: 'Regression & classification', title: 'Logistic regression', description: 'Binary classification: P(y=1|x) = σ(β₀ + β₁x). Paste x,y with y in {0,1} or generate synthetic; see sigmoid fit and loss' },
  { id: 'kmeans', category: 'Clustering & dimensionality', title: 'K-Means', description: 'Cluster 2D points with K-Means. Generate blobs or random data, choose k, view clusters and centroids' },
  { id: 'dbscan', category: 'Clustering & dimensionality', title: 'DBSCAN', description: 'Density-based clustering: set eps and minPts, no k needed. Finds clusters and labels outliers as noise' },
  { id: 'knn', category: 'Regression & classification', title: 'K-Nearest Neighbors', description: 'Classify points by majority vote among k nearest neighbors. Try blobs, XOR, and circles' },
  { id: 'decision-tree', category: 'Regression & classification', title: 'Decision tree', description: 'CART trees (Gini split). Add or paste x,y,label data; view the tree and decision boundary' },
  { id: 'bagging', category: 'Regression & classification', title: 'Bagging (trees)', description: 'Ensemble of decision trees trained on bootstrap samples. Compare the bagged decision boundary to a single tree' },
  { id: 'boosting', category: 'Regression & classification', title: 'Boosting (trees)', description: 'Sequential ensemble of decision trees; each tree focuses on previous errors. AdaBoost-style weighted vote and decision boundary' },
  { id: 'perceptron', category: 'Regression & classification', title: 'Perceptron', description: 'The simplest linear classifier: ŷ = sign(w·x + b). Online weight updates, convergence theorem, 2D decision boundary' },
  { id: 'pca', category: 'Clustering & dimensionality', title: 'PCA', description: 'Principal Component Analysis: reduce ℝⁿ → ℝ² via covariance eigendecomposition, visualise projection, and reconstruct with MSE' },
  { id: 'concentration-inequalities', category: 'Probability', title: 'Concentration Inequalities', description: 'Markov, Chebyshev, Hoeffding, and Sub-Gaussian bounds: see theoretical bounds vs empirical tail probabilities' },
  { id: 'simplex', category: 'Optimization', title: 'Linear Program Solver', description: 'Solve min/max cᵀx s.t. Ax ≤ b, x ≥ 0. Big-M method for ≥ and = constraints. Visualise the feasible polytope and optimal vertex for 2-variable problems' },
  { id: 'qp', category: 'Optimization', title: 'Quadratic Program Solver', description: 'Solve min ½xᵀQx + cᵀx s.t. Ax ≤ b, x ≥ 0. Active-set method with KKT conditions. Visualise the feasible region and optimal point for 2-variable problems' },
  { id: 'pendulum', category: 'Physics', title: 'Pendulum', description: 'Simple and damped pendulum: θ″ = −(g/L) sin θ − b θ′. Phase portrait, time series, and animation' },
]

type Props = {
  onSelect: (section: SectionId) => void
}

function matchQuery(lab: Lab, q: string): boolean {
  if (!q.trim()) return true
  const lower = q.toLowerCase().trim()
  const text = `${lab.category} ${lab.title} ${lab.description}`.toLowerCase()
  return text.includes(lower)
}

export function TitlePage({ onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [categoryOpen, setCategoryOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries([...new Set(LABS.map((l) => l.category))].map((c) => [c, true]))
  )

  const byCategory = useMemo(() => {
    const filtered = query.trim() ? LABS.filter((l) => matchQuery(l, query)) : LABS
    const map = new Map<string, Lab[]>()
    for (const lab of filtered) {
      const list = map.get(lab.category) ?? []
      list.push(lab)
      map.set(lab.category, list)
    }
    const order = ['Probability', 'Stochastic processes', 'Regression & classification', 'Clustering & dimensionality', 'Reinforcement learning', 'Optimization', 'Physics']
    return order.filter((c) => map.has(c)).map((c) => ({ category: c, labs: map.get(c)! }))
  }, [query])

  const toggleCategory = (category: string) => {
    setCategoryOpen((prev) => ({ ...prev, [category]: !prev[category] }))
  }

  return (
    <div className={styles.page}>
      <span className={styles.logoWrap}>
        <img src="/logo.png" alt="dX logo" className={styles.logo} />
      </span>
      <h1 className={styles.title}>Math & ML Lab</h1>
      <div className={styles.searchWrap}>
        <input
          type="search"
          className={styles.search}
          placeholder="Search labs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search labs"
        />
      </div>
      <div className={styles.choices}>
        {byCategory.map(({ category, labs }) => (
          <section key={category} className={styles.category}>
            <button
              type="button"
              className={styles.categoryHeader}
              onClick={() => toggleCategory(category)}
              aria-expanded={categoryOpen[category]}
            >
              <h2 className={styles.categoryTitle}>{category}</h2>
              <span className={styles.categoryChevron} aria-hidden>
                {categoryOpen[category] ? '▼' : '▶'}
              </span>
            </button>
            {categoryOpen[category] && (
              <div className={styles.categoryCards}>
                {labs.map((lab) => (
                  <button
                    key={lab.id}
                    type="button"
                    className={styles.card}
                    onClick={() => onSelect(lab.id)}
                  >
                    <span className={styles.cardTitle}>{lab.title}</span>
                    <span className={styles.cardDesc}>{lab.description}</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
      {byCategory.length === 0 && (
        <p className={styles.noResults}>No labs match “{query}”. Try a different search.</p>
      )}
    </div>
  )
}
