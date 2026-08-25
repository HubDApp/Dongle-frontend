const fs = require('fs');
let file = 'app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

let searchStr = '{pendingProjectReports.map((report) => {';
if (content.includes(searchStr) && !content.includes('{pendingProjectReports.length > 0 &&')) {
    content = content.replace(searchStr, '{pendingProjectReports.length > 0 && (\n                <div className="space-y-4 mt-8">\n                  ' + searchStr);
    fs.writeFileSync(file, content);
    console.log('✅ JSX block repaired!');
}
