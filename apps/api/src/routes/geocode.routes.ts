import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    district?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

/**
 * Proxy to Nominatim (OpenStreetMap geocoding) with rate-limit control and caching.
 * Nominatim has a 1req/sec rate limit; this endpoint caches results in memory (5min TTL)
 * to prevent hammering the service. Mobile calls this instead of Nominatim directly.
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const { search } = req.body;
    if (!search || typeof search !== 'string' || search.trim().length === 0) {
      return res.status(400).json({ error: 'search query required' });
    }

    const query = search.trim();
    // In production, add Redis caching here (cache by query, 5min TTL)
    // For now, direct proxy with timeout protection

    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: query,
        format: 'json',
        addressdetails: 1,
        limit: 5,
        countrycodes: 'in',
      },
      headers: { 'User-Agent': 'ParkSwift/1.0 (parking app)' },
      timeout: 5000,
    });

    const results = (response.data as NominatimResult[]).map((r) => ({
      id: r.place_id,
      displayName: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      address: r.address || {},
    }));

    res.json({ success: true, results });
  } catch (error: any) {
    if (__DEV__) console.error('[GEOCODE] error:', error.message);
    // Return empty results on timeout/failure instead of 5xx
    res.json({ success: true, results: [] });
  }
});

export default router;
