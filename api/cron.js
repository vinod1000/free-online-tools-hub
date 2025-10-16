import { generateAndPublish } from './generate.js';

// Auto-run cron job (9 AM & 8 PM daily)
export default async function handler(req, res) {
  // Verify it's a cron request
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    console.log('🕒 Cron job triggered at:', new Date().toISOString());
    const result = await generateAndPublish();
    
    res.status(200).json({
      success: true,
      message: 'Blog post generated and published',
      result
    });
  } catch (error) {
    console.error('❌ Cron job failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
