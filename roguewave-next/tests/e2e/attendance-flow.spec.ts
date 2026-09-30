/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, Page } from "@playwright/test";

/* =========================
   MOCK DATA
   ========================= */

const SESSION_ID = 1;
const SESSION_URL = `/api/sessions/${SESSION_ID}`;
const ATTENDANCE_URL = `/api/attendance`;
const ATTENDANCE_RECORD_URL = `/api/attendance/1`;

const mockSession = {
  id: SESSION_ID,
  name: "Morning Swim",
  role: "Head Coach",
  default_location: "President's College Pool",
  session_date: null,
  start_time: null,
  end_time: null,
  session_schedules: [
    { id: 1, day_of_week: 3, start_time: "10:00", end_time: "11:00" },
  ],
  swimmers: [
    { id: 1, name: "Alice Johnson" },
    { id: 2, name: "Bob Smith" },
  ],
};

const mockAttendanceRecord = {
  id: 1,
  session_id: SESSION_ID,
  attendance_date: "2020-01-01",
  location: "President's College Pool",
  session_status: "normal",
  coach_status: null,
  swimmers: [
    { id: 100, swimmer_id: 1, swimmer_name: "Alice Johnson", attendance_status: "present" },
    { id: 101, swimmer_id: 2, swimmer_name: "Bob Smith", attendance_status: "absent" },
  ],
};

const mockCancelledAttendance = {
  id: 1,
  session_id: SESSION_ID,
  attendance_date: "2020-01-01",
  location: "President's College Pool",
  session_status: "cancelled",
  coach_status: null,
  swimmers: [],
};

/* =========================
   HELPERS
   ========================= */

async function setupSessionRoute(page: Page) {
  await page.route(SESSION_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(mockSession),
    }),
  );
}

async function setupAttendanceRoute(
  page: Page,
  date: string,
  record: unknown,
) {
  await page.route(
    `${ATTENDANCE_URL}?session_id=${SESSION_ID}&date=${date}`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ record }),
      }),
  );
}

function handleDialogs(page: Page) {
  page.on("dialog", (dialog) => dialog.accept());
}

/* =========================
   TESTS
   ========================= */

test.describe("Attendance UI Flow", () => {
  test.beforeEach(async ({ page }) => {
    handleDialogs(page);

    // Catch-all guard: abort any /api/** request not explicitly mocked.
    // Registered first so specific routes (registered later) take precedence.
    await page.route("**/api/**", (route) => {
      const url = route.request().url();
      const method = route.request().method();
      throw new Error(
        `Unexpected API request: ${method} ${url}. ` +
          `This request was not explicitly mocked and would reach the real backend.`,
      );
    });

    await setupSessionRoute(page);
  });

  test("A: Existing attendance loads into UI", async ({ page }) => {
    await setupAttendanceRoute(page, "2020-01-01", mockAttendanceRecord);

    await page.goto(`/attendance/${SESSION_ID}?date=2020-01-01`);

    await expect(page.getByText("Morning Swim")).toBeVisible();
    await expect(page.getByLabel("Location")).toHaveValue("President's College Pool");
    await expect(page.getByText("✓ Attendance Already Marked")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit Attendance" }),
    ).toBeVisible();

    const aliceCheckbox = page.getByRole("checkbox", { name: "Alice Johnson" });
    await expect(aliceCheckbox).toBeChecked();

    const bobCheckbox = page.getByRole("checkbox", { name: "Bob Smith" });
    await expect(bobCheckbox).not.toBeChecked();
  });

  test("B: No existing attendance shows fresh form", async ({ page }) => {
    await setupAttendanceRoute(page, "2020-01-01", null);

    await page.goto(`/attendance/${SESSION_ID}?date=2020-01-01`);

    await expect(page.getByText("Morning Swim")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save Attendance" }),
    ).toBeVisible();
    await expect(
      page.getByText("✓ Attendance Already Marked"),
    ).not.toBeVisible();
  });

  test("C: Save new attendance", async ({ page }) => {
    await setupAttendanceRoute(page, "2020-01-01", null);

    const newRecord = {
      id: 1,
      session_id: SESSION_ID,
      attendance_date: "2020-01-01",
      location: "President's College Pool",
      session_status: "normal",
      coach_status: null,
      swimmers: [
        { id: 100, swimmer_id: 1, swimmer_name: "Alice Johnson", attendance_status: "present" },
        { id: 101, swimmer_id: 2, swimmer_name: "Bob Smith", attendance_status: "absent" },
      ],
    };

    let capturedBody: any = null;
    await page.route(ATTENDANCE_URL, (route) => {
      if (route.request().method() === "POST") {
        capturedBody = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ record: newRecord }),
        });
      }
      return route.continue();
    });

    await page.goto(`/attendance/${SESSION_ID}?date=2020-01-01`);

    await page.getByRole("checkbox", { name: "Alice Johnson" }).check();
    await page.getByRole("button", { name: "Save Attendance" }).click();

    await expect(
      page.getByText("✓ Attendance Already Marked"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Edit Attendance" }),
    ).toBeVisible();

    expect(capturedBody).not.toBeNull();
    expect(capturedBody.session_id).toBe(SESSION_ID);
    expect(capturedBody.attendance_date).toBe("2020-01-01");
    expect(capturedBody.location).toBe("President's College Pool");
    expect(capturedBody.session_status).toBe("normal");
    expect(capturedBody.present_swimmer_ids).toContain(1);
  });

  test("D: Edit existing attendance", async ({ page }) => {
    await setupAttendanceRoute(page, "2020-01-01", mockAttendanceRecord);

    const updatedRecord = {
      ...mockAttendanceRecord,
      location: "New Pool Location",
      swimmers: [
        { id: 100, swimmer_id: 1, swimmer_name: "Alice Johnson", attendance_status: "absent" },
        { id: 101, swimmer_id: 2, swimmer_name: "Bob Smith", attendance_status: "present" },
      ],
    };

    let capturedBody: any = null;
    await page.route(ATTENDANCE_RECORD_URL, (route) => {
      if (route.request().method() === "PATCH") {
        capturedBody = route.request().postDataJSON();
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ record: updatedRecord }),
        });
      }
      return route.continue();
    });

    await page.goto(`/attendance/${SESSION_ID}?date=2020-01-01`);

    await page.getByRole("button", { name: "Edit Attendance" }).click();

    await page.getByLabel("Location").fill("New Pool Location");
    await page.getByRole("checkbox", { name: "Alice Johnson" }).uncheck();
    await page.getByRole("checkbox", { name: "Bob Smith" }).check();
    await page.getByRole("button", { name: "Update Attendance" }).click();

    await expect(page.getByLabel("Location")).toHaveValue("New Pool Location");
    await expect(
      page.getByText("✓ Attendance Already Marked"),
    ).toBeVisible();

    expect(capturedBody).not.toBeNull();
    expect(capturedBody.location).toBe("New Pool Location");
    expect(capturedBody.session_status).toBe("normal");
  });

  test("E: Cancel Edit restores saved values", async ({ page }) => {
    await setupAttendanceRoute(page, "2020-01-01", mockAttendanceRecord);

    await page.goto(`/attendance/${SESSION_ID}?date=2020-01-01`);

    await page.getByRole("button", { name: "Edit Attendance" }).click();

    await page.getByLabel("Location").fill("Changed Location");
    await page.getByRole("checkbox", { name: "Alice Johnson" }).uncheck();
    await page.getByRole("button", { name: "Cancel Edit" }).click();

    await expect(page.getByLabel("Location")).toHaveValue("President's College Pool");
    const aliceCheckbox = page.getByRole("checkbox", { name: "Alice Johnson" });
    await expect(aliceCheckbox).toBeChecked();
  });

  test("F: Date switching does not leak stale attendance", async ({ page }) => {
    await setupAttendanceRoute(page, "2020-01-01", mockAttendanceRecord);
    await setupAttendanceRoute(page, "2020-01-08", null);

    await page.goto(`/attendance/${SESSION_ID}?date=2020-01-01`);

    await expect(
      page.getByText("✓ Attendance Already Marked"),
    ).toBeVisible();

    await page.getByLabel("Attendance Date").fill("2020-01-08");

    await expect(
      page.getByText("✓ Attendance Already Marked"),
    ).not.toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save Attendance" }),
    ).toBeVisible();
  });

  test("G: Cancelled session UI behaves correctly", async ({ page }) => {
    await setupAttendanceRoute(page, "2020-01-01", mockCancelledAttendance);

    await page.goto(`/attendance/${SESSION_ID}?date=2020-01-01`);

    await expect(
      page.getByText("✓ Attendance Already Marked"),
    ).toBeVisible();

    const cancelledRadio = page.getByRole("radio", { name: "Cancelled" });
    await expect(cancelledRadio).toBeChecked();

    const aliceCheckbox = page.getByRole("checkbox", { name: "Alice Johnson" });
    await expect(aliceCheckbox).not.toBeVisible();
  });

  test("H: Frontend validation - future date", async ({ page }) => {
    await setupAttendanceRoute(page, "2020-01-01", null);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const futureDateStr = futureDate.toISOString().split("T")[0];
    await setupAttendanceRoute(page, futureDateStr, null);

    await page.goto(`/attendance/${SESSION_ID}?date=2020-01-01`);

    await page.getByLabel("Attendance Date").fill(futureDateStr);
    await page.getByRole("button", { name: "Save Attendance" }).click();

    await expect(
      page.getByRole("button", { name: "Save Attendance" }),
    ).toBeVisible();
  });
});
