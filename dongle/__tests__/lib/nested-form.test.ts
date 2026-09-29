import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  parsePath,
  getNestedValue,
  setNestedValue,
  deleteNestedValue,
  hasNestedPath,
  flattenFormData,
  unflattenFormData,
  validateNestedForm,
  insertNestedArrayItem,
  removeNestedArrayItem,
  createNestedSubmitHandler,
} from "@/lib/nested-form";

describe("Nested Form Support (Issue #506)", () => {
  describe("Path Parsing & Accessors", () => {
    it("parses dot and bracket notation paths correctly", () => {
      expect(parsePath("user.profile.name")).toEqual(["user", "profile", "name"]);
      expect(parsePath("links[0].url")).toEqual(["links", 0, "url"]);
      expect(parsePath("teams[1].members[2].id")).toEqual(["teams", 1, "members", 2, "id"]);
      expect(parsePath("items.0.title")).toEqual(["items", 0, "title"]);
    });

    it("gets nested values across objects and arrays", () => {
      const data = {
        title: "Test Project",
        author: {
          name: "Alice",
          contact: { email: "alice@example.com" },
        },
        links: [
          { label: "Website", url: "https://example.com" },
          { label: "Docs", url: "https://docs.example.com" },
        ],
      };

      expect(getNestedValue(data, "author.name")).toBe("Alice");
      expect(getNestedValue(data, "author.contact.email")).toBe("alice@example.com");
      expect(getNestedValue(data, "links[0].url")).toBe("https://example.com");
      expect(getNestedValue(data, "links[1].label")).toBe("Docs");
      expect(getNestedValue(data, "links[99].url", "default")).toBe("default");
      expect(getNestedValue(data, "missing.path", undefined)).toBeUndefined();
    });

    it("sets nested values immutably and creates intermediate levels", () => {
      const initial = { title: "Original" };
      const updated = setNestedValue(initial, "metadata.author.profile.city", "Berlin");

      expect(updated).toEqual({
        title: "Original",
        metadata: {
          author: {
            profile: {
              city: "Berlin",
            },
          },
        },
      });
      // Verify immutability
      expect((initial as any).metadata).toBeUndefined();
    });

    it("sets nested values within arrays", () => {
      const initial = { links: [{ url: "https://a.com" }] };
      const updated = setNestedValue(initial, "links[1].url", "https://b.com");

      expect(updated.links.length).toBe(2);
      expect(updated.links[1].url).toBe("https://b.com");
    });

    it("checks whether paths exist using hasNestedPath", () => {
      const data = { config: { active: false, flags: [true, false] } };
      expect(hasNestedPath(data, "config.active")).toBe(true);
      expect(hasNestedPath(data, "config.flags[1]")).toBe(true);
      expect(hasNestedPath(data, "config.flags[5]")).toBe(false);
      expect(hasNestedPath(data, "config.missing")).toBe(false);
    });

    it("deletes nested properties and array elements", () => {
      const data = {
        user: { name: "Bob", temp: "delete_me" },
        items: ["first", "second", "third"],
      };

      const deletedProp = deleteNestedValue(data, "user.temp");
      expect((deletedProp.user as any).temp).toBeUndefined();
      expect(deletedProp.user.name).toBe("Bob");

      const deletedItem = deleteNestedValue(deletedProp, "items[1]");
      expect(deletedItem.items).toEqual(["first", "third"]);
    });
  });

  describe("Flattening & Unflattening Form Data on Submit", () => {
    it("flattens deeply nested objects and arrays into dot/bracket notation", () => {
      const complexData = {
        title: "Dongle DEX",
        metadata: {
          category: "defi",
          tags: ["soroban", "stellar"],
          contact: {
            email: "team@dongle.io",
            social: {
              github: "https://github.com/dongle",
            },
          },
        },
        links: [
          { name: "App", href: "https://app.dongle.io" },
          { name: "Docs", href: "https://docs.dongle.io" },
        ],
      };

      const flattened = flattenFormData(complexData);

      expect(flattened["title"]).toBe("Dongle DEX");
      expect(flattened["metadata.category"]).toBe("defi");
      expect(flattened["metadata.tags[0]"]).toBe("soroban");
      expect(flattened["metadata.tags[1]"]).toBe("stellar");
      expect(flattened["metadata.contact.email"]).toBe("team@dongle.io");
      expect(flattened["metadata.contact.social.github"]).toBe("https://github.com/dongle");
      expect(flattened["links[0].name"]).toBe("App");
      expect(flattened["links[0].href"]).toBe("https://app.dongle.io");
      expect(flattened["links[1].name"]).toBe("Docs");
      expect(flattened["links[1].href"]).toBe("https://docs.dongle.io");
    });

    it("supports dot notation for array indices when requested", () => {
      const data = {
        tags: ["a", "b"],
      };
      const flattened = flattenFormData(data, { arrayNotation: "dot" });
      expect(flattened["tags.0"]).toBe("a");
      expect(flattened["tags.1"]).toBe("b");
    });

    it("unflattens flattened data back to original nested structure", () => {
      const flat = {
        title: "Test",
        "author.name": "Alice",
        "author.email": "alice@test.com",
        "links[0].title": "Docs",
        "links[0].url": "https://docs.com",
        "links[1].title": "Code",
        "links[1].url": "https://github.com",
      };

      const unflattened = unflattenFormData(flat);

      expect(unflattened).toEqual({
        title: "Test",
        author: {
          name: "Alice",
          email: "alice@test.com",
        },
        links: [
          { title: "Docs", url: "https://docs.com" },
          { title: "Code", url: "https://github.com" },
        ],
      });
    });
  });

  describe("Schema Validation with Nested Objects & Arrays", () => {
    const complexFormSchema = z.object({
      projectName: z.string().min(3, "Project name must have at least 3 characters"),
      details: z.object({
        website: z.string().url("Must be a valid URL"),
        maintainer: z.object({
          email: z.string().email("Must be a valid email address"),
        }),
      }),
      contracts: z
        .array(
          z.object({
            network: z.enum(["testnet", "mainnet"]),
            address: z.string().min(5, "Address too short"),
          })
        )
        .min(1, "At least one contract required"),
    });

    it("validates valid complex structures successfully", () => {
      const validData = {
        projectName: "Stellar Horizon",
        details: {
          website: "https://horizon.stellar.org",
          maintainer: {
            email: "dev@stellar.org",
          },
        },
        contracts: [
          { network: "testnet", address: "CAAAA12345" },
        ],
      };

      const result = validateNestedForm(validData, complexFormSchema);
      expect(result.success).toBe(true);
      expect(result.errors).toEqual({});
      expect(result.data).toEqual(validData);
    });

    it("maps validation errors to nested dot and bracket paths accurately", () => {
      const invalidData = {
        projectName: "No", // too short
        details: {
          website: "not-a-url", // invalid url
          maintainer: {
            email: "invalid-email", // invalid email
          },
        },
        contracts: [
          { network: "invalid-network" as any, address: "short" },
          { network: "testnet", address: "C" }, // too short
        ],
      };

      const result = validateNestedForm(invalidData, complexFormSchema);
      expect(result.success).toBe(false);
      expect(result.errors["projectName"]).toBe("Project name must have at least 3 characters");
      expect(result.errors["details.website"]).toBe("Must be a valid URL");
      expect(result.errors["details.maintainer.email"]).toBe("Must be a valid email address");
      expect(result.errors["contracts[1].address"]).toBe("Address too short");
    });
  });

  describe("Nested Array Manipulation Helpers", () => {
    it("inserts items at the end or specific index", () => {
      const form = {
        team: {
          members: [{ name: "Alice" }],
        },
      };

      const addedEnd = insertNestedArrayItem(form, "team.members", { name: "Bob" });
      expect(addedEnd.team.members.length).toBe(2);
      expect(addedEnd.team.members[1].name).toBe("Bob");

      const addedMiddle = insertNestedArrayItem(addedEnd, "team.members", { name: "Charlie" }, 1);
      expect(addedMiddle.team.members[1].name).toBe("Charlie");
      expect(addedMiddle.team.members.length).toBe(3);
    });

    it("removes items from nested arrays by index", () => {
      const form = {
        tags: ["stellar", "crypto", "soroban"],
      };

      const removed = removeNestedArrayItem(form, "tags", 1);
      expect(removed.tags).toEqual(["stellar", "soroban"]);
    });
  });

  describe("createNestedSubmitHandler", () => {
    it("flattens form data on submit when flatten option is true", async () => {
      let submittedPayload: any = null;
      const onSubmit = async (data: any) => {
        submittedPayload = data;
        return { ok: true };
      };

      const handler = createNestedSubmitHandler(onSubmit, {
        flatten: true,
      });

      const input = {
        author: { username: "hunter" },
        tokens: ["XLM", "USDC"],
      };

      const res = await handler(input);
      expect(res.success).toBe(true);
      expect(submittedPayload["author.username"]).toBe("hunter");
      expect(submittedPayload["tokens[0]"]).toBe("XLM");
      expect(submittedPayload["tokens[1]"]).toBe("USDC");
    });

    it("halts submission and returns errors if schema validation fails", async () => {
      let submitted = false;
      const schema = z.object({
        user: z.object({ age: z.number().min(18, "Must be at least 18") }),
      });

      const handler = createNestedSubmitHandler(async () => {
        submitted = true;
      }, { schema });

      const res = await handler({ user: { age: 12 } });
      expect(res.success).toBe(false);
      expect(res.errors?.["user.age"]).toBe("Must be at least 18");
      expect(submitted).toBe(false);
    });
  });
});
