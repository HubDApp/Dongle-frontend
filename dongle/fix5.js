const fs = require('fs');
let file = 'app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { ProjectReport')) {
    content = content.replace(/\"use client\";\r?\n?/, '\"use client\";\nimport { ProjectReport, ProjectClaimRequest, ProjectModerationAction } from \"@/types/project\";\n');
    fs.writeFileSync(file, content);
    console.log('✅ Added missing project types!');
}
