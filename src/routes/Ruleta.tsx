import { useEffect, useRef, useState } from 'react'
import { Dices, RotateCcw, Trophy, Waves } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCustomers } from '@/hooks/useCustomers'
import { cn } from '@/lib/utils'
import type { Customer } from '@/types'

type Phase = 'setup' | 'playing' | 'done'

const SPIN_DURATION_MS = 1800
const SPIN_START_INTERVAL = 70
const SPIN_MAX_INTERVAL = 260

function pickRandom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

export function Ruleta() {
  const { data: customers, isLoading } = useCustomers()
  const activeCustomers = (customers ?? []).filter((c) => c.active)

  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())
  const [eliminationCount, setEliminationCount] = useState('3')
  const [phase, setPhase] = useState<Phase>('setup')
  const [remaining, setRemaining] = useState<Customer[]>([])
  const [eliminated, setEliminated] = useState<Customer[]>([])
  const [winner, setWinner] = useState<Customer | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [spinning, setSpinning] = useState(false)
  const timeoutsRef = useRef<number[]>([])

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  const participantPool = activeCustomers.filter((c) => !excludedIds.has(c.id))
  const target = Number(eliminationCount) || 0
  const canStart = target >= 1 && participantPool.length >= target + 1
  const untouched = winner ? remaining.filter((c) => c.id !== winner.id) : remaining

  function toggleExcluded(id: string) {
    setExcludedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleStart() {
    if (!canStart) return
    setRemaining(participantPool)
    setEliminated([])
    setWinner(null)
    setDisplayName('')
    setPhase('playing')
  }

  function handleReset() {
    timeoutsRef.current.forEach((t) => window.clearTimeout(t))
    timeoutsRef.current = []
    setSpinning(false)
    setRemaining([])
    setEliminated([])
    setWinner(null)
    setDisplayName('')
    setPhase('setup')
  }

  function handleSpin() {
    if (spinning || remaining.length === 0) return
    setSpinning(true)
    const isWinnerRound = eliminated.length >= target
    let elapsed = 0
    let interval = SPIN_START_INTERVAL

    function tick() {
      setDisplayName(pickRandom(remaining).name)
      elapsed += interval
      interval = Math.min(interval * 1.15, SPIN_MAX_INTERVAL)
      if (elapsed < SPIN_DURATION_MS) {
        const t = window.setTimeout(tick, interval)
        timeoutsRef.current.push(t)
        return
      }
      const finalPick = pickRandom(remaining)
      setDisplayName(finalPick.name)
      if (isWinnerRound) {
        setWinner(finalPick)
        setPhase('done')
      } else {
        setEliminated((prev) => [...prev, finalPick])
        setRemaining((prev) => prev.filter((c) => c.id !== finalPick.id))
      }
      setSpinning(false)
    }
    tick()
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Ruleta</h1>
        <p className="text-sm text-muted-foreground">
          Sorteo con tus clientes: elige cuántos se van al agua antes de llegar al ganador.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando clientes…</p>
      ) : phase === 'setup' ? (
        <Card>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5 sm:max-w-xs">
              <Label htmlFor="elimination-count">¿Cuántos se van al agua antes del ganador?</Label>
              <Input
                id="elimination-count"
                type="number"
                min="1"
                value={eliminationCount}
                onChange={(e) => setEliminationCount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Ej. si pones 3, los primeros 3 que salgan se van al agua y el siguiente (el 4°) es el
                ganador.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label>Participantes ({participantPool.length} de {activeCustomers.length})</Label>
                <div className="flex gap-3 text-xs font-medium text-brand-pink-strong">
                  <button type="button" className="hover:underline" onClick={() => setExcludedIds(new Set())}>
                    Todos
                  </button>
                  <button
                    type="button"
                    className="hover:underline"
                    onClick={() => setExcludedIds(new Set(activeCustomers.map((c) => c.id)))}
                  >
                    Ninguno
                  </button>
                </div>
              </div>

              {activeCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tienes clientes activos registrados todavía.
                </p>
              ) : (
                <div className="grid max-h-72 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-border p-2 sm:grid-cols-2">
                  {activeCustomers.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary/40"
                    >
                      <input
                        type="checkbox"
                        checked={!excludedIds.has(c.id)}
                        onChange={() => toggleExcluded(c.id)}
                        className="size-4 accent-brand-pink-strong"
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {!canStart && (
              <p className="text-xs text-rose-600">
                Necesitas al menos {target + 1} participantes seleccionados para {target} que se vayan
                al agua y 1 ganador.
              </p>
            )}

            <Button onClick={handleStart} disabled={!canStart} className="gap-2 self-start">
              <Dices className="size-4" />
              Iniciar sorteo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
              {phase === 'done' ? (
                <>
                  <Trophy className="size-10 text-brand-pink-strong" />
                  <p className="text-sm font-medium text-muted-foreground">¡Tenemos ganador!</p>
                  <p className="font-heading text-3xl font-semibold text-foreground">{winner?.name}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-muted-foreground">
                    {eliminated.length >= target
                      ? '¡Última ronda! El siguiente es el ganador 🏆'
                      : `Ronda ${eliminated.length + 1} de ${target} — se va al agua`}
                  </p>
                  <p
                    className={cn(
                      'font-heading text-3xl font-semibold text-foreground transition-transform',
                      spinning && 'scale-105',
                    )}
                  >
                    {displayName || '—'}
                  </p>
                </>
              )}

              <div className="flex flex-wrap justify-center gap-2">
                {phase === 'playing' && (
                  <Button onClick={handleSpin} disabled={spinning} className="gap-2">
                    <Dices className="size-4" />
                    {spinning ? 'Girando…' : 'Girar'}
                  </Button>
                )}
                <Button variant="outline" onClick={handleReset} className="gap-2">
                  <RotateCcw className="size-4" />
                  Reiniciar
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  <Waves className="size-4 text-muted-foreground" />
                  Se fueron al agua ({eliminated.length})
                </div>
                {eliminated.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nadie todavía.</p>
                ) : (
                  <ol className="flex flex-col gap-1 text-sm">
                    {eliminated.map((c, i) => (
                      <li key={c.id} className="text-muted-foreground">
                        {i + 1}. {c.name}
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-2">
                <p className="text-sm font-medium">
                  {phase === 'done' ? `No llegaron a jugar (${untouched.length})` : `En la ruleta (${remaining.length})`}
                </p>
                <p className="flex flex-wrap gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  {untouched.map((c) => c.name).join(', ') || '—'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
