import { useQuery } from "@tanstack/react-query";
import { PlusIcon, SearchIcon } from "lucide-react";

import { formatAmount } from "../nutrition";
import { productSearchQuery } from "@/api/health";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { t } from "@/lib/i18n";
import type { Product } from "@/schemas/health";

/** Search the shared products; without a query it lists what the user logged recently */
export function ProductSearch({ query, onQueryChange, onPick, onCreate }: {
  query: string;
  onQueryChange: (query: string) => void;
  onPick: (product: Product) => void;
  onCreate: () => void;
}) {
  const debounced = useDebouncedValue(query.trim(), 250);
  const results = useQuery(productSearchQuery(debounced));

  return (
    <div className="grid gap-3">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input type="search" aria-label={t("Search products")} placeholder={t("Search products")} value={query} onChange={(event) => onQueryChange(event.target.value)} className="pl-10" autoFocus />
      </div>
      {results.isError ? <p className="text-sm text-destructive">{t("Could not load products. Try again.")}</p> : null}
      <ul className="grid gap-1.5" aria-busy={results.isFetching}>
        {results.data?.map((product) => (
          <li key={product.id}>
            <button type="button" onClick={() => onPick(product)} className="flex w-full items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-colors hover:bg-accent">
              <span className="min-w-0">
                <span className="block truncate font-medium">{product.name}</span>
                {product.brand ? <span className="block truncate text-xs text-muted-foreground">{product.brand}</span> : null}
              </span>
              <span className="shrink-0 text-sm text-muted-foreground tabular">{formatAmount(product.per_100g.energy_kcal, "kcal")} kcal / 100 g</span>
            </button>
          </li>
        ))}
      </ul>
      {results.data && results.data.length === 0 && debounced ? (
        <p className="text-sm text-muted-foreground">{t("No products match. Add it and everyone can use it.")}</p>
      ) : null}
      <Button type="button" variant="secondary" onClick={onCreate}>
        <PlusIcon aria-hidden /> {t("Create product")}
      </Button>
    </div>
  );
}
