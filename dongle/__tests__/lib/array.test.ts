/**
 * Unit tests for array utility functions
 */

import { describe, it, expect } from "vitest";
import { unique, compact, chunk, groupBy } from "@/lib/array";

describe("Array Utilities", () => {
  describe("unique", () => {
    it("should remove duplicate values", () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(unique(["a", "b", "a", "c"])).toEqual(["a", "b", "c"]);
    });

    it("should preserve order of first occurrence", () => {
      expect(unique([3, 1, 3, 2, 1])).toEqual([3, 1, 2]);
    });

    it("should handle empty array", () => {
      expect(unique([])).toEqual([]);
    });

    it("should handle array with no duplicates", () => {
      expect(unique([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it("should work with objects based on reference", () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 1 };
      const arr = [obj1, obj2, obj1];
      const result = unique(arr);
      expect(result).toContain(obj1);
      expect(result).toContain(obj2);
      expect(result.length).toBe(2);
    });

    it("should return a new array", () => {
      const original = [1, 2, 3];
      const result = unique(original);
      expect(result).not.toBe(original);
    });
  });

  describe("compact", () => {
    it("should remove falsy values", () => {
      expect(compact([1, null, 2, undefined, 3])).toEqual([1, 2, 3]);
      expect(compact([true, false, "hello", ""])).toEqual([true, "hello"]);
    });

    it("should remove null and undefined", () => {
      expect(compact([1, null, 2, undefined])).toEqual([1, 2]);
    });

    it("should remove empty strings", () => {
      expect(compact(["hello", "", "world"])).toEqual(["hello", "world"]);
    });

    it("should remove false", () => {
      expect(compact([true, false, true])).toEqual([true, true]);
    });

    it("should keep 0", () => {
      expect(compact([0, 1, 2])).toEqual([0, 1, 2]);
    });

    it("should handle empty array", () => {
      expect(compact([])).toEqual([]);
    });

    it("should handle array with all falsy values", () => {
      expect(compact([null, undefined, false, ""])).toEqual([]);
    });

    it("should handle arrays with objects", () => {
      const obj = { id: 1 };
      expect(compact([obj, null, { id: 2 }])).toEqual([obj, { id: 2 }]);
    });
  });

  describe("chunk", () => {
    it("should split array into chunks of specified size", () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    });

    it("should handle chunk size equal to array length", () => {
      expect(chunk([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
    });

    it("should handle chunk size larger than array length", () => {
      expect(chunk([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
    });

    it("should handle empty array", () => {
      expect(chunk([], 2)).toEqual([]);
    });

    it("should handle chunk size of 1", () => {
      expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
    });

    it("should throw for invalid chunk size", () => {
      expect(() => chunk([1, 2, 3], 0)).toThrow();
      expect(() => chunk([1, 2, 3], -1)).toThrow();
      expect(() => chunk([1, 2, 3], 1.5)).toThrow();
      expect(() => chunk([1, 2, 3], NaN)).toThrow();
    });

    it("should work with strings", () => {
      expect(chunk(["a", "b", "c", "d"], 2)).toEqual([["a", "b"], ["c", "d"]]);
    });

    it("should work with objects", () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      expect(chunk(items, 2)).toEqual([[{ id: 1 }, { id: 2 }], [{ id: 3 }]]);
    });
  });

  describe("groupBy", () => {
    it("should group items by key", () => {
      const items = [
        { category: "a", value: 1 },
        { category: "b", value: 2 },
        { category: "a", value: 3 },
      ];
      const grouped = groupBy(items, (item) => item.category);
      expect(grouped).toEqual({
        a: [
          { category: "a", value: 1 },
          { category: "a", value: 3 },
        ],
        b: [{ category: "b", value: 2 }],
      });
    });

    it("should group by primitive values", () => {
      const items = ["apple", "apricot", "banana", "blueberry"];
      const grouped = groupBy(items, (item) => item[0]);
      expect(grouped).toEqual({
        a: ["apple", "apricot"],
        b: ["banana", "blueberry"],
      });
    });

    it("should handle empty array", () => {
      const grouped = groupBy([], (item: any) => item.id);
      expect(grouped).toEqual({});
    });

    it("should handle single group", () => {
      const items = [
        { type: "a", value: 1 },
        { type: "a", value: 2 },
      ];
      const grouped = groupBy(items, (item) => item.type);
      expect(grouped).toEqual({
        a: items,
      });
    });

    it("should handle numeric keys", () => {
      const items = [
        { priority: 1, task: "high" },
        { priority: 2, task: "medium" },
        { priority: 1, task: "urgent" },
      ];
      const grouped = groupBy(items, (item) => item.priority);
      expect(grouped).toEqual({
        1: [
          { priority: 1, task: "high" },
          { priority: 1, task: "urgent" },
        ],
        2: [{ priority: 2, task: "medium" }],
      });
    });

    it("should handle function returning different types", () => {
      const items = ["a", "b", "c"];
      const grouped = groupBy(items, (item) => item.length);
      expect(grouped).toEqual({
        1: ["a", "b", "c"],
      });
    });

    it("should preserve order within groups", () => {
      const items = [
        { category: "b", id: 1 },
        { category: "a", id: 2 },
        { category: "b", id: 3 },
        { category: "a", id: 4 },
      ];
      const grouped = groupBy(items, (item) => item.category);
      expect(grouped.b).toEqual([
        { category: "b", id: 1 },
        { category: "b", id: 3 },
      ]);
      expect(grouped.a).toEqual([
        { category: "a", id: 2 },
        { category: "a", id: 4 },
      ]);
    });
  });
});
