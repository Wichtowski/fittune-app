import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { formFromTemplate, routineTemplates, templateCategories, type RoutineTemplate, type TemplateCategory } from "../templates";
import { exercisesQuery } from "@/api/exercises";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import type { RoutineFormInput } from "@/schemas/routine";

export function TemplatePicker({ onPick }: { onPick: (values: RoutineFormInput) => void }) {
  const { data: catalog, error, refetch } = useQuery(exercisesQuery());
  const [category, setCategory] = useState<TemplateCategory | "All">("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const query = search.trim().toLowerCase();
  const shown = routineTemplates.filter((template) =>
    (category === "All" || template.category === category) &&
    (!query || `${template.name} ${t(template.category)} ${template.exercises.map(([name]) => name).join(" ")}`.toLowerCase().includes(query)),
  );

  const pick = (template: RoutineTemplate) => {
    if (!catalog) return;
    const values = formFromTemplate(template, catalog);
    if (!values) {
      setMissing(true);
      return;
    }
    onPick(values);
    setSelected(template.name);
    setMissing(false);
    document.getElementById("routine-form")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="mb-8" aria-labelledby="templates-heading">
      <div className="mb-4">
        <h2 id="templates-heading" className="font-display text-2xl font-bold uppercase">{t("Predefined plans")}</h2>
        <p className="text-sm text-muted-foreground">{t("Choose a session, then adjust its exercises and targets before saving.")}</p>
      </div>
      <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search plans or exercises")} aria-label={t("Search plans or exercises")} className="mb-3" />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t("Filter plans")}>
        {(["All", ...templateCategories] as const).map((option) => (
          <Button key={option} type="button" size="sm" variant={category === option ? "default" : "outline"} onClick={() => setCategory(option)} aria-pressed={category === option}>
            {t(option)}
          </Button>
        ))}
      </div>
      {error && !catalog ? (
        <p className="mb-3 text-sm text-destructive">{t("Couldn't load exercises.")} <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>{t("Retry")}</Button></p>
      ) : null}
      {missing ? <p className="mb-3 text-sm text-destructive">{t("Some exercises in this plan are unavailable. Choose another plan or create your own.")}</p> : null}
      {selected ? <p className="mb-3 text-sm text-muted-foreground" role="status">{t("Loaded {name}. Review it below before saving.", { name: t(selected) })}</p> : null}
      {shown.length === 0 ? <p className="text-sm text-muted-foreground">{t("No plans match your search.")}</p> : null}
      <ul className="grid max-h-[32rem] gap-3 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((template) => (
          <li key={template.name} className="flex flex-col gap-3 rounded-2xl border bg-card p-4">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(template.category)}</p>
              <h3 className="mt-1 font-semibold">{t(template.name)}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{template.exercises.map(([name]) => name).join(" · ")}</p>
            </div>
            <Button type="button" size="sm" variant={selected === template.name ? "secondary" : "outline"} disabled={!catalog} onClick={() => pick(template)}>
              {selected === template.name ? t("Selected") : t("Use plan")}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
