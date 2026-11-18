import { Dices, Shuffle } from 'lucide-react'
import { useMemo, useState } from 'react'
import { EDGE_EXAMPLES, expectedLoss, gamblingProblem, simulatePaths } from '../../calculators/iwasan'
import { peso, pesoExact } from '../../utils/format'
import { SliderField } from '../ui/fields'
import { CalcGrid, Panel, ResultHero, Stat } from '../ui/Result'
import { Bar, Cite, Concepts, SectionHead, Warning } from './shared'

const period = (w: number) => (w < 52 ? `${w} ${w === 1 ? 'week' : 'weeks'}` : w % 52 === 0 ? `${w / 52} ${w / 52 === 1 ? 'year' : 'years'}` : `${(w / 52).toFixed(1)} years`)

export function GamblingSection() {
  return (
    <section id="sugal" aria-labelledby="sugal-title" className="wrap mt-[clamp(96px,11vw,170px)] scroll-mt-24">
      <SectionHead
        id="sugal"
        icon={Dices}
        title="Ang laro ay pabor sa bahay"
        lede="Gambling is built so the operator keeps a share of everything bet, on average. Some people win, sometimes. Over many bets, the share adds up."
      />
      <div className="mt-10">
        <Concepts
          items={[
            {
              term: 'House edge',
              body: 'The share of each bet the game keeps on average, set by its rules. In single-zero roulette, an even-money bet wins on 18 of 37 pockets and loses on 19: the house keeps about 2.70% of what is bet, in the long run.',
            },
            {
              term: 'Expected value',
              body: 'The average result per bet if you played forever. With a house edge, it is negative: a single win does not change the average, it only hides it for a while.',
            },
            {
              term: 'Variance',
              body: 'How far real results swing around the average. A player can be ahead after an evening, or a month, even when every bet loses money on average. The simulation below shows this.',
            },
            {
              term: 'Loss chasing',
              body: 'Betting more, or more often, to win back what was lost. Each new bet carries the same negative average, so chasing adds to the expected loss instead of recovering it.',
            },
            {
              term: 'Gambler’s fallacy',
              body: (
                <>
                  Believing a result is “due” after a run of the opposite. Independent spins and draws have no memory: ten reds in a row do not make black more likely. People expect short runs to look
                  like the long run, and they do not.
                  <Cite id="tversky-kahneman-1971" />
                </>
              ),
            },
            {
              term: 'Near-miss effect',
              body: (
                <>
                  Almost winning feels close to winning. In a laboratory study, near-misses were rated unpleasant yet increased the desire to keep playing, and engaged brain areas that respond to
                  wins.
                  <Cite id="clark-2009" />
                </>
              ),
            },
            {
              term: 'Variable rewards',
              body: (
                <>
                  Rewards that come after an unpredictable number of tries keep behaviour going strongly. Slot machines and many online games pay out this way.
                  <Cite id="ferster-skinner-1957" />
                  <Cite id="haw-2008" />
                </>
              ),
            },
          ]}
        />
      </div>
      <div className="mt-12 grid gap-4">
        <ExpectedLoss />
        <VarianceDemo />
      </div>
    </section>
  )
}

function ExpectedLoss() {
  const [perSession, setPerSession] = useState(1000)
  const [sessions, setSessions] = useState(3)
  const [edge, setEdge] = useState(2.7)
  const [weeks, setWeeks] = useState(52)
  const input = { perSession, sessionsPerWeek: sessions, houseEdge: edge, weeks }
  const problem = gamblingProblem(input)
  const r = problem ? null : expectedLoss(input)
  const scenarios = [...EDGE_EXAMPLES.map((e) => ({ label: e.label, edge: e.edge })), { label: 'Your edge', edge }]
  const rows = problem ? [] : scenarios.map((s) => ({ ...s, loss: expectedLoss({ ...input, houseEdge: s.edge }).expectedLoss }))
  const max = Math.max(...rows.map((x) => x.loss), 1)

  return (
    <CalcGrid
      inputs={
        <Panel title="Magkano ang nawawala mo?" intro="Your betting habit, and a house edge to test. The answer is a long-run average, not a prediction for you." as="section">
          <div className="grid gap-5">
            <SliderField
              label="Total bet per session"
              value={perSession}
              onChange={setPerSession}
              min={50}
              max={20000}
              step={50}
              exact
              suffix="₱"
              format={peso}
              testId="g-per-session"
              hint="Every bet placed, including winnings bet again. This is turnover, not the cash you brought."
            />
            <SliderField label="Sessions a week" value={sessions} onChange={(v) => setSessions(Math.round(v))} min={1} max={21} step={1} format={(v) => `${v}`} />
            <SliderField
              label="House edge"
              value={edge}
              onChange={setEdge}
              min={0}
              max={15}
              step={0.01}
              exact
              suffix="%"
              format={(v) => `${v.toFixed(2)}%`}
              testId="g-edge"
              hint="Edges differ by game and by bet. The examples below follow from each game’s rules."
            />
            <div className="ui flex flex-wrap gap-2">
              {EDGE_EXAMPLES.map((e) => (
                <button
                  key={e.label}
                  type="button"
                  onClick={() => setEdge(e.edge)}
                  title={e.derivation}
                  className={`cursor-pointer rounded-full border-0 px-3 py-2 text-[0.875rem] font-medium ${edge === e.edge ? 'bg-alarm text-white' : 'bg-ground text-ink hover:bg-alarm-soft'}`}
                >
                  {e.label} · {e.edge}%
                </button>
              ))}
            </div>
            <SliderField label="Over" value={weeks} onChange={(v) => setWeeks(Math.round(v))} min={1} max={520} step={1} format={period} testId="g-weeks" />
          </div>
        </Panel>
      }
      result={
        <>
          <ResultHero
            label={`Expected loss over ${period(weeks)}`}
            value={r?.expectedLoss ?? 0}
            format={pesoExact}
            tone={r ? 'loss' : 'soft'}
            testId="g-expected-loss"
            caption={
              r ? (
                <>
                  On <span data-testid="g-total-wagered">{pesoExact(r.totalWagered)}</span> bet in total, the average player gets back {pesoExact(r.expectedReturned)}. The game keeps the rest.
                </>
              ) : (
                problem
              )
            }
          />
          {r && (
            <Panel>
              <dl className="m-0 grid grid-cols-3 gap-4">
                <Stat label="A week" value={peso(r.perWeek)} testId="g-week" />
                <Stat label="A month" value={peso(r.perMonth)} testId="g-month" />
                <Stat label="A year" value={peso(r.perYear)} testId="g-year" />
              </dl>
              <div className="mt-6 grid gap-3 border-t border-line pt-5" data-testid="g-scenarios">
                <p className="ui text-[0.875rem] font-semibold text-muted">Same habit, different house edges</p>
                {rows.map((x) => (
                  <Bar key={x.label} label={`${x.label} (${x.edge}%)`} value={x.loss} max={max} display={peso(x.loss)} tone={x.label === 'Your edge' ? 'alarm' : 'muted'} />
                ))}
              </div>
            </Panel>
          )}
          <Warning title="What this number is, and is not">
            An average over many players and many bets. Your real result can be better or much worse. Total bets (turnover) are not the money you deposited: winnings bet again count as new bets.
          </Warning>
        </>
      }
    />
  )
}

/* ------------------------------------------------------------------ */

const W = 640
const H = 260

function VarianceDemo() {
  const [bets, setBets] = useState(200)
  const [seed, setSeed] = useState(7)
  const p = 18 / 37
  const paths = useMemo(() => simulatePaths(6, 2000, p, seed), [seed, p])
  const shown = paths.map((path) => path.slice(0, bets + 1))
  const all = shown.flat()
  const lo = Math.min(...all, -(bets * (1 - 2 * p))) - 2
  const hi = Math.max(...all, 2) + 2
  const x = (i: number) => (i / bets) * W
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H
  const ahead = shown.filter((s) => s[s.length - 1] > 0).length
  const expected = -bets * (1 - 2 * p) * 100

  return (
    <section aria-labelledby="variance-title" className="card grid gap-6 p-5 sm:p-8 lg:grid-cols-12" data-testid="variance-demo">
      <div className="lg:col-span-4">
        <h3 id="variance-title" className="text-[1.5rem] leading-tight">
          Bakit may nananalo?
        </h3>
        <p className="mt-2 text-[1rem] leading-relaxed text-ink-2">
          Six simulated players each bet ₱100 on red in single-zero roulette, over and over. A simulation, not data: press the button to see six different players.
        </p>
        <div className="mt-5 grid gap-4">
          <SliderField label="Number of bets" value={bets} onChange={(v) => setBets(Math.round(v))} min={10} max={2000} step={10} format={(v) => `${v}`} testId="v-bets" />
          <button type="button" className="btn btn-soft btn-sm w-fit" onClick={() => setSeed((s) => s + 1)}>
            <Shuffle aria-hidden="true" size={16} /> Six other players
          </button>
        </div>
        <p className="ui mt-5 text-[0.9375rem]" aria-live="polite" data-testid="v-ahead">
          After {bets} bets, <strong className="font-semibold">{ahead} of 6</strong> {ahead === 1 ? 'is' : 'are'} ahead. The average expectation is{' '}
          <strong className="font-semibold text-alarm">{peso(expected)}</strong>.
        </p>
      </div>
      <figure className="m-0 lg:col-span-8">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Balances of six simulated players after ${bets} bets; ${ahead} ahead, the expected line going down`}>
          <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="var(--color-surface-2)" strokeWidth={2} />
          {shown.map((s, k) => (
            <polyline
              key={k}
              fill="none"
              stroke={s[s.length - 1] > 0 ? 'var(--color-gain)' : 'var(--color-muted)'}
              strokeOpacity={0.75}
              strokeWidth={1.6}
              points={s.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}
            />
          ))}
          <line x1={0} y1={y(0)} x2={W} y2={y(-bets * (1 - 2 * p))} stroke="var(--color-alarm)" strokeWidth={3} strokeDasharray="8 6" />
        </svg>
        <figcaption className="ui mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[0.8125rem] text-muted">
          <span>
            <span aria-hidden="true" className="mr-1.5 inline-block h-[3px] w-5 rounded-full bg-alarm align-middle" />
            Expected path: −2.70% of every bet
          </span>
          <span>
            <span aria-hidden="true" className="mr-1.5 inline-block h-[3px] w-5 rounded-full bg-gain align-middle" />
            Player ahead at this point
          </span>
          <span>The zero line is where each player started.</span>
        </figcaption>
      </figure>
    </section>
  )
}
