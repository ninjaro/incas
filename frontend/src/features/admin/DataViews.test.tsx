import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { DataViews } from "./DataViews";

afterEach(cleanup);

function View({ label }: { label: string }) {
  return (
    <DataViews
      items={[{ id: 1, label }]}
      keyFor={(item) => item.id}
      columns={["Label"]}
      renderCells={(item) => [item.label]}
      renderCard={(item) => <span>{item.label}</span>}
      empty="Empty"
    />
  );
}

describe("DataViews", () => {
  it("synchronizes the selected representation across mounted panels", async () => {
    const user = userEvent.setup();
    render(<><View label="First" /><View label="Second" /></>);
    const gridButtons = screen.getAllByRole("button", { name: "grid" });
    await user.click(gridButtons[0]);
    expect(gridButtons[0]).toHaveAttribute("aria-pressed", "true");
    expect(gridButtons[1]).toHaveAttribute("aria-pressed", "true");
    expect(gridButtons[0]).toHaveClass("btn-primary");
    expect(gridButtons[1]).toHaveClass("btn-primary");
    expect(document.querySelectorAll(".admin-data-grid")).toHaveLength(2);
  });
});
