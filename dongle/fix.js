const fs = require('fs');

// 1. Fix ReportReviewModal.tsx
let p1 = 'components/reviews/ReportReviewModal.tsx';
let c1 = fs.readFileSync(p1, 'utf8');
c1 = c1.replace(/^[\s\S]*?(?=import React)/, '\"use client\";\nimport AddressDisplay from \"@/components/ui/AddressDisplay\";\n\n');
fs.writeFileSync(p1, c1);

// 2. Fix admin/page.tsx (Syntax error missing closing paren)
let p2 = 'app/admin/page.tsx';
let c2 = fs.readFileSync(p2, 'utf8');
c2 = c2.replace(/setProjectModerationLog\(projectReportService\.getModerationLog\(\)\);\s*\}/, 'setProjectModerationLog(projectReportService.getModerationLog());\n    }, 0);');
fs.writeFileSync(p2, c2);

// 3. Fix projects/[id]/page.tsx (Duplicate imports)
let p3 = 'app/projects/[id]/page.tsx';
let c3 = fs.readFileSync(p3, 'utf8');
// Fix duplicate lucide-react icons
c3 = c3.replace(/import \{([\s\S]*?)\} from "lucide-react";/, (match, p1) => {
    const imports = p1.split(',').map(s => s.trim()).filter(Boolean);
    const unique = [...new Set(imports)];
    return 'import {\n  ' + unique.join(',\n  ') + '\n} from \"lucide-react\";';
});
// Fix duplicate reviewReportService
let lines = c3.split('\n');
let seenService = false;
c3 = lines.filter(line => {
    if (line.includes('import { reviewReportService } from \"@/services/review/review-report.service\";')) {
        if (seenService) return false;
        seenService = true;
    }
    return true;
}).join('\n');
fs.writeFileSync(p3, c3);

console.log('✅ All files patched successfully!');
