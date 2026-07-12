import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { Field } from "./ui";

afterEach(cleanup);

describe("Field error semantics", () => {
  it.each([
    ["Text", <input key="input" />],
    ["Choice", <select key="select"><option>One</option></select>],
    ["Comment", <textarea key="textarea" />],
  ])("associates %s errors with the control", (label, control) => {
    render(<Field label={label} error="This value is invalid.">{control}</Field>);
    const field = screen.getByLabelText(label);
    const errorId = field.getAttribute("aria-describedby");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(errorId).toBeTruthy();
    expect(document.getElementById(errorId!)).toHaveTextContent("This value is invalid.");
  });
});
