const namingPatterns = [
  { directory: "services", pattern: /^(?:index|[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*\.service)\.ts$/ },
  { directory: "hooks", pattern: /^(?:index|use[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\.ts$/ },
  { directory: "utils", pattern: /^(?:index|[a-z0-9]+(?:-[a-z0-9]+)*\.util)\.ts$/ },
];

const fileNamingRule = {
  meta: {
    type: "problem",
    docs: { description: "enforce project file naming conventions" },
    schema: [],
  },
  create(context) {
    return {
      Program() {
        const filename = context.getFilename().replaceAll("\\", "/");
        const match = namingPatterns.find(({ directory }) => filename.includes(`/${directory}/`));
        if (!match) return;

        const basename = filename.slice(filename.lastIndexOf("/") + 1);
        if (!match.pattern.test(basename)) {
          context.report({
            message: `Files in ${match.directory}/ must match ${match.pattern}`,
            node: context.sourceCode.ast,
          });
        }
      },
    };
  },
};

export const fileNamingPlugin = {
  rules: {
    "file-naming": fileNamingRule,
  },
};
