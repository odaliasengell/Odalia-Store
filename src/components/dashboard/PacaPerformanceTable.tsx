import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDate } from '@/lib/format'

export interface PacaPerformance {
  id: string
  description: string
  date: string
  cost: number
  sold: number
  soldCount: number
  remaining: number | null
}

export function PacaPerformanceTable({ data }: { data: PacaPerformance[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rendimiento por paca</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay pacas registradas.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paca</TableHead>
                  <TableHead className="text-right">Costo</TableHead>
                  <TableHead className="text-right">Vendido</TableHead>
                  <TableHead className="text-right">Ganancia</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Prendas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p) => {
                  const profit = p.sold - p.cost
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-[180px] whitespace-normal break-words">
                        <p className="font-medium">{p.description}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(p.date)}</p>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatCurrency(p.cost)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(p.sold)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {formatCurrency(profit)}
                        </span>
                      </TableCell>
                      <TableCell className="hidden text-right text-sm text-muted-foreground md:table-cell">
                        {p.soldCount}
                        {p.remaining != null ? ` vendidas · quedan ${p.remaining}` : ' vendidas'}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
