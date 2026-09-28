import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { LanguagePicker } from "@/components/language-picker";
import { formatDay } from "./format";
import { LocaleProvider, t } from "./i18n";

function Example() {
  return <><LanguagePicker /><p>{t("Workouts")}</p><p>{formatDay("2026-09-27T12:00:00", new Date("2026-09-28T12:00:00"))}</p></>;
}

it("switches and persists the selected language across the screen", () => {
  render(<LocaleProvider><Example /></LocaleProvider>);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "pl" } });
  expect(screen.getByText("Treningi")).toBeInTheDocument();
  expect(screen.getByText("Wczoraj")).toBeInTheDocument();
  expect(document.documentElement.lang).toBe("pl");
  expect(localStorage.getItem("fittune-locale")).toBe("pl");

  fireEvent.change(screen.getByRole("combobox"), { target: { value: "en" } });
  expect(screen.getByText("Workouts")).toBeInTheDocument();
  expect(screen.getByText("Yesterday")).toBeInTheDocument();
});
