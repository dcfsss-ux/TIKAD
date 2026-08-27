import { createClient } from '@supabase/supabase-js';

// Load environment variables configured in .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT_REF.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper to fetch a building with all its nested rooms, offices, and facilities
 * @param {number} buildingId 
 */
export async function getBuildingDetails(buildingId) {
  const { data, error } = await supabase
    .from('BUILDINGS')
    .select(`
      Building_ID,
      Building_name,
      Description,
      Image_URL,
      Model_type,
      Status_type,
      ROOMS ( Room_ID, Room_number, Room_name, Floor ),
      OFFICES ( Office_ID, Office_name, Abbreviations, Room_number, Floor ),
      FACILITIES ( Facility_ID, Facility_name, Abbreviations, Room_number, Floor )
    `)
    .eq('Building_ID', buildingId)
    .single();

  if (error) {
    console.error('Error fetching building details:', error);
    return null;
  }

  return data;
}

/**
 * Helper to fetch all campus buildings
 */
export async function getAllBuildings() {
  const { data, error } = await supabase
    .from('BUILDINGS')
    .select('*')
    .order('Building_ID', { ascending: true });

  if (error) {
    console.error('Error fetching buildings:', error);
    return [];
  }

  return data;
}

/**
 * Helper to fetch building data dynamically by matching name or mesh key
 * @param {string} keyOrName 
 */
export async function getBuildingByNameOrKey(keyOrName) {
  if (!keyOrName) return null;

  // Build multiple search variants from the mesh key
  const cleanName = keyOrName
    .replace(/_building|_hall|_bldg/g, '')
    .replace(/_/g, ' ')
    .trim();

  // Also try first meaningful word (e.g. "ced" from "ced building")
  const firstWord = cleanName.split(' ').filter(w => w.length > 1)[0] || cleanName;

  console.log(`[Supabase] Looking up building — key: "${keyOrName}" | cleanName: "${cleanName}" | firstWord: "${firstWord}"`);

  const SELECT_FRAGMENT = `
    Building_ID,
    Building_name,
    Description,
    Image_URL,
    Model_type,
    Status_type,
    ROOMS ( Room_ID, Room_number, Room_name, Floor ),
    OFFICES ( Office_ID, Office_name, Abbreviations, Room_number, Floor ),
    FACILITIES ( Facility_ID, Facility_name, Abbreviations, Room_number, Floor )
  `;

  // ── Try 1: match cleanName (e.g. "ced") ──────────────────────────────
  const { data: d1, error: e1 } = await supabase
    .from('BUILDINGS')
    .select(SELECT_FRAGMENT)
    .ilike('Building_name', `%${cleanName}%`)
    .limit(1);

  if (e1) console.error('[Supabase] ilike error (cleanName):', e1);

  if (d1 && d1.length > 0) {
    console.log(`[Supabase] ✅ Matched by cleanName "${cleanName}":`, d1[0].Building_name);
    return d1[0];
  }

  // ── Try 2: match firstWord only ────────────────────────────────────────
  if (firstWord !== cleanName) {
    const { data: d2, error: e2 } = await supabase
      .from('BUILDINGS')
      .select(SELECT_FRAGMENT)
      .ilike('Building_name', `%${firstWord}%`)
      .limit(1);

    if (e2) console.error('[Supabase] ilike error (firstWord):', e2);

    if (d2 && d2.length > 0) {
      console.log(`[Supabase] ✅ Matched by firstWord "${firstWord}":`, d2[0].Building_name);
      return d2[0];
    }
  }

  // ── Try 3: fetch ALL buildings and fuzzy-match client-side ──────────────
  console.warn(`[Supabase] ⚠️ No direct match found for "${cleanName}". Trying client-side fuzzy match…`);

  const { data: allBuildings, error: allErr } = await supabase
    .from('BUILDINGS')
    .select('Building_ID, Building_name');

  if (allErr) {
    console.error('[Supabase] Error fetching all buildings:', allErr);
    return null;
  }

  console.log('[Supabase] All buildings in DB:', allBuildings?.map(b => `[${b.Building_ID}] ${b.Building_name}`));

  const keyNorm = keyOrName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const matched = allBuildings?.find(b => {
    const nameNorm = b.Building_name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return nameNorm.includes(keyNorm) || keyNorm.includes(nameNorm) ||
           nameNorm.includes(firstWord) || firstWord.includes(nameNorm);
  });

  if (!matched) {
    console.warn(`[Supabase] ❌ No building matched for key "${keyOrName}"`);
    return null;
  }

  console.log(`[Supabase] ✅ Fuzzy-matched: [${matched.Building_ID}] ${matched.Building_name}`);

  // Fetch full details for the matched building by ID
  return getBuildingDetails(matched.Building_ID);
}

/**
 * Search across ROOMS, OFFICES, FACILITIES, and BUILDINGS dynamically
 * @param {string} query 
 */
export async function searchCampusEntities(query) {
  if (!query || query.trim().length === 0) {
    return { buildings: [], rooms: [], offices: [], facilities: [] };
  }

  const trimmed = query.trim();
  // Double quotes are required inside PostgREST .or() filters when strings contain spaces
  const q = `"%${trimmed}%"`;

  // Search Rooms with parent Building
  const roomsPromise = supabase
    .from('ROOMS')
    .select('*, BUILDINGS ( Building_ID, Building_name )')
    .or(`Room_number.ilike.${q},Room_name.ilike.${q}`)
    .limit(8);

  // Search Offices with parent Building
  const officesPromise = supabase
    .from('OFFICES')
    .select('*, BUILDINGS ( Building_ID, Building_name )')
    .ilike('Office_name', `%${trimmed}%`)
    .limit(8);

  // Search Facilities with parent Building
  const facilitiesPromise = supabase
    .from('FACILITIES')
    .select('*, BUILDINGS ( Building_ID, Building_name )')
    .ilike('Facility_name', `%${trimmed}%`)
    .limit(8);

  // Search Buildings
  const buildingsPromise = supabase
    .from('BUILDINGS')
    .select('*')
    .ilike('Building_name', `%${trimmed}%`)
    .limit(8);

  const [roomsRes, officesRes, facilitiesRes, buildingsRes] = await Promise.all([
    roomsPromise,
    officesPromise,
    facilitiesPromise,
    buildingsPromise
  ]);

  if (roomsRes.error) console.error('Rooms search error:', roomsRes.error);
  if (officesRes.error) console.error('Offices search error:', officesRes.error);
  if (facilitiesRes.error) console.error('Facilities search error:', facilitiesRes.error);
  if (buildingsRes.error) console.error('Buildings search error:', buildingsRes.error);

  return {
    rooms: roomsRes.data || [],
    offices: officesRes.data || [],
    facilities: facilitiesRes.data || [],
    buildings: buildingsRes.data || []
  };
}

/**
 * Fetch building data with college seal URLs (Logo_URL) from Supabase.
 * Queries 'buildings' or 'BUILDINGS' table including Logo_URL.
 */
export async function fetchBuildingSeals() {
  try {
    // Primary query: 'BUILDINGS' table (upper-case), with fallback to 'buildings' (lower-case)
    let { data: buildings, error } = await supabase
      .from('BUILDINGS')
      .select('Building_ID, Building_name, Logo_URL');

    if (!error && buildings && buildings.length > 0) {
      return buildings.map(b => ({
        id: b.Building_ID,
        name: b.Building_name,
        Logo_URL: (b.Logo_URL && typeof b.Logo_URL === 'string' && b.Logo_URL.trim() !== '') ? b.Logo_URL.trim() : null
      }));
    }

    // Fallback: lower-case 'buildings'
    const res = await supabase
      .from('buildings')
      .select('id, name, Logo_URL, logo_url');

    if (!res.error && res.data && res.data.length > 0) {
      return res.data.map(b => ({
        id: b.id,
        name: b.name,
        Logo_URL: (b.Logo_URL || b.logo_url) && typeof (b.Logo_URL || b.logo_url) === 'string' ? (b.Logo_URL || b.logo_url).trim() : null
      }));
    }

    if (error) console.error('Failed to load buildings from Supabase:', error);
    return [];
  } catch (err) {
    console.error('Failed to load buildings from Supabase:', err);
    return [];
  }
}




