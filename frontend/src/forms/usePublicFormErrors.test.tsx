import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ApiError } from "../api/client";
import { mapPublicFormError, usePublicFormErrors } from "./usePublicFormErrors";

afterEach(cleanup);

function ErrorHarness() {
  const state = usePublicFormErrors("en");
  return (
    <>
      {state.errors.form ? <p ref={state.alertRef} role="alert" tabIndex={-1}>{state.errors.form}</p> : null}
      <form ref={state.formRef}>
        <label>Email <input name="email" aria-invalid={Boolean(state.errors.email)} onChange={() => state.clearField("email")} /></label>
        {state.errors.email ? <p>{state.errors.email}</p> : null}
      </form>
      <button type="button" onClick={() => state.report(new ApiError(422, { code: "validation_failed", message: "Invalid", details: { fields: { email: "Invalid email" } } }))}>Fail field</button>
      <button type="button" onClick={() => state.report(new ApiError(429, { code: "rate_limited", message: "Slow down" }, 125))}>Rate limit</button>
    </>
  );
}

describe("public form errors", () => {
  it("localizes form-level failures and includes Retry-After guidance", () => {
    expect(mapPublicFormError(new ApiError(429, { code: "rate_limited", message: "Slow down" }, 125), "de").form)
      .toContain("3 Minuten");
    expect(mapPublicFormError(new TypeError("offline"), "de").form).toContain("Verbindung");
  });

  it("focuses the first field, clears its error on change, and focuses a form alert", async () => {
    render(<ErrorHarness />);
    fireEvent.click(screen.getByRole("button", { name: "Fail field" }));
    const email = screen.getByRole("textbox", { name: "Email" });
    await waitFor(() => expect(email).toHaveFocus());
    fireEvent.change(email, { target: { value: "person@example.org" } });
    expect(email).not.toHaveAttribute("aria-invalid", "true");

    fireEvent.click(screen.getByRole("button", { name: "Rate limit" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
    expect(screen.getByRole("alert")).toHaveTextContent("3 minutes");
  });
});
