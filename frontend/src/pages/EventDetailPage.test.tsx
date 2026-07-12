import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { EventDescription } from "./EventDetailPage";

afterEach(cleanup);

describe("EventDescription", () => {
  it("renders a summary with HTML-like characters as plain text", () => {
    const summary = '<img src=x onerror="alert(1)"> Come & meet us';
    const { container } = render(<EventDescription bodyHtml="" summary={summary} />);

    expect(screen.getByText(summary)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders server-sanitized authored body HTML", () => {
    render(<EventDescription bodyHtml="<h2>Programme</h2><p>Welcome</p>" summary="Fallback" />);

    expect(screen.getByRole("heading", { name: "Programme" })).toBeInTheDocument();
    expect(screen.queryByText("Fallback")).toBeNull();
  });
});
