import { useQuery } from "@tanstack/react-query";
import { PlusIcon, ScanBarcodeIcon, SearchIcon } from "lucide-react";

import { OffAttribution } from "./off-attribution";
import { formatAmount } from "../nutrition";
import { productSearchQuery } from "@/api/health";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { t } from "@/lib/i18n";
import type { Candidate, Nutrients, Product, Unit } from "@/schemas/health";

function ResultButton({ name, brand, per100g, unit, onClick }: { name: string; brand: string | null; per100g: Nutrients | null; unit: Unit; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-accent">
      <span className="min-w-0">
        <span className="block truncate font-medium">{name}</span>
        {brand ? <span className="block truncate text-xs text-muted-foreground">{brand}</span> : null}
      </span>
      {per100g ? <span className="shrink-0 text-sm text-muted-foreground tabular">{formatAmount(per100g.energy_kcal, "kcal")} kcal / 100 {unit}</span> : null}
    </button>
  );
}

/**
 * Search FitHealth's products and, below them, Open Food Facts listings nobody has confirmed
 * yet; without a query it lists what the user logged recently
 */
export function ProductSearch({ query, onQueryChange, onPick, onPickCandidate, onScan, onCreate }: {
  query: string;
  onQueryChange: (query: string) => void;
  onPick: (product: Product) => void;
  onPickCandidate: (candidate: Candidate) => void;
  onScan: () => void;
  onCreate: () => void;
}) {
  const debounced = useDebouncedValue(query.trim(), 250);
  const results = useQuery(productSearchQuery(debounced));
  const products = results.data?.products ?? [];
  const off = results.data?.off ?? [];

  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input type="search" aria-label={t("Search products")} placeholder={t("Search products")} value={query} onChange={(event) => onQueryChange(event.target.value)} className="pl-10" autoFocus />
        </div>
        <Button type="button" variant="secondary" size="icon" className="size-12" aria-label={t("Scan barcode")} onClick={onScan}>
          <ScanBarcodeIcon aria-hidden />
        </Button>
      </div>
      {results.isError ? <p className="text-sm text-destructive">{t("Could not load products. Try again.")}</p> : null}
      <ul className="grid gap-1.5" aria-busy={results.isFetching}>
        {products.map((product) => (
          <li key={product.id}>
            <ResultButton name={product.name} brand={product.brand} per100g={product.per_100g} unit={product.unit} onClick={() => onPick(product)} />
          </li>
        ))}
      </ul>
      {off.length > 0 ? (
        <section aria-label="Open Food Facts" className="grid gap-1.5">
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t("From Open Food Facts")}</h3>
          <ul className="grid gap-1.5">
            {off.map((candidate) => (
              <li key={candidate.barcode}>
                <ResultButton name={candidate.name} brand={candidate.brand} per100g={candidate.per_100g} unit={candidate.unit} onClick={() => onPickCandidate(candidate)} />
              </li>
            ))}
          </ul>
          <OffAttribution />
        </section>
      ) : null}
      {results.data && products.length + off.length === 0 && debounced ? (
        <p className="text-sm text-muted-foreground">{t("No products match. Add it and everyone can use it.")}</p>
      ) : null}
      <Button type="button" variant="secondary" onClick={onCreate}>
        <PlusIcon aria-hidden /> {t("Create product")}
      </Button>
    </div>
  );
}
