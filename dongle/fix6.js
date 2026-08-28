const fs = require('fs');
let file = 'app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add the reviews state variable
if (!content.includes('const [reviews, setReviews]')) {
    content = content.replace(
        'const [expandedReport, setExpandedReport] = useState<string | null>(null);',
        'const [expandedReport, setExpandedReport] = useState<string | null>(null);\n  const [reviews, setReviews] = useState<Review[]>([]);'
    );
}

// 2. Fetch the reviews inside the useEffect
if (!content.includes('reviewService.getReviews()')) {
    content = content.replace(
        'setProjectModerationLog(projectReportService.getModerationLog());',
        'setProjectModerationLog(projectReportService.getModerationLog());\n      reviewService.getReviews().then(setReviews).catch(() => {});'
    );
}

// 3. Fix the lookup function
content = content.replace(
    /return reviewsById\[reviewId\];/,
    'return reviews.find(r => r.id === reviewId);'
);

fs.writeFileSync(file, content);
console.log('✅ State, fetch, and function updated!');
