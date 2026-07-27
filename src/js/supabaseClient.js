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
      ROOMS ( Room_ID, Room_number, Room_name, Floor, Room_type ),
      OFFICES ( Office_ID, Office_name, Weblinks ),
      FACILITIES ( Facility_ID, Facility_name )
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
  const cleanName = keyOrName.replace(/_building|_hall|_bldg/g, '').replace(/_/g, ' ').trim();

  const { data, error } = await supabase
    .from('BUILDINGS')
    .select(`
      Building_ID,
      Building_name,
      Description,
      Image_URL,
      Model_type,
      Status_type,
      ROOMS ( Room_ID, Room_number, Room_name, Floor, Room_type ),
      OFFICES ( Office_ID, Office_name, Weblinks ),
      FACILITIES ( Facility_ID, Facility_name )
    `)
    .ilike('Building_name', `%${cleanName}%`)
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0];
}

