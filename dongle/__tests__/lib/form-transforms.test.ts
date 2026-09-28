import { describe, it, expect } from "vitest";
import {
  trim,
  toLowerCase,
  toUpperCase,
  capitalize,
  titleCase,
  toNumber,
  toBoolean,
  stripTags,
  compactArray,
  dedupeArray,
  defaultTo,
  truncate,
  custom,
  chainTransforms,
  TransformPipeline,
  applyFieldTransforms,
  createTransformSubmitHandler,
} from "@/lib/form-transforms";

describe("Form Field Value Transformation on Submit (Issue #508)", () => {
  describe("Built-in Transforms", () => {
    it("trims whitespace correctly", () => {
      const transform = trim();
      expect(transform("  hello world  ", "name", {})).toBe("hello world");
      expect(transform("no-space", "name", {})).toBe("no-space");
    });

    it("converts to lowercase and uppercase", () => {
      expect(toLowerCase()("HELLO@Stellar.ORG", "email", {})).toBe("hello@stellar.org");
      expect(toUpperCase()("stellar", "code", {})).toBe("STELLAR");
    });

    it("capitalizes strings and titles", () => {
      expect(capitalize()("dongle", "title", {})).toBe("Dongle");
      expect(titleCase()("stellar smart contract hub", "title", {})).toBe(
        "Stellar Smart Contract Hub"
      );
    });

    it("converts strings to numbers safely", () => {
      const numFn = toNumber({ fallback: 0 });
      expect(numFn("42.5", "amount", {})).toBe(42.5);
      expect(numFn("-100", "amount", {})).toBe(-100);
      expect(numFn("invalid", "amount", {})).toBe(0);
      expect(numFn("", "amount", {})).toBe(0);
    });

    it("converts to boolean values", () => {
      const boolFn = toBoolean();
      expect(boolFn("true", "active", {})).toBe(true);
      expect(boolFn("1", "active", {})).toBe(true);
      expect(boolFn("yes", "active", {})).toBe(true);
      expect(boolFn("false", "active", {})).toBe(false);
      expect(boolFn("0", "active", {})).toBe(false);
      expect(boolFn("", "active", {})).toBe(false);
    });

    it("strips HTML tags", () => {
      const stripFn = stripTags();
      expect(stripFn("<script>alert(1)</script>hello <b>world</b>", "text", {})).toBe(
        "alert(1)hello world"
      );
    });

    it("compacts and deduplicates arrays", () => {
      const compactFn = compactArray();
      expect(compactFn(["a", null, "", "b", undefined, "c"], "tags", {})).toEqual([
        "a",
        "b",
        "c",
      ]);

      const dedupeFn = dedupeArray();
      expect(dedupeFn(["stellar", "crypto", "stellar", "usdc"], "tokens", {})).toEqual([
        "stellar",
        "crypto",
        "usdc",
      ]);
    });

    it("applies defaultTo fallback", () => {
      const defFn = defaultTo("N/A");
      expect(defFn(null, "val", {})).toBe("N/A");
      expect(defFn("", "val", {})).toBe("N/A");
      expect(defFn("Existing", "val", {})).toBe("Existing");
    });

    it("truncates strings with ellipsis", () => {
      const truncFn = truncate(10);
      expect(truncFn("Short", "desc", {})).toBe("Short");
      expect(truncFn("This is a very long text string", "desc", {})).toBe("This is a …");
    });
  });

  describe("Custom Transforms", () => {
    it("supports custom transformation functions", () => {
      const slugify = custom((val: string) =>
        String(val)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      );

      expect(slugify("Dongle DeFi Project v1", "slug", {})).toBe(
        "dongle-defi-project-v1"
      );
    });

    it("receives context containing key and entire form data", () => {
      const contextual = custom((val, key, allData) => {
        return `${allData.prefix || ""}${val}`;
      });

      expect(contextual("123", "id", { prefix: "STELLAR-" })).toBe("STELLAR-123");
    });
  });

  describe("Chainable Transforms", () => {
    it("chains transforms via chainTransforms", () => {
      const chained = chainTransforms(trim(), toLowerCase(), defaultTo("anon"));
      expect(chained("  ALICE@GMAIL.COM  ", "email", {})).toBe("alice@gmail.com");
      expect(chained("   ", "email", {})).toBe("anon");
    });

    it("chains transforms via fluent TransformPipeline builder", () => {
      const pipeline = TransformPipeline.create()
        .trim()
        .toLowerCase()
        .custom((val) => val.replace("@", "[at]"));

      expect(pipeline.apply("   ADMIN@STELLAR.ORG  ")).toBe("admin[at]stellar.org");
    });
  });

  describe("Applied on Submit", () => {
    it("applies field transforms to flat and nested form data", () => {
      const rawForm = {
        title: "  My DeFi App  ",
        email: "  DEVELOPER@TEST.COM  ",
        website: "https://example.com/  ",
        metadata: {
          category: "  DEFI  ",
          tags: [" stellar ", "crypto ", " stellar ", ""],
        },
      };

      const rules = {
        title: trim(),
        email: TransformPipeline.create().trim().toLowerCase(),
        website: trim(),
        "metadata.category": TransformPipeline.create().trim().toLowerCase(),
        "metadata.tags": TransformPipeline.create().compactArray().dedupeArray(),
      };

      const transformed = applyFieldTransforms(rawForm, rules);

      expect(transformed.title).toBe("My DeFi App");
      expect(transformed.email).toBe("developer@test.com");
      expect(transformed.website).toBe("https://example.com/");
      expect(transformed.metadata.category).toBe("defi");
      expect(transformed.metadata.tags).toEqual([" stellar ", "crypto "]);
    });

    it("wraps form submit handler with createTransformSubmitHandler", async () => {
      let finalSubmittedData: any = null;

      const onSubmit = async (data: any) => {
        finalSubmittedData = data;
        return { success: true };
      };

      const submitHandler = createTransformSubmitHandler(onSubmit, {
        name: trim(),
        amount: toNumber(),
      });

      const input = { name: "   Alice   ", amount: "100.50" };
      await submitHandler(input);

      expect(finalSubmittedData).toEqual({
        name: "Alice",
        amount: 100.5,
      });
    });
  });
});
