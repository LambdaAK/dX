import base from '../MarkovChainSection.module.css'
import { EpsilonDeltaPanel, EVTPanel, IVTPanel, MVTpanel, SeriesPanel, TaylorSeriesPanel } from './RealAnalysisPanels'

type IntroProps = {
  title: string
  description: string
}

function Intro({ title, description }: IntroProps) {
  return (
    <div className={base.intro}>
      <p className={base.introText}>
        <strong>{title}</strong> {description}
      </p>
    </div>
  )
}

export function SeriesConvergenceSection() {
  return (
    <div className={base.section}>
      <Intro
        title="Series convergence."
        description="Compare partial sums, convergence tests, and the difference between finite approximation and infinite behavior."
      />
      <SeriesPanel />
    </div>
  )
}

export function EpsilonDeltaLimitsSection() {
  return (
    <div className={base.section}>
      <Intro
        title="Limits of functions."
        description="Work directly with epsilon and delta to build intuition for rigorous local control near a point."
      />
      <EpsilonDeltaPanel />
    </div>
  )
}

export function MeanValueTheoremSection() {
  return (
    <div className={base.section}>
      <Intro
        title="Mean value theorem."
        description="Match the average rate of change on an interval with a tangent slope attained at some interior point."
      />
      <MVTpanel />
    </div>
  )
}

export function ExtremeValueTheoremSection() {
  return (
    <div className={base.section}>
      <Intro
        title="Extreme value theorem."
        description="See how continuity on a closed interval guarantees that actual maxima and minima are attained."
      />
      <EVTPanel />
    </div>
  )
}

export function IntermediateValueTheoremSection() {
  return (
    <div className={base.section}>
      <Intro
        title="Intermediate value theorem."
        description="Use continuity on a closed interval to guarantee that every in-between output value is hit somewhere by the curve."
      />
      <IVTPanel />
    </div>
  )
}

export function TaylorSeriesSection() {
  return (
    <div className={base.section}>
      <Intro
        title="Taylor series."
        description="Approximate smooth functions by polynomials and inspect how truncation degree changes local and global accuracy."
      />
      <TaylorSeriesPanel />
    </div>
  )
}
