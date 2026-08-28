import { type AxeResults } from "vitest-axe";

declare global {
  namespace Vi {
    interface Assertion {
      toHaveNoViolations(): void;
    }
  }
}

interface VitestAxeMatchers {
  toHaveNoViolations(): { message: () => string; pass: boolean };
  toHaveNoIncompleteViolations(): { message: () => string; pass: boolean };
}

expect.extend({
  toHaveNoViolations(received: AxeResults) {
    if (!received || typeof received.violations === "undefined") {
      return {
        message: () =>
          `Expected value to be an axe-results object with a 'violations' array, ` +
          `received ${String(received)}`,
        pass: false,
      };
    }

    const pass = received.violations.length === 0;

    if (pass) {
      return {
        message: () => "Expected to find accessibility violations, but none found",
        pass: true,
      };
    }

    const lineBreak = "\n     ";
    const summaryLines: string[] = [];

    for (const violation of received.violations) {
      summaryLines.push(
        `❌ [${violation.id}] ${violation.impact?.toUpperCase() ?? "UNKNOWN"} severity — ${violation.description}`,
      );
      summaryLines.push(`   Help: ${violation.helpUrl}`);
      for (const node of violation.nodes) {
        const selector = Array.isArray(node.target)
          ? node.target.join(" ")
          : String(node.target);
        const failures = node.any?.length
          ? node.any
              .map(
                (c: { message: string }) =>
                  `       • ${c.message.replace(/\s+/g, " ").trim()}`,
              )
              .join("\n")
          : "";
        summaryLines.push(
          `   On: ${selector}${failures ? lineBreak + failures : ""}`,
        );
      }
      summaryLines.push("");
    }

    const totalNodes = received.violations.reduce(
      (sum: number, v: { nodes: unknown[] }) => sum + v.nodes.length,
      0,
    );

    return {
      message: () =>
        `\n━━━ Accessibility Violations ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `${received.violations.length} rule(s) failed across ${totalNodes} DOM node(s)\n\n` +
        summaryLines.join("\n") +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`,
      pass: false,
    };
  },

  toHaveNoIncompleteViolations(received: AxeResults) {
    if (!received || typeof received.incomplete === "undefined") {
      return {
        message: () =>
          `Expected value to be an axe-results object with an 'incomplete' array, ` +
          `received ${String(received)}`,
        pass: false,
      };
    }

    const pass = received.incomplete.length === 0;

    if (pass) {
      return {
        message: () =>
          "Expected to find incomplete (needs-review) a11y findings, but none found",
        pass: true,
      };
    }

    const details = received.incomplete
      .map(
        (r: { id: string; description: string }) =>
          `  ⚠️  [${r.id}] ${r.description}`,
      )
      .join("\n");

    return {
      message: () =>
        `\n${received.incomplete.length} incomplete (manual review required) a11y findings:\n${details}\n`,
      pass: false,
    };
  },
} as unknown as VitestAxeMatchers);
