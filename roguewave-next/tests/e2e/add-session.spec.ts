/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, Page } from "@playwright/test";

/* =========================
   MOCK DATA
   ========================= */

const SESSIONS_URL = "/api/sessions";
const SWIMMERS_URL = "/api/swimmers";

const mockSwimmers = [
  { id: 1, name: "Alice Johnson", level: "Beginner" },
  { id: 2, name: "Bob Smith", level: "Intermediate" },
];



/* =========================
   HELPERS
   ========================= */

function handleDialogs(page: Page) {
  page.on("dialog", (dialog) => dialog.accept());
}

async function setupSwimmersRoute(page: Page) {
  await page.route(SWIMMERS_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockSwimmers),
    }),
  );
}

/* =========================
   TESTS
   ========================= */

test.describe("Add Session", () => {
  test.beforeEach(async ({ page }) => {
    handleDialogs(page);

    // Catch-all guard: abort any /api/** request not explicitly mocked.
    await page.route("**/api/**", (route) => {
      const url = route.request().url();
      const method = route.request().method();
      throw new Error(
        `Unexpected API request: ${method} ${url}. ` +
          `This request was not explicitly mocked and would reach the real backend.`,
      );
    });

    await setupSwimmersRoute(page);
  });

  test("E2E: Add Session navigates to /sessions after successful save", async ({
    page,
  }) => {
    // Arrange: mock POST /api/sessions
    let capturedBody: any = null;
    let postCount = 0;

    await page.route(SESSIONS_URL, (route) => {
      if (route.request().method() === "POST") {
        postCount++;
        capturedBody = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Session created successfully.",
            session: {
              id: 2,
              name: "Gold March Academy",
              role: "Head Coach",
              session_type: "recurring",
              default_location: null,
              session_date: null,
              start_time: null,
              end_time: null,
            },
          }),
        });
      }
      return route.continue();
    });

    // Act: open Add Session page
    await page.goto("/sessions/add");

    // Fill the form
    await page.getByPlaceholder("Example: RogueWave Learn to Swim").fill("Gold March Academy");
    await page.getByLabel("Session Type").selectOption("recurring");
    await page.getByLabel("My Role").selectOption("head");

    // Fill schedule (first row is pre-rendered)
    await page.getByLabel("Day").first().selectOption("Wednesday");
    await page.getByLabel("Start Time").first().fill("14:00");
    await page.getByLabel("End Time").first().fill("15:00");

    // Click Save
    await page.getByRole("button", { name: "Save Session" }).click();

    // Assert: exactly one POST request was sent
    expect(postCount).toBe(1);

    // Assert: request body contains the new session name
    expect(capturedBody).not.toBeNull();
    expect(capturedBody.name).toBe("Gold March Academy");

    // Assert: browser URL becomes /sessions
    await expect(page).toHaveURL(/\/sessions$/);
  });

  test("E2E: Failed save stays on Add Session form", async ({ page }) => {
    // Arrange: mock POST /api/sessions returning an error
    let postCount = 0;

    await page.route(SESSIONS_URL, (route) => {
      if (route.request().method() === "POST") {
        postCount++;
        return route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Missing required session details." }),
        });
      }
      return route.continue();
    });

    // Act: open Add Session page
    await page.goto("/sessions/add");

    // Fill the form
    await page.getByPlaceholder("Example: RogueWave Learn to Swim").fill("Gold March Academy");
    await page.getByLabel("Session Type").selectOption("recurring");
    await page.getByLabel("My Role").selectOption("head");

    // Fill schedule
    await page.getByLabel("Day").first().selectOption("Wednesday");
    await page.getByLabel("Start Time").first().fill("14:00");
    await page.getByLabel("End Time").first().fill("15:00");

    // Click Save
    await page.getByRole("button", { name: "Save Session" }).click();

    // Assert: POST request was sent
    expect(postCount).toBe(1);

    // Assert: browser remains on /sessions/add
    await expect(page).toHaveURL(/\/sessions\/add/);

    // Assert: form is still visible (not navigated away)
    await expect(
      page.getByPlaceholder("Example: RogueWave Learn to Swim"),
    ).toBeVisible();
  });
});
