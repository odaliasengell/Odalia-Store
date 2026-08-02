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
}

export function CustomerCombobox({
  id,
  customers,
  value,
  onValueChange,
  disabled,
}: CustomerComboboxProps) {
  const nameById = useMemo(() => {
    const map = new Map<string, string>([[NO_CUSTOMER, "Cliente de paso"]])
    for (const c of customers) map.set(c.id, c.name)
    return map
  }, [customers])

  const items = useMemo(() => [NO_CUSTOMER, ...customers.map((c) => c.id)], [customers])

  return (
    <Combobox
      items={items}
      value={value}
      onValueChange={(v) => onValueChange(v ?? NO_CUSTOMER)}
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
