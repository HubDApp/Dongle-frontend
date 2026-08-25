const fs = require('fs');
let file = 'app/projects/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Remove the redundant authorAddress line in the payload
content = content.replace(/\s*authorAddress:\s*gate\.publicKey,?\s*/, '\n');

fs.writeFileSync(file, content);
console.log('✅ Removed redundant authorAddress property!');
