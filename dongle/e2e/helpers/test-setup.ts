import { Page, expect } from "@playwright/test";

const WALLET_STORAGE_KEY = "dongle_wallet_state";
const REVIEWS_STORAGE_KEY = "dongle_reviews";
const VERIFICATION_STORAGE_KEY = "dongle_verification_requests";

export const TEST_WALLET_ADDRESS = "GTEST123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789";
export const TEST_ADMIN_ADDRESS = "GADMIN1234567890";
export const TEST_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

export async function mockConnectedWallet(page: Page, publicKey?: string) {
  await page.addInitScript(
    ({
      key,
      networkPassphrase,
      pk,
    }: {
      key: string;
      networkPassphrase: string;
      pk: string;
    }) => {
      localStorage.setItem(
        key,
        JSON.stringify({ publicKey: pk, isConnected: true }),
      );
    },
    {
      key: WALLET_STORAGE_KEY,
      networkPassphrase: TEST_NETWORK_PASSPHRASE,
      pk: publicKey ?? TEST_WALLET_ADDRESS,
    },
  );
}

export async function mockAdminWallet(page: Page) {
  await mockConnectedWallet(page, TEST_ADMIN_ADDRESS);
}

export async function seedReviews(page: Page, reviews: unknown[]) {
  await page.addInitScript(
    ({
      key,
      data,
    }: {
      key: string;
      data: string;
    }) => {
      localStorage.setItem(key, data);
    },
    {
      key: REVIEWS_STORAGE_KEY,
      data: JSON.stringify(reviews),
    },
  );
}

export async function seedVerificationRequests(
  page: Page,
  requests: unknown[],
) {
  await page.addInitScript(
    ({
      key,
      data,
    }: {
      key: string;
      data: string;
    }) => {
      localStorage.setItem(key, data);
    },
    {
      key: VERIFICATION_STORAGE_KEY,
      data: JSON.stringify(requests),
    },
  );
}

export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.clear();
  });
}

export async function getLocalStorageItem(page: Page, key: string) {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState("networkidle");
}

export async function expectNoSpinners(page: Page) {
  await expect(page.locator(".animate-spin").first()).toBeHidden({
    timeout: 10_000,
  });
}

export function makeReview(overrides: Record<string, unknown> = {}) {
  return {
    id: `rev-test-${Date.now()}`,
    projectId: "proj1",
    projectName: "Soroban Swap",
    userAddress: TEST_WALLET_ADDRESS,
    rating: 4,
    comment: "This is a great project with solid fundamentals and good team.",
    createdAt: new Date().toISOString(),
    helpfulVotes: [],
    unhelpfulVotes: [],
    ...overrides,
  };
}

export function makeVerificationRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: `ver-test-${Date.now()}`,
    projectId: "proj1",
    projectName: "Soroban Swap",
    submittedBy: TEST_WALLET_ADDRESS,
    submittedAt: new Date().toISOString(),
    status: "PENDING",
    statusUpdatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeAdminVerificationRequest(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: `ver-admin-${Date.now()}`,
    projectId: "proj2",
    projectName: "Stellar Stake",
    submittedBy: "GABC...1234",
    status: "pending",
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}
