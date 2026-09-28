import { t } from "@/lib/i18n";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { equipmentItemGroups, equipmentItemLabels } from "@/lib/labels";
import { EQUIPMENT_ITEMS, type EquipmentItem } from "@/schemas/common";

type EquipmentChecklistProps = {
  value: readonly EquipmentItem[];
  onChange: (items: EquipmentItem[]) => void;
};

/** Grouped equipment checkboxes, used for what a place has and what an exercise needs */
export function EquipmentChecklist({ value, onChange }: EquipmentChecklistProps) {
  const id = useId();
  // Keep the canonical order so an unchanged selection saves as an unchanged place
  const set = (next: Set<EquipmentItem>) => onChange(EQUIPMENT_ITEMS.filter((item) => next.has(item)));
  const toggle = (item: EquipmentItem, checked: boolean) => {
    const next = new Set(value);
    if (checked) next.add(item);
    else next.delete(item);
    set(next);
  };

  return (
    <div className="grid gap-4">
      {equipmentItemGroups.map((group, index) => {
        const all = group.items.every((item) => value.includes(item));
        const toggleGroup = () => {
          const next = new Set(value);
          for (const item of group.items) {
            if (all) next.delete(item);
            else next.add(item);
          }
          set(next);
        };
        return (
          <div key={group.label} role="group" aria-labelledby={`${id}-${index}`} className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <span id={`${id}-${index}`} className="text-sm font-medium">{t(group.label)}</span>
              <Button type="button" variant="ghost" size="sm" aria-label={`${all ? t("Clear") : t("Select all")} ${t(group.label).toLowerCase()}`} onClick={toggleGroup}>
                {all ? t("Clear") : t("Select all")}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {group.items.map((item) => (
                <label
                  key={item}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm has-checked:border-primary has-checked:bg-primary/10"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(item)}
                    onChange={(event) => toggle(item, event.target.checked)}
                    className="size-4 accent-primary"
                  />
                  {t(equipmentItemLabels[item])}
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
