import { createClient } from '@supabase/supabase-js';

// Load environment variables configured in .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT_REF.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper to extract 3D Model URL from a Supabase building object.
 * Checks all possible column name variations flexibly.
 * @param {object} dbBuilding 
 * @param {string|null} fallbackUrl 
 */
export function extractModelUrl(dbBuilding, fallbackUrl = null) {
  if (!dbBuilding || typeof dbBuilding !== 'object') return fallbackUrl;

  const candidateKeys = [
    'Model_URL', 'model_url', 'Model_Url', 'MODEL_URL',
    'Model_path', 'model_path', 'Model_Path', 'MODEL_PATH',
    'Model_3d', 'model_3d', 'Model_3D', 'model_3D', 'MODEL_3D',
    'Model_3D_URL', 'model_3d_url', 'Model_3d_url', '3D_Model_URL',
    '3d_model_url', '3D_Model', '3d_model', '3D_MODEL',
    'Glb_URL', 'glb_url', 'GLB_URL', 'glb_path', 'GLB_PATH',
    'Model_link', 'model_link', 'Model_Link',
    'Model_file', 'model_file', 'Model_File',
    '3D_Model_Path', '3d_model_path',
    'Model', 'model', 'glb', 'GLB'
  ];

  for (const key of candidateKeys) {
    if (dbBuilding[key] && typeof dbBuilding[key] === 'string' && dbBuilding[key].trim() !== '') {
      const val = dbBuilding[key].trim();
      if (val !== 'null' && val !== 'undefined') return val;
    }
  }

  // Scan all keys if not matched by standard names
  for (const [k, v] of Object.entries(dbBuilding)) {
    if (typeof v === 'string' && v.trim() !== '') {
      const lk = k.toLowerCase();
      const val = v.trim();
      if ((lk.includes('model') || lk.includes('glb') || lk.includes('3d')) &&
          (val.endsWith('.glb') || val.endsWith('.gltf') || val.includes('.glb?') || val.includes('/models/') || val.startsWith('http') || val.startsWith('/'))) {
        return val;
      }
    }
  }

  return fallbackUrl;
}

/**
 * Helper to fetch a building with all its nested rooms, offices, and facilities
 * @param {number} buildingId 
 */
export async function getBuildingDetails(buildingId) {
  const { data, error } = await supabase
    .from('BUILDINGS')
    .select(`
      *,
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

  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const keyNorm = norm(keyOrName);

  const cleanName = keyOrName
    .replace(/_building|_hall|_bldg/gi, '')
    .replace(/[_-]/g, ' ')
    .trim();

  const firstWord = cleanName.split(' ').filter(w => w.length > 1)[0] || cleanName;
  const cleanNorm = norm(cleanName);
  const firstNorm = norm(firstWord);

  console.log(`[Supabase] Looking up building — key: "${keyOrName}" | cleanName: "${cleanName}"`);

  // Fetch all buildings with full nested details
  const { data: allBuildings, error } = await supabase
    .from('BUILDINGS')
    .select(`
      *,
      ROOMS ( Room_ID, Room_number, Room_name, Floor ),
      OFFICES ( Office_ID, Office_name, Abbreviations, Room_number, Floor ),
      FACILITIES ( Facility_ID, Facility_name, Abbreviations, Room_number, Floor )
    `);

  if (error || !allBuildings || !allBuildings.length) {
    console.error('[Supabase] Error fetching buildings list:', error);
    return null;
  }

  // 1. Exact normalized match or containment
  let matched = allBuildings.find(b => {
    const nameNorm = norm(b.Building_name);
    return nameNorm === keyNorm || nameNorm.includes(keyNorm) || keyNorm.includes(nameNorm);
  });

  // 2. Clean name or first word match
  if (!matched) {
    matched = allBuildings.find(b => {
      const nameNorm = norm(b.Building_name);
      return (cleanNorm && (nameNorm.includes(cleanNorm) || cleanNorm.includes(nameNorm))) ||
             (firstNorm && (nameNorm.includes(firstNorm) || firstNorm.includes(nameNorm)));
    });
  }

  if (matched) {
    console.log(`[Supabase] ✅ Matched building: [${matched.Building_ID}] ${matched.Building_name}`);
    return matched;
  }

  console.warn(`[Supabase] ❌ No building matched for key "${keyOrName}"`);
  return null;
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




