import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ApiError } from "@/api/client";
import { fithealth } from "@/api/fithealth";
import { mealsQuery } from "@/api/health";
import { queryKeys } from "@/api/query-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import type { Meal } from "@/schemas/health";

function MealRow({ meal, first, last, onMove, onRename, onDelete }: {
  meal: Meal;
  first: boolean;
  last: boolean;
  onMove: (delta: -1 | 1) => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(t(meal.name));
  const commit = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== t(meal.name)) onRename(trimmed);
    else setName(t(meal.name));
  };
  return (
    <li className="flex items-center gap-1.5">
      <Input aria-label={t("Meal name")} value={name} maxLength={40} onChange={(event) => setName(event.target.value)} onBlur={commit} onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()} className="h-11" />
      <Button variant="ghost" size="icon" aria-label={t("Move {meal} up", { meal: t(meal.name) })} disabled={first} onClick={() => onMove(-1)}><ArrowUpIcon aria-hidden /></Button>
      <Button variant="ghost" size="icon" aria-label={t("Move {meal} down", { meal: t(meal.name) })} disabled={last} onClick={() => onMove(1)}><ArrowDownIcon aria-hidden /></Button>
      <Button variant="ghost" size="icon" aria-label={t("Delete {meal}", { meal: t(meal.name) })} disabled={first && last} onClick={onDelete}><Trash2Icon aria-hidden /></Button>
    </li>
  );
}

/** Rename, reorder, add and delete meals. Deleted meals keep what was logged in them */
export function MealEditor() {
  const queryClient = useQueryClient();
  const meals = useQuery(mealsQuery());
  const [newName, setNewName] = useState("");
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.health.meals });
    void queryClient.invalidateQueries({ queryKey: queryKeys.health.days });
  };
  const failed = (error: Error) => {
    toast.error(error instanceof ApiError ? error.message : t("Could not save. Try again."));
    refresh();
  };
  const rename = useMutation({ mutationFn: ({ id, name }: { id: string; name: string }) => fithealth.renameMeal(id, name), onSuccess: refresh, onError: failed });
  const reorder = useMutation({
    mutationFn: fithealth.reorderMeals,
    onSuccess: (ordered) => {
      queryClient.setQueryData(queryKeys.health.meals, ordered);
      refresh();
    },
    onError: failed,
  });
  const remove = useMutation({ mutationFn: fithealth.deleteMeal, onSuccess: refresh, onError: failed });
  const create = useMutation({
    mutationFn: fithealth.createMeal,
    onSuccess: () => {
      setNewName("");
      refresh();
    },
    onError: failed,
  });

  const list = meals.data ?? [];
  const move = (index: number, delta: -1 | 1) => {
    const ids = list.map((m) => m.id);
    const [moved] = ids.splice(index, 1);
    if (!moved) return;
    ids.splice(index + delta, 0, moved);
    reorder.mutate(ids);
  };

  return (
    <div className="grid gap-3">
      <ul className="grid gap-2">
        {list.map((meal, index) => (
          <MealRow
            key={`${meal.id}-${meal.name}`}
            meal={meal}
            first={index === 0}
            last={index === list.length - 1}
            onMove={(delta) => move(index, delta)}
            onRename={(name) => rename.mutate({ id: meal.id, name })}
            onDelete={() => remove.mutate(meal.id)}
          />
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (newName.trim()) create.mutate(newName.trim());
        }}
      >
        <Input aria-label={t("New meal name")} placeholder={t("New meal, e.g. Supper")} value={newName} maxLength={40} onChange={(event) => setNewName(event.target.value)} className="h-11" />
        <Button type="submit" variant="secondary" className="h-11" disabled={!newName.trim() || create.isPending || list.length >= 10}>
          <PlusIcon aria-hidden /> {t("Add")}
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">{t("Deleting a meal keeps what you logged in it on past days.")}</p>
    </div>
  );
}
