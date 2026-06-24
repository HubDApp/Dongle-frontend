const { exec } = require('child_process');

// Documented exceptions for known vulnerabilities that cannot be resolved yet
// due to upstream framework constraints (e.g. Next.js 16/React 19 ecosystem).
const ALLOWED_EXCEPTIONS = {
  '@babel/core': {
    reason: 'DevDependency vulnerability in build toolchain (Arbitrary File Read via sourceMappingURL).',
    advisories: ['https://github.com/advisories/GHSA-4x5r-pxfx-6jf8']
  },
  'axios': {
    reason: 'Axios is a transitive dependency of third party APIs, not used directly in our main application.',
    advisories: [
      'https://github.com/advisories/GHSA-pjwm-pj3p-43mv',
      'https://github.com/advisories/GHSA-hfxv-24rg-xrqf',
      'https://github.com/advisories/GHSA-777c-7fjr-54vf',
      'https://github.com/advisories/GHSA-p92q-9vqr-4j8v',
      'https://github.com/advisories/GHSA-j5f8-grm9-p9fc',
      'https://github.com/advisories/GHSA-35jp-ww65-95wh',
      'https://github.com/advisories/GHSA-898c-q2cr-xwhg',
      'https://github.com/advisories/GHSA-654m-c8p4-x5fp'
    ]
  },
  'brace-expansion': {
    reason: 'Transitive devDependency (Large numeric range DoS).',
    advisories: ['https://github.com/advisories/GHSA-jxxr-4gwj-5jf2']
  },
  'form-data': {
    reason: 'Transitive dependency of other dev/build dependencies (CRLF injection).',
    advisories: ['https://github.com/advisories/GHSA-hmw2-7cc7-3qxx']
  },
  'js-yaml': {
    reason: 'Transitive dependency of eslint and other build dependencies (DoS in merge key handling).',
    advisories: ['https://github.com/advisories/GHSA-h67p-54hq-rp68']
  },
  'next': {
    reason: 'Next.js 16 is early/preview release and has some current unresolved dependencies/advisories that do not affect our static-ish development workflow.',
    advisories: [
      'https://github.com/advisories/GHSA-9g9p-9gw9-jx7f',
      'https://github.com/advisories/GHSA-h25m-26qc-wcjf',
      'https://github.com/advisories/GHSA-ggv3-7p47-pfv8',
      'https://github.com/advisories/GHSA-3x4c-7xq6-9pq8',
      'https://github.com/advisories/GHSA-h27x-g6w4-24gq',
      'https://github.com/advisories/GHSA-mq59-m269-xvcx',
      'https://github.com/advisories/GHSA-jcc7-9wpm-mj36',
      'https://github.com/advisories/GHSA-5f7q-jpqc-wp7h',
      'https://github.com/advisories/GHSA-q4gf-8mx6-v5v3',
      'https://github.com/advisories/GHSA-8h8q-6873-q5fj',
      'https://github.com/advisories/GHSA-26hh-7cqf-hhc6',
      'https://github.com/advisories/GHSA-3g8h-86w9-wvmq',
      'https://github.com/advisories/GHSA-ffhc-5mcf-pf4q',
      'https://github.com/advisories/GHSA-vfv6-92ff-j949',
      'https://github.com/advisories/GHSA-gx5p-jg67-6x7h',
      'https://github.com/advisories/GHSA-mg66-mrh9-m8jx',
      'https://github.com/advisories/GHSA-h64f-5h5j-jqjh',
      'https://github.com/advisories/GHSA-c4j6-fc7j-m34r',
      'https://github.com/advisories/GHSA-492v-c6pp-mqqv',
      'https://github.com/advisories/GHSA-wfc6-r584-vfw7',
      'https://github.com/advisories/GHSA-267c-6grr-h53f',
      'https://github.com/advisories/GHSA-36qx-fr4f-26g5'
    ]
  },
  'postcss': {
    reason: 'PostCSS is a development/build dependency; the XSS vulnerability does not affect the deployed static bundle.',
    advisories: ['https://github.com/advisories/GHSA-qx2v-qp2m-jg93']
  },
  'undici': {
    reason: 'Undici is a transitive dependency of Next.js for network requests; not exposed directly to users.',
    advisories: [
      'https://github.com/advisories/GHSA-vmh5-mc38-953g',
      'https://github.com/advisories/GHSA-p88m-4jfj-68fv',
      'https://github.com/advisories/GHSA-vxpw-j846-p89q',
      'https://github.com/advisories/GHSA-hm92-r4w5-c3mj',
      'https://github.com/advisories/GHSA-35p6-xmwp-9g52',
      'https://github.com/advisories/GHSA-g8m3-5g58-fq7m',
      'https://github.com/advisories/GHSA-pr7r-676h-xcf6'
    ]
  },
  'vite': {
    reason: 'Vite is a devDependency used for building/testing; the Server.fs.deny/launch-editor issues do not affect our production site.',
    advisories: [
      'https://github.com/advisories/GHSA-v6wh-96g9-6wx3',
      'https://github.com/advisories/GHSA-fx2h-pf6j-xcff'
    ]
  }
};

exec('npm audit --json', { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
  let auditResult;
  try {
    auditResult = JSON.parse(stdout);
  } catch (parseError) {
    console.error('Failed to parse npm audit output:', parseError);
    process.exit(1);
  }

  const vulnerabilities = auditResult.vulnerabilities || {};
  const unallowedVulnerabilities = [];

  for (const [pkgName, details] of Object.entries(vulnerabilities)) {
    const via = details.via || [];
    for (const item of via) {
      if (typeof item === 'object' && item.url) {
        const url = item.url;
        const exception = ALLOWED_EXCEPTIONS[pkgName];
        if (!exception || !exception.advisories.includes(url)) {
          unallowedVulnerabilities.push({
            package: pkgName,
            severity: details.severity || item.severity,
            title: item.title,
            url: url
          });
        }
      }
    }
  }

  if (unallowedVulnerabilities.length > 0) {
    console.error('\x1b[31m[ERROR] Security audit failed: Unresolved/unallowed vulnerabilities found:\x1b[0m');
    unallowedVulnerabilities.forEach(v => {
      console.error(`- ${v.package} (${v.severity}): ${v.title} - ${v.url}`);
    });
    console.error('\nIf these are known and acceptable exceptions, document them in dongle/scripts/audit-check.js and dongle/DEPENDENCY_POLICY.md.');
    process.exit(1);
  }

  console.log('\x1b[32m✓ Security audit passed (all vulnerabilities are either resolved or listed as documented exceptions).\x1b[0m');
  process.exit(0);
});
