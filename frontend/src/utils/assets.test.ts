import { describe, expect, it } from "vitest";

import { accessKeyActivationUrl } from "./assets";

describe("access-key activation URLs", () => {
  it("places the secret in a fragment rather than a server-visible path", () => {
    const url = accessKeyActivationUrl("secret/value");
    expect(url).toContain("/admin#access-key=secret%2Fvalue");
    expect(url).not.toContain("/admin/unlock/");
  });
});
