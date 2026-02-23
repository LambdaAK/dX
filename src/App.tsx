import { useState } from 'react'
import { TitlePage } from '@/components/TitlePage'
import { StochasticPdeSection } from '@/components/StochasticPdeSection'
import { MarkovChainSection } from '@/components/MarkovChainSection'
import styles from './App.module.css'

export type AppPage = 'home' | 'stochastic-pde' | 'markov-chain'

export default function App() {
  const [page, setPage] = useState<AppPage>('home')

  return (
    <div className={styles.app}>
      {page === 'home' ? (
        <>
          <main className={styles.mainHome}>
            <TitlePage onSelect={setPage} />
          </main>
        </>
      ) : (
        <>
          <header className={styles.header}>
            <button
              type="button"
              className={styles.titleLink}
              onClick={() => setPage('home')}
            >
              Stochastic Processes Simulator
            </button>
            <nav className={styles.nav} aria-label="Main">
              <button
                type="button"
                className={page === 'stochastic-pde' ? styles.navBtnActive : styles.navBtn}
                onClick={() => setPage('stochastic-pde')}
              >
                Stochastic PDE
              </button>
              <button
                type="button"
                className={page === 'markov-chain' ? styles.navBtnActive : styles.navBtn}
                onClick={() => setPage('markov-chain')}
              >
                Markov Chain
              </button>
            </nav>
          </header>
          <main className={styles.main}>
            {page === 'stochastic-pde' && <StochasticPdeSection />}
            {page === 'markov-chain' && <MarkovChainSection />}
          </main>
        </>
      )}

      <footer className={styles.footer}>
        Euler–Maruyama · No backend · All simulation in the browser
      </footer>
    </div>
  )
}
