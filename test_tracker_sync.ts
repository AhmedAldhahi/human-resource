import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { TrackerService } from './apps/api/src/tracker/tracker.service';

async function testSync() {
  const config = new ConfigService({
    TRACKER_API_URL: process.env.TRACKER_API_URL || 'https://voadera-analytics-api.onrender.com',
    TRACKER_ADMIN_PASSWORD: process.env.TRACKER_ADMIN_PASSWORD || 'VoaderaHR2026',
  });

  const service = new TrackerService(config);

  console.log('Fetching employees from Tracker API...');
  const employees = await service.getEmployees();
  console.log(`Found ${employees.length} employees in Tracker API.`);

  const mahmoud = employees.find(
    (e: any) =>
      e.windowsId?.toLowerCase() === 'mahmoud salameh' ||
      e.name?.toLowerCase() === 'mahmoud salameh'
  );

  console.log('Mahmoud in Tracker API:', mahmoud);

  if (mahmoud) {
    console.log(`Syncing office status for Mahmoud (ID: ${mahmoud.id})...`);
    await service.syncOfficeStatus('Mahmoud salameh', true, new Date());
  }
}

testSync().catch((err) => console.error('SYNC ERROR:', err));
