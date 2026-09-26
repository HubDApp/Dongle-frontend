import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  STORAGE_KEY,
  clearLearnedData,
  createConfig,
  forgetValue,
  getRecommendations,
  isSensitiveField,
  isSensitiveValue,
  loadProfile,
  recordFeedback,
  recordFieldValue,
  recordSubmission,
  setConsent,
} from "@/services/form-recommendations";

const FORM = "project-submission";
const DAY = 24 * 60 * 60 * 1000;

beforeEach(() => {
  window.localStorage.clear();
});

describe("consent", () => {
  it("learns nothing before the user opts in", () => {
    recordFieldValue(FORM, "websiteUrl", "https://example.com");

    expect(getRecommendations(FORM, "websiteUrl")).toEqual([]);
    expect(loadProfile().fields).toEqual({});
  });

  it("learns once the user opts in", () => {
    setConsent(true);
    recordFieldValue(FORM, "websiteUrl", "https://example.com");

    expect(getRecommendations(FORM, "websiteUrl").map((r) => r.value)).toEqual([
      "https://example.com",
    ]);
  });

  it("erases everything learned when consent is withdrawn", () => {
    setConsent(true);
    recordFieldValue(FORM, "websiteUrl", "https://example.com");

    setConsent(false);

    expect(loadProfile().fields).toEqual({});
    expect(getRecommendations(FORM, "websiteUrl")).toEqual([]);
  });
});

describe("learning from submissions", () => {
  beforeEach(() => setConsent(true));

  it("counts repeated values rather than duplicating them", () => {
    recordFieldValue(FORM, "category", "DeFi");
    recordFieldValue(FORM, "category", "DeFi");
    recordFieldValue(FORM, "category", "DeFi");

    const values = loadProfile().fields[`${FORM}::category`].values;
    expect(values).toHaveLength(1);
    expect(values[0].occurrences).toBe(3);
  });

  it("normalises surrounding and repeated whitespace", () => {
    recordFieldValue(FORM, "category", "  Payments   Infra ");
    recordFieldValue(FORM, "category", "Payments Infra");

    const values = loadProfile().fields[`${FORM}::category`].values;
    expect(values).toHaveLength(1);
    expect(values[0].value).toBe("Payments Infra");
  });

  it("learns every string field of a submission and skips non-strings", () => {
    recordSubmission(FORM, {
      category: "DeFi",
      websiteUrl: "https://example.com",
      fundingGoal: 5000,
      tags: ["a", "b"],
    });

    const { fields } = loadProfile();
    expect(Object.keys(fields).sort()).toEqual([
      `${FORM}::category`,
      `${FORM}::websiteUrl`,
    ]);
  });

  it("ranks a more frequent value above a less frequent one", () => {
    recordFieldValue(FORM, "category", "DeFi");
    recordFieldValue(FORM, "category", "DeFi");
    recordFieldValue(FORM, "category", "Gaming");

    expect(getRecommendations(FORM, "category").map((r) => r.value)).toEqual([
      "DeFi",
      "Gaming",
    ]);
  });

  it("ranks a recent value above an equally frequent stale one", () => {
    const now = Date.now();
    recordFieldValue(FORM, "category", "Old", DEFAULT_CONFIG, now - 60 * DAY);
    recordFieldValue(FORM, "category", "New", DEFAULT_CONFIG, now);

    expect(getRecommendations(FORM, "category", DEFAULT_CONFIG, now)[0].value).toBe(
      "New",
    );
  });

  it("caps the number of suggestions returned", () => {
    const config = createConfig({ maxSuggestionsPerField: 2 });
    for (const value of ["one", "two", "three", "four"]) {
      recordFieldValue(FORM, "category", value, config);
    }

    expect(getRecommendations(FORM, "category", config)).toHaveLength(2);
  });

  it("bounds how many values are retained per field", () => {
    const config = createConfig({ maxValuesPerField: 3 });
    for (const value of ["one", "two", "three", "four", "five"]) {
      recordFieldValue(FORM, "category", value, config);
    }

    expect(loadProfile().fields[`${FORM}::category`].values).toHaveLength(3);
  });

  it("drops values past their TTL", () => {
    const now = Date.now();
    recordFieldValue(FORM, "category", "Ancient", DEFAULT_CONFIG, now - 200 * DAY);

    expect(getRecommendations(FORM, "category", DEFAULT_CONFIG, now)).toEqual([]);
  });
});

describe("feedback", () => {
  beforeEach(() => setConsent(true));

  it("promotes an accepted value over a more frequent unaccepted one", () => {
    const now = Date.now();
    recordFieldValue(FORM, "category", "Frequent", DEFAULT_CONFIG, now);
    recordFieldValue(FORM, "category", "Frequent", DEFAULT_CONFIG, now);
    recordFieldValue(FORM, "category", "Frequent", DEFAULT_CONFIG, now);
    recordFieldValue(FORM, "category", "Chosen", DEFAULT_CONFIG, now);

    expect(getRecommendations(FORM, "category", DEFAULT_CONFIG, now)[0].value).toBe(
      "Frequent",
    );

    for (let i = 0; i < 4; i += 1) {
      recordFeedback(FORM, "category", "Chosen", "accepted", DEFAULT_CONFIG, now);
    }

    const ranked = getRecommendations(FORM, "category", DEFAULT_CONFIG, now);
    expect(ranked[0].value).toBe("Chosen");
    expect(ranked[0].reason).toBe("accepted");
  });

  it("suppresses a value the user keeps rejecting", () => {
    recordFieldValue(FORM, "category", "Unwanted");

    recordFeedback(FORM, "category", "Unwanted", "rejected");
    expect(getRecommendations(FORM, "category").map((r) => r.value)).toEqual([
      "Unwanted",
    ]);

    recordFeedback(FORM, "category", "Unwanted", "rejected");
    expect(getRecommendations(FORM, "category")).toEqual([]);
  });

  it("ignores feedback for a value that was never learned", () => {
    recordFieldValue(FORM, "category", "Known");
    const before = loadProfile();

    recordFeedback(FORM, "category", "Unknown", "accepted");

    expect(loadProfile().fields).toEqual(before.fields);
  });

  it("forgets one value without touching the others", () => {
    recordFieldValue(FORM, "category", "Keep");
    recordFieldValue(FORM, "category", "Drop");

    forgetValue(FORM, "category", "Drop");

    expect(getRecommendations(FORM, "category").map((r) => r.value)).toEqual(["Keep"]);
  });

  it("clears learned data while keeping consent", () => {
    recordFieldValue(FORM, "category", "DeFi");

    clearLearnedData();

    expect(loadProfile().consentGranted).toBe(true);
    expect(loadProfile().fields).toEqual({});
  });
});

describe("privacy", () => {
  beforeEach(() => setConsent(true));

  it.each([
    "password",
    "confirmPassword",
    "apiKey",
    "api_key",
    "secretSeed",
    "emailAddress",
    "phoneNumber",
    "cardNumber",
  ])("never learns the sensitive field %s", (fieldName) => {
    expect(isSensitiveField(fieldName)).toBe(true);

    recordFieldValue(FORM, fieldName, "some-value-here");

    expect(loadProfile().fields).toEqual({});
    expect(getRecommendations(FORM, fieldName)).toEqual([]);
  });

  it.each([
    "user@example.com",
    "SB7777777777777777777777777777777777777777777777777777777",
    "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig",
  ])("never learns the sensitive value %s", (value) => {
    expect(isSensitiveValue(value)).toBe(true);

    recordFieldValue(FORM, "notes", value);

    expect(loadProfile().fields).toEqual({});
  });

  it("ignores values that are too short or too long to be reusable", () => {
    recordFieldValue(FORM, "category", "a");
    recordFieldValue(FORM, "category", "x".repeat(DEFAULT_CONFIG.maxValueLength + 1));

    expect(loadProfile().fields).toEqual({});
  });

  it("writes nothing outside its own storage key", () => {
    recordFieldValue(FORM, "category", "DeFi");

    expect(Object.keys(window.localStorage)).toEqual([STORAGE_KEY]);
  });
});

describe("store resilience", () => {
  it("recovers from corrupt stored data", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not valid json");

    expect(loadProfile().fields).toEqual({});
    expect(loadProfile().consentGranted).toBe(false);
  });

  it("discards a profile written by an older schema version", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 0, consentGranted: true, fields: { stale: {} } }),
    );

    expect(loadProfile().fields).toEqual({});
    expect(loadProfile().consentGranted).toBe(false);
  });
});
