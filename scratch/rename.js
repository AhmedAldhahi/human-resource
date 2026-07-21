const fs = require('fs');
const path = require('path');

const files = [
  'apps/api/src/tracker/tracker.service.ts',
  'libs/shared/src/lib/shared.ts',
  'apps/web/src/api/client.ts',
  'apps/web/src/components/EmployeeHoursModal.tsx',
  'apps/web/src/components/EmployeeWageModal.tsx',
  'apps/web/src/pages/TrackerPage.tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace exactly matching case-sensitive words
    content = content.replace(/Voadera/g, 'Tracker');
    content = content.replace(/voadera/g, 'tracker');
    content = content.replace(/VOADERA/g, 'TRACKER');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
