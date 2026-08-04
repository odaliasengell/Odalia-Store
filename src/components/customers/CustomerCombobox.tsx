import { useMemo } from "react"
import { SearchIcon } from "lucide-react"
import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxIcon,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import type { Customer } from "@/types"

export const NO_CUSTOMER = "__none__"

interface CustomerComboboxProps {
  id?: string
  customers: Customer[]
  value: string
  onValueChange: (value: string) => void
  disabled?: boolean
  /** Valor/etiqueta de la opción "vacía" — por defecto representa "Cliente de paso"
   * (sin cliente asignado a la venta). Se puede sobreescribir, ej. para un filtro
   * donde esa opción debe significar "Todos" en vez de "Cliente de paso". */
  emptyValue?: string
  emptyLabel?: string
}

export function CustomerCombobox({
  id,
  customers,
  value,
  onValueChange,
  disabled,
  emptyValue = NO_CUSTOMER,
  emptyLabel = "Cliente de paso",
}: CustomerComboboxProps) {
  const nameById = useMemo(() => {
    const map = new Map<string, string>([[emptyValue, emptyLabel]])
    for (const c of customers) map.set(c.id, c.name)
    return map
  }, [customers, emptyValue, emptyLabel])

  const items = useMemo(() => [emptyValue, ...customers.map((c) => c.id)], [customers, emptyValue])

  return (
    <Combobox
      items={items}
      value={value}
      onValueChange={(v) => onValueChange(v ?? emptyValue)}
      itemToStringLabel={(v: string) => nameById.get(v) ?? ""}
      filter={(itemValue: string, query: string) =>
        (nameById.get(itemValue) ?? "").toLowerCase().includes(query.trim().toLowerCase())
      }
      disabled={disabled}
    >
      <ComboboxInputGroup>
        <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
        <ComboboxInput id={id} placeholder="Buscar cliente…" />
        <ComboboxClear />
        <ComboboxIcon />
      </ComboboxInputGroup>
      <ComboboxContent>
        <ComboboxEmpty>No se encontraron clientes.</ComboboxEmpty>
        <ComboboxList>
          {(itemValue: string) => (
            <ComboboxItem key={itemValue} value={itemValue}>
              {nameById.get(itemValue)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
