const fs = require('fs');
let file = 'app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('ProjectReport')) {
    if (content.includes('@/types/project')) {
        // Append to existing project types import
        content = content.replace(/(import\s+\{)([^}]*)(\}\s+from\s+['"]@\/types\/project['"])/, (match, p1, p2, p3) => {
            return p1 + p2.trim() + ', ProjectReport ' + p3;
        });
    } else {
        // Create a new import at the top
        content = content.replace(/\"use client\";\s*/, '\"use client\";\nimport { ProjectReport } from \"@/types/project\";\n');
    }
    fs.writeFileSync(file, content);
    console.log('✅ Added ProjectReport import!');
}
