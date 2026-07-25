import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { DataProviderProvider } from "../../data/DataProviderContext";
import { DemoDataProvider } from "../../data/DemoDataProvider";
import { PostsPanel } from "./PostsPanel";

afterEach(cleanup);

async function renderPosts() {
  const provider = new DemoDataProvider();
  await provider.unlock("demo-admin");
  const router = createMemoryRouter(
    [{ path: "/admin/posts", element: <PostsPanel /> }],
    { initialEntries: ["/admin/posts"] },
  );
  render(<DataProviderProvider provider={provider}><RouterProvider router={router} /></DataProviderProvider>);
  await screen.findByRole("button", { name: "New post" });
  return provider;
}

describe("post editor UI", () => {
  it("adopts a newly created post so a second save updates instead of duplicating", async () => {
    const user = userEvent.setup();
    const provider = await renderPosts();
    await user.click(screen.getByRole("button", { name: "New post" }));
    await user.type(screen.getByLabelText("Title"), "Single saved post");

    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByText("Post created.");
    await user.click(screen.getByRole("button", { name: "Save draft" }));
    await screen.findByText("Post updated.");

    const posts = await provider.getAdminPosts();
    expect(posts.items.filter((post) => post.title === "Single saved post")).toHaveLength(1);
  });

  it("renders rich preview HTML while removing unsafe content", async () => {
    const user = userEvent.setup();
    await renderPosts();
    await user.click(screen.getByRole("button", { name: "New post" }));
    await user.type(screen.getByLabelText("Body"), "<h2>Preview heading</h2><script>unsafe()</script><strong>Safe text</strong>");
    await user.click(screen.getByRole("button", { name: "Preview" }));

    expect(await screen.findByRole("heading", { name: "Preview heading" })).toBeInTheDocument();
    expect(screen.getByText("Safe text")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("unsafe()")).not.toBeInTheDocument());
  });
});
