/**
 * mapOverlay.js  –  GIYA 3D Map Integration
 *
 * Boots the Three.js Experience engine into .experience-canvas when the user
 * first clicks "Launch Map". All subsequent opens just toggle visibility.
 * The existing TIKAD map overlay HTML (#map-overlay, #info-panel, #map-search)
 * is reused — only the canvas area has changed.
 */

import * as THREE from 'three';
import Experience from '../../Experience/Experience.js';
import { openBuildingViewer, closeBuildingViewer } from './buildingViewer.js';
import { initNavigation, handleBuildingRoute, handleCategorizedRoute, hasCategorizedRoutes, clearRouteHighlight, hasActiveRoute, getActiveRouteCategory } from './interactionHandler.js';
import {
  getBuildingByNameOrKey,
  searchCampusEntities,
  fetchBuildingSeals,
  extractModelUrl,
  getAllBuildings,
  getBuildingDetails
} from './supabaseClient.js';

/**
 * Sync 3D Model URLs for all buildings from Supabase into BUILDING_DATA
 */
async function _syncSupabaseModels() {
  try {
    const allDbBuildings = await getAllBuildings();
    if (!allDbBuildings || !allDbBuildings.length) return;

    console.log(`[MapOverlay] 🔄 Syncing 3D model URLs from Supabase (${allDbBuildings.length} buildings)...`);

    const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    allDbBuildings.forEach(dbB => {
      const modelUrl = extractModelUrl(dbB);
      const logoUrl = dbB.Logo_URL || dbB.logo_url;
      const dbNameNorm = norm(dbB.Building_name);

      for (const [key, bData] of Object.entries(BUILDING_DATA)) {
        let isMatch = false;

        // 1. Match by supabaseId
        if (bData.supabaseId && bData.supabaseId === dbB.Building_ID) {
          isMatch = true;
        }

        // 2. Match by key
        const keyNorm = norm(key);
        if (!isMatch && keyNorm && (dbNameNorm.includes(keyNorm) || keyNorm.includes(dbNameNorm))) {
          isMatch = true;
        }

        // 3. Match by supabaseNames
        if (!isMatch && bData.supabaseNames && dbNameNorm) {
          isMatch = bData.supabaseNames.some(sn => {
            const snNorm = norm(sn);
            return snNorm === dbNameNorm || dbNameNorm.includes(snNorm) || snNorm.includes(dbNameNorm);
          });
        }

        // 4. Match by name or shortName or abbrev
        if (!isMatch && dbNameNorm) {
          const nameNorm = norm(bData.name);
          const sNameNorm = norm(bData.shortName);
          const abbrevNorm = norm(bData.abbrev);

          if ((nameNorm && (dbNameNorm.includes(nameNorm) || nameNorm.includes(dbNameNorm))) ||
            (sNameNorm && (dbNameNorm.includes(sNameNorm) || sNameNorm.includes(dbNameNorm))) ||
            (abbrevNorm && (dbNameNorm.includes(abbrevNorm) || abbrevNorm.includes(dbNameNorm)))) {
            isMatch = true;
          }
        }

        if (isMatch) {
          if (modelUrl) bData.model3d = modelUrl;
          if (logoUrl) {
            bData.Logo_URL = logoUrl;
            bData.logo = logoUrl;
          }
          if (!bData.supabaseId && dbB.Building_ID) {
            bData.supabaseId = dbB.Building_ID;
          }
          console.log(`[MapOverlay] ✅ Synced Supabase data for "${bData.name}":`, { modelUrl, logoUrl });
        }
      }
    });
  } catch (err) {
    console.warn('[MapOverlay] Could not sync Supabase 3D models:', err);
  }
}



const BUILDING_DATA = {
  // ── INTERACTIVE BUILDINGS (clickable pins, info cards populated from Supabase) ──
  "masawa_building": {
    glbName: "MASAWA HALL",
    name: "Masawa Hall", shortName: "Masawa", abbrev: "Masawa", emoji: "🏫",
    desc: "Main academic building housing executive offices, college departments, multi-purpose lecture halls, and administrative services.",
    depts: [
      { name: "Dean's Office", sub: "Floor 1", icon: "🏢" },
      { name: "Academic Affairs & Student Records", sub: "Floor 1", icon: "📋" },
      { name: "Faculty Offices & Conference Hall", sub: "Floor 2", icon: "💼" },
      { name: "Lecture Rooms 101-105", sub: "Floor 1-2", icon: "🏫" }
    ],
    contact: { phone: "(085) 341-2786", email: "masawa@csu.edu.ph" },
    supabaseId: 12,
    supabaseNames: ['Masawa Hall', 'Masawa Building', 'Masawa', 'MASAWA_HALL', 'MASAWA HALL'],
    gradient: "linear-gradient(135deg, #1a3a5c 0%, #2d6a9f 100%)"
  },
  "hinang_building": {
    glbName: "HINANG BUILDING",
    name: "Hinang Building", shortName: "Hinang", emoji: "🏛",
    desc: "College of Engineering and Information Technology (CEIT) facility featuring modern laboratories, design studios, and lecture halls.",
    depts: [
      { name: "CEIT Dean's Office", sub: "Floor 1", icon: "🏢" },
      { name: "IT & Computer Laboratories", sub: "Floor 1-2", icon: "💻" },
      { name: "Engineering Laboratories & Drafting Rooms", sub: "Floor 2", icon: "🔬" }
    ],
    contact: { phone: "(085) 341-2787", email: "ceit@csu.edu.ph" },
    supabaseId: 6,
    supabaseNames: ['Hinang', 'Hinang Building'],
    gradient: "linear-gradient(135deg, #1a4a2e 0%, #2e7d52 100%)"
  },
  "kinaadman_hall": {
    glbName: "KINAADMAN HALL",
    name: "Kinaadman Hall", shortName: "Kinaadman", emoji: "🎓",
    desc: "Multipurpose academic center and auditorium venue for university functions, academic conferences, and student gatherings.",
    depts: [
      { name: "Main Auditorium & Stage", sub: "Floor 1", icon: "🎭" },
      { name: "Audio-Visual Center", sub: "Floor 1", icon: "🔊" },
      { name: "Seminar Rooms", sub: "Floor 2", icon: "🎤" }
    ],
    contact: { phone: "(085) 341-2788", email: "events@csu.edu.ph" },
    supabaseId: 5,
    supabaseNames: ['Kinaadman', 'Kinaadman Hall'],
    gradient: "linear-gradient(135deg, #2c1a4e 0%, #5a3a8c 100%)"
  },
  "hiraya_building": {
    glbName: "Hiraya Building",
    name: "Hiraya Building", shortName: "Hiraya", emoji: "🌟",
    desc: "Multidisciplinary learning center equipped with smart classrooms, research laboratories, and student study spaces.",
    depts: [
      { name: "General Education Department", sub: "Floor 1", icon: "📖" },
      { name: "Science Laboratories & Research Hub", sub: "Floor 1-2", icon: "🧪" },
      { name: "Student Innovation Lounge", sub: "Floor 2", icon: "💡" }
    ],
    contact: { phone: "(085) 341-2789", email: "hiraya@csu.edu.ph" },
    supabaseId: 3,
    supabaseNames: ['Hiraya', 'Hiraya Building'],
    gradient: "linear-gradient(135deg, #4a2800 0%, #a05010 100%)"
  },
  "batok_hall": {
    glbName: "BATOK HALL",
    name: "Batok Hall", shortName: "Batok", emoji: "🏟",
    desc: "Cultural and sports activity hall hosting indoor sports, student assemblies, cultural performances, and university events.",
    depts: [
      { name: "Activity Court & Gymnasium", sub: "Floor 1", icon: "🏀" },
      { name: "Cultural Affairs Office", sub: "Floor 1", icon: "🎨" },
      { name: "Sports & Recreation Desk", sub: "Floor 2", icon: "🏆" }
    ],
    contact: { phone: "(085) 341-2790", email: "sports@csu.edu.ph" },
    supabaseId: 4,
    supabaseNames: ['Batok', 'Batok Hall'],
    gradient: "linear-gradient(135deg, #5c1a1a 0%, #9f2d2d 100%)"
  },
  "new_administrative_bldg": {
    glbName: "NEW ADMINISTRATIVE BUILDING",
    name: "New Admin Building", shortName: "Admin", emoji: "🏢",
    desc: "Central administrative headquarters housing the Office of the University President, Registrar, Cashier, Human Resources, and Finance offices.",
    depts: [
      { name: "Office of the Registrar & Admissions", sub: "Floor 1", icon: "📋" },
      { name: "Cashier & Accounting Offices", sub: "Floor 1", icon: "💵" },
      { name: "Office of the President & Board Room", sub: "Floor 2", icon: "🏛" },
      { name: "Human Resources Management", sub: "Floor 2", icon: "👥" }
    ],
    contact: { phone: "(085) 341-2282", email: "admin@csu.edu.ph" },
    supabaseId: 1,
    supabaseNames: ['New Administration Building', 'New Admin Building', 'Admin'],
    gradient: "linear-gradient(135deg, #003300 0%, #006600 100%)"
  },
  "state-of-the-art-library": {
    glbName: "STATE-OF-THE-ART LIBRARY",
    name: "State-of-the-Art Library", shortName: "Library", emoji: "📖",
    desc: "Modern digital learning commons and library featuring extensive book collections, e-resource stations, discussion pods, and silent study zones.",
    depts: [
      { name: "Circulation Desk & Reference Desk", sub: "Floor 1", icon: "📚" },
      { name: "E-Library & Computer Terminals", sub: "Floor 1", icon: "💻" },
      { name: "Graduate Studies & Periodicals", sub: "Floor 2", icon: "📑" },
      { name: "Quiet Study Pods & Research Hub", sub: "Floor 2", icon: "🎧" }
    ],
    contact: { phone: "(085) 341-2791", email: "library@csu.edu.ph" },
    supabaseId: 11,
    supabaseNames: ['Library', 'State-of-the-Art Library'],
    gradient: "linear-gradient(135deg, #1b3548 0%, #3e6d8a 100%)"
  },
  "kalinaw": {
    glbName: "KALINAW",
    name: "Kalinaw Hall", shortName: "Kalinaw", emoji: "🏨",
    isKalinawComplexMember: true,
    desc: "University lodging and guest house providing accommodation facilities for visiting dignitaries, researchers, and campus guests.",
    depts: [
      { name: "Reception Desk & Lounge", sub: "Floor 1", icon: "🛋" },
      { name: "Dining Hall & Guest Suites", sub: "Floor 1-2", icon: "🛏" }
    ],
    contact: { phone: "(085) 341-2792", email: "kalinaw@csu.edu.ph" },
    supabaseId: 10,
    supabaseNames: ['Kalinaw', 'Kalinaw Hall', 'Kalinaw Complex'],
    gradient: "linear-gradient(135deg, #2b453a 0%, #4c7764 100%)"
  },
  "csu_student_center": {
    glbName: "CSU STUDENT CENTER",
    name: "Student Center", shortName: "Student Center", abbrev: "Std. Ctr.", emoji: "🏢",
    hidePin: true,
    isKalinawComplexMember: true,
    desc: "Hub for student organizations, Supreme Student Council, guidance services, and student enterprise outlets.",
    supabaseId: 19,
    supabaseNames: ['Student Center', 'CSU Student Center'],
    gradient: "linear-gradient(135deg, #3d3b5c 0%, #696599 100%)"
  },
  "ced_building": {
    glbName: "CED BUILDING",
    name: "CED Building", shortName: "CED", emoji: "🏫",
    desc: "College of Education facility dedicated to teacher education, laboratory schools, curriculum development, and educational research.",
    depts: [
      { name: "CED Dean's Office", sub: "Floor 1", icon: "🏢" },
      { name: "Elementary & Secondary Ed Depts", sub: "Floor 1", icon: "✏️" },
      { name: "Demonstration & Tech Labs", sub: "Floor 2", icon: "🖥" }
    ],
    contact: { phone: "(085) 341-2793", email: "ced@csu.edu.ph" },
    supabaseId: 7,
    supabaseNames: ['Iwag', 'IWAG', 'CED Building', 'CED'],
    gradient: "linear-gradient(135deg, #4d2020 0%, #853e3e 100%)"
  },
  "caa_building": {
    glbName: "CAA BUILDING",
    name: "CAA Main Building", shortName: "CAA Main", abbrev: "CAA", emoji: "🌾",
    pinOffset: [0, 1.0, 18],
    isCAAComplexMember: true,
    desc: "College of Agricultural Sciences and Natural Resources main academic facility featuring agricultural science labs, soil testing centers, and agronomy offices.",
    depts: [
      { name: "Accreditation Office", sub: "Floor 1", icon: "💼" },
      { name: "Department of Plant and Soil Sciences", sub: "Floor 1", icon: "🌱", code: "DAE" },
      { name: "Department of Agricultural Education", sub: "Floor 2", icon: "🏢", code: "CAA Faculty Office 3" },
      { name: "Department of Animal Science", sub: "Floor 2", icon: "🐄", code: "DAS" }
    ],
    contact: { phone: "(085) 341-2794", email: "caa@csu.edu.ph" },
    supabaseId: 8,
    supabaseNames: ['CAA', 'CAA Building', 'CAA Complex', 'Main CAA Building'],
    gradient: "linear-gradient(135deg, #384218 0%, #687a33 100%)"
  },
  "dost": {
    glbName: "DOST",
    name: "DOST Building", shortName: "DOST", emoji: "🔬",
    desc: "Department of Science and Technology regional research facility, testing labs, and technology transfer center.",
    depts: [
      { name: "DOST Helpdesk & Calibration Lab", sub: "Floor 1", icon: "🔬" },
      { name: "R&D Innovation Hub", sub: "Floor 2", icon: "💡" }
    ],
    contact: { phone: "(085) 341-2795", email: "dost@csu.edu.ph" },
    supabaseId: 15,
    supabaseNames: ['DOST Building', 'DOST'],
    gradient: "linear-gradient(135deg, #0f2c59 0%, #205090 100%)"
  },
  "food_innovation_center": {
    glbName: "FOOD INNOVATION CENTER",
    name: "Food Innovation Center", shortName: "FIC", emoji: "💡",
    hidePin: true,
    isCAAComplexMember: true,
    desc: "Food technology testing facility supporting regional food processing research and development.",
    depts: [{ name: "Food Processing & Pilot Plant", sub: "Floor 1", icon: "💡" }],
    supabaseId: 18,
    supabaseNames: ['Food Innovation Center (FIC)', 'Food Innovation Center', 'FIC'],
    gradient: "linear-gradient(135deg, #6b4311 0%, #a16c27 100%)"
  },
  "hostel": {
    glbName: "UNIVERSITY HOSTEL",
    name: "University Hostel", shortName: "Hostel", emoji: "🏨",
    desc: "Campus hostel facility providing lodging for guests, faculty trainees, and student delegates.",
    depts: [{ name: "Guest Registration & Rooms", sub: "Floor 1-2", icon: "🏨" }],
    interactive: false,
    supabaseId: 16,
    supabaseNames: ['Hostel', 'University Hostel'],
    gradient: "linear-gradient(135deg, #1b3d35 0%, #30665a 100%)"
  },
  "school_of_medicine_(_under_cons_)": {
    glbName: "SCHOOL OF MEDICINE ( UNDER CONS. )",
    name: "School of Medicine", shortName: "Medicine", emoji: "🏥",
    desc: "Future medical education facility currently under construction to support healthcare degree programs.",
    gradient: "linear-gradient(135deg, #1c4558 0%, #2f6983 100%)"
  },
  "csu_gym": {
    glbName: "Gymnasium",
    name: "University Gymnasium", shortName: "Gymnasium", emoji: "🏟",
    desc: "Main indoor sports complex for university athletics, basketball, volleyball games, graduations, and major campus events.",
    depts: [{ name: "Basketball Court & PE Dept", sub: "Floor 1", icon: "🏀" }],
    contact: { phone: "(085) 341-2796", email: "sports@csu.edu.ph" },
    supabaseId: 13,
    supabaseNames: ['CSU Gymnasium', 'University Gymnasium', 'Gym'],
    gradient: "linear-gradient(135deg, #441c58 0%, #683083 100%)"
  },
  "old_administrative_building": {
    glbName: "OLD ADMINISTRATIVE BUILDING",
    name: "Old Admin Building", shortName: "Old Admin", abbrev: "Old Admin", emoji: "🏢",
    desc: "Heritage administrative facility housing extension services, alumni relations, research coordination, and auxiliary offices.",
    depts: [
      { name: "Extension Services & Research Office", sub: "Floor 1", icon: "🌐" },
      { name: "Planning & Alumni Affairs", sub: "Floor 1", icon: "📜" }
    ],
    contact: { phone: "(085) 341-2283", email: "info@csu.edu.ph" },
    supabaseId: 2,
    supabaseNames: ['Old Administration Building', 'Old Admin Building'],
    gradient: "linear-gradient(135deg, #3d3b5c 0%, #696599 100%)"
  },
  "old_cas": {
    glbName: "OLD CAS BUILDING",
    name: "Old CAS Building", shortName: "Old CAS", emoji: "🏫",
    desc: "Former College of Arts and Sciences building housing general lecture rooms and department offices.",
    interactive: false,
    supabaseId: 20,
    supabaseNames: ['Old CAS', 'Old CAS Building'],
    gradient: "linear-gradient(135deg, #2a3a1a 0%, #4a6a2a 100%)"
  },
  "sports_office": {
    glbName: "ROTC OFFICE",
    name: "Sports Office", shortName: "Sports Office", emoji: "🏆",
    desc: "University athletics and physical education office coordinating sports competitions and ROTC activities.",
    interactive: false,
    supabaseId: 14,
    supabaseNames: ['PE Building', 'Sports Office'],
    gradient: "linear-gradient(135deg, #1a2a4a 0%, #2a4a8a 100%)"
  },
  "Villares": {
    name: "Villares", shortName: "Villares", emoji: "🏆",
    desc: "Villares research center supporting agricultural technology and extension programs.",
    depts: [{ name: "Research & Seminar Rooms", sub: "Floor 1", icon: "🌱" }],
    contact: { phone: "(085) 341-2797", email: "villares@csu.edu.ph" },
    supabaseId: 9,
    supabaseNames: ['Villares'],
    gradient: "linear-gradient(135deg, #1a2a4a 0%, #2a4a8a 100%)"
  },
  "ched_lgu": {
    glbName: "CHED_LGU -",
    name: "CHED-LGU", shortName: "CHED-LGU", abbrev: "CHED-LGU", emoji: "🏛",
    desc: "Commission on Higher Education (CHED Caraga) regional office and Local Government Unit partnership facility.",
    depts: [{ name: "CHED Caraga Regional Office", sub: "Floor 1", icon: "🏛" }],
    contact: { phone: "(085) 342-5253", email: "chedcaraga@ched.gov.ph" },
    supabaseId: null,
    supabaseNames: ['CHED-CARAGA', 'CHED-LGU Building', 'CHED LGU', 'CHED-LGU', 'CHED', 'CHED - LGU', 'ched_lgu', 'ched_lgu -'],
    gradient: "linear-gradient(135deg, #002244 0%, #003a7a 100%)"
  },

  // ── NON-INTERACTIVE LANDMARKS (Static labels, no info panels) ──
  "bbc_cafeteria": { glbName: "BBC CAFETERIA", name: "BBC Cafeteria", shortName: "BBC Cafeteria", emoji: "☕", hidePin: true, isKalinawComplexMember: true, desc: "Campus cafeteria providing meals and refreshments for students, faculty, and guests.", gradient: "linear-gradient(135deg, #2b453a 0%, #4c7764 100%)" },
  "boffo_canteen": { glbName: "BOFFO CANTEEN", name: "Boffo Canteen", shortName: "Boffo Canteen", emoji: "🍽️", hidePin: true, isKalinawComplexMember: true, desc: "University canteen serving hot meals, snacks, and beverages.", gradient: "linear-gradient(135deg, #2b453a 0%, #4c7764 100%)" },
  "ced_canteen": { glbName: "CED CANTEEN", name: "CED Canteen", shortName: "CED Canteen", interactive: false },
  "caa_canteen": { glbName: "CAA CANTEEN", name: "CAA Canteen", shortName: "CAA Canteen", emoji: "🍽️", hidePin: true, isCAAComplexMember: true, desc: "CAA dining hall and cafeteria serving students and research personnel.", depts: [{ name: "CAA Canteen Dining Area", sub: "Floor 1", icon: "🍽️" }], gradient: "linear-gradient(135deg, #384218 0%, #687a33 100%)" },
  "overpass": { glbName: "OVERPASS", name: "Campus Overpass", shortName: "Overpass", interactive: false },
  "guard_house": { glbName: "GUARD HOUSE", name: "Guard House", shortName: "Guard House", interactive: false },
  "guard_house001": { glbName: "GUARD HOUSE.001", name: "Guard House (Gate)", shortName: "Guard House", interactive: false },
  "harrison_statue": { glbName: "HARRISON STATUE", name: "Harrison Statue", shortName: "Harrison Statue", interactive: false },
  "ochoa_statue": { glbName: "OCHOA STATUE", name: "Ochoa Statue", shortName: "Ochoa Statue", interactive: false },
  "green_house": { glbName: "GREEN HOUSE", name: "Green House", shortName: "Green House", interactive: false },
  "micoriza_green_house": { glbName: "MICORIZA GREEN HOUSE", name: "Micoriza Green House", shortName: "Micoriza GH", interactive: false },
  "church": { glbName: "CHAPEL", name: "Campus Chapel", shortName: "Chapel", interactive: false },
  "eco_park_building": { glbName: "ECO PARK", name: "Eco Park", shortName: "Eco Park", interactive: false },
  "reservoir": { glbName: "RESERVOIR", name: "Water Reservoir", shortName: "Reservoir", interactive: false },
  "mrf": { glbName: "MRF", name: "Materials Recovery Facility", shortName: "MRF", interactive: false },
  "feedmill": { glbName: "FEEDMILL", name: "Feedmill", shortName: "Feedmill", interactive: false },
  "milk_processing_facility": { glbName: "MILK PROCESSING FACILITY", name: "Milk Processing Facility", shortName: "Milk Facility", emoji: "🥛", hidePin: true, isCAAComplexMember: true, desc: "Dairy science processing plant for pasteurization and milk product development.", depts: [{ name: "Dairy Processing & Bottling", sub: "Floor 1", icon: "🥛" }], gradient: "linear-gradient(135deg, #384218 0%, #687a33 100%)" },
  "da_dairy_processing_center": { glbName: "DA DAIRY PROCESSING CENTER", name: "Dairy Processing Center", shortName: "Dairy Center", interactive: false },
  "caretaker_house": { glbName: "CARETAKER HOUSE", name: "Caretaker House", shortName: "Caretaker", interactive: false },
  "beef_cattle_building": { glbName: "BEEF CATTLE BUILDING", name: "Beef Cattle Shed", shortName: "Cattle Shed", interactive: false },
  "barn_house": { glbName: "BARN HOUSE", name: "Barn House", shortName: "Barn House", interactive: false },
  "goat_house": { glbName: "GOAT HOUSE", name: "Goat House", shortName: "Goat House", interactive: false },
  "sheep_house": { glbName: "SHEEP HOUSE", name: "Sheep House", shortName: "Sheep House", interactive: false },
  "agro_forestry_shed": { glbName: "AGRO-FORESTRY SHED", name: "Agro-Forestry Shed", shortName: "Agro Shed", interactive: false },
  "wood_workshop": { glbName: "WOOD WORKSHOP/TECH VOC BUILDING", name: "Wood Workshop Tech Voc", shortName: "Wood Workshop", interactive: false },
  "oatc": { glbName: "OATC", name: "OATC", shortName: "OATC", interactive: false },
  "rotc": { glbName: "ROTC OFFICE", name: "ROTC Office", shortName: "ROTC", hidePin: true, isKalinawComplexMember: true },
  "bookstore": { glbName: "BOOKSTORE AND ORGMS OFFICE", name: "Bookstore & ORGMS", shortName: "Bookstore", hidePin: true, isKalinawComplexMember: true },
  "power_house": { glbName: "POWER HOUSE", name: "Power House", shortName: "Power House", interactive: false },
  "bodega": { glbName: "BODEGA", name: "Bodega", shortName: "Bodega", interactive: false },

  // ── ADDITIONAL CAMPUS STRUCTURES ──
  "agri-workshop_2": { name: "Agri Workshop 2", shortName: "Agri Workshop 2", emoji: "🛠️", hidePin: true, isCAAComplexMember: true, desc: "Agricultural engineering workshop for machinery testing and fabrication.", depts: [{ name: "Machinery Workshop", sub: "Floor 1", icon: "🛠️" }], gradient: "linear-gradient(135deg, #384218 0%, #687a33 100%)" },
  "alumni_office": {
    name: "Alumni Center", shortName: "Alumni Center", emoji: "🎓",
    interactive: false,
    supabaseId: 17,
    supabaseNames: ['Alumni Center', 'Alumni Office'],
    gradient: "linear-gradient(135deg, #1a2a4a 0%, #2a4a8a 100%)"
  },
  "Annex 3": { glbName: "ANNEX 3", name: "Annex 3", shortName: "Annex 3", emoji: "🏬", hidePin: true, isKalinawComplexMember: true },
  "amante_building": { glbName: "AMANTE BUILDING", name: "Amante Building", shortName: "Amante Bldg.", emoji: "🏛️", hidePin: true, isKalinawComplexMember: true, desc: "Academic and administrative facility supporting university instruction and research.", gradient: "linear-gradient(135deg, #2b453a 0%, #4c7764 100%)" },
  "annex_2_(old_ladies_dorm)": { name: "Annex 2 (Old Ladies Dorm)", shortName: "Annex 2", interactive: false },
  "annex_3": { glbName: "ANNEX 3", name: "Annex 3", shortName: "Annex 3", emoji: "🏬", hidePin: true, isKalinawComplexMember: true, desc: "Campus annex building providing auxiliary offices, student spaces, and lecture rooms.", gradient: "linear-gradient(135deg, #2b453a 0%, #4c7764 100%)" },
  "atm_machine_landbank": { name: "ATM - Landbank", shortName: "ATM Landbank", interactive: false },
  "atm_machine_pnb": { name: "ATM - PNB", shortName: "ATM PNB", interactive: false },
  "bio_diagnostic_laboratory": { name: "Bio-Diagnostic Laboratory", shortName: "Bio-Diag Lab", interactive: false },
  "bookstore_and_orgms_office": { glbName: "BOOKSTORE AND ORGMS OFFICE", name: "Bookstore & Orgs Office", shortName: "Bookstore", emoji: "📚", hidePin: true, isKalinawComplexMember: true, desc: "University bookstore and student organizations administrative office.", gradient: "linear-gradient(135deg, #2b453a 0%, #4c7764 100%)" },
  "caa_diagnostic_laboratory": { name: "CAA Diagnostic Laboratory", shortName: "CAA Diag Lab", emoji: "🔬", hidePin: true, isCAAComplexMember: true, desc: "Diagnostic laboratory providing plant pathology and soil chemistry analysis.", depts: [{ name: "Pathology & Soil Testing Lab", sub: "Floor 1", icon: "🔬" }], gradient: "linear-gradient(135deg, #384218 0%, #687a33 100%)" },
  "caa_layering_house": { name: "CAA Layering House", shortName: "Layering House", interactive: false },
  "caa_restroom": { name: "CAA Restroom", shortName: "CAA Restroom", interactive: false },
  "caa_swine_laboratory": { name: "CAA Swine Laboratory", shortName: "Swine Lab", interactive: false },
  "chicken_coop": { name: "Chicken Coop", shortName: "Chicken Coop", interactive: false },
  "caraga_black_native_chicken": { name: "Caraga Black Native Chicken House", shortName: "Native Chicken", interactive: false },
  "cas_covered_court": { name: "CAS Covered Court", shortName: "CAS Court", interactive: false },
  "cas_student_center": { glbName: "CAS STUDENT CENTER", name: "Student Office", shortName: "Student Office", emoji: "👥", hidePin: true, isKalinawComplexMember: true, desc: "Administrative office for student council and campus student services.", gradient: "linear-gradient(135deg, #2b453a 0%, #4c7764 100%)" },
  "catching_coral": { name: "Catching Coral", shortName: "Catching Coral", interactive: false },
  "ccard_office": { glbName: "CCARD OFFICE", name: "CCARD Office", shortName: "CCARD Office", emoji: "📁", hidePin: true, isKalinawComplexMember: true, desc: "Caraga Center for Agricultural and Resource Development research office.", gradient: "linear-gradient(135deg, #2b453a 0%, #4c7764 100%)" },
  "ced_restroom": { name: "CED Restroom", shortName: "CED Restroom", interactive: false },
  "cofes_annex": { name: "COFES Annex", shortName: "COFES Annex", interactive: false },
  "eco_lodge": { name: "Eco Lodge", shortName: "Eco Lodge", interactive: false },
  "emb_machine": { name: "EMB Machine", shortName: "EMB Machine", interactive: false },
  "executive_house": { name: "Executive House", shortName: "Executive House", interactive: false },
  "farm_nursery": { name: "Farm Nursery", shortName: "Farm Nursery", interactive: false },
  "gas_station": { name: "Gas Station", shortName: "Gas Station", interactive: false },
  "gent's_dormitory": { name: "Gent's Dormitory", shortName: "Gent's Dorm", interactive: false },
  "gents'_dormitory_(_under_cons)": { name: "Gent's Dormitory (Under Const.)", shortName: "Gent's Dorm", interactive: false },
  "hardenning_area": { name: "Hardening Area", shortName: "Hardening Area", interactive: false },
  "hero_statue": { name: "Hero Statue", shortName: "Hero Statue", interactive: false },
  "ladies'_dormitory_(_under_cons)": { name: "Ladies' Dormitory (Under Const.)", shortName: "Ladies' Dorm", interactive: false },
  "mechanical_dryer": { name: "Mechanical Dryer", shortName: "Mech. Dryer", interactive: false },
  "micoriza_office": { name: "Micoriza Office", shortName: "Micoriza Office", interactive: false },
  "motorpool": { name: "Motorpool", shortName: "Motorpool", interactive: false },
  "old_ccaarrd_building": { name: "Old CCAARRD Building", shortName: "Old CCAARRD", interactive: false },
  "old_cegsttloresearch_services_office": { name: "Old Research Services Office", shortName: "Old Research Ofc.", interactive: false },
  "old_farm_mechanization_center": { name: "Old Farm Mechanization Center", shortName: "Old Farm Mech.", interactive: false },
  "power_house001": { name: "Power House", shortName: "Power House", interactive: false },
  "rooting_recovery": { name: "Rooting Recovery Area", shortName: "Rooting Area", interactive: false },
  "rotc_office": { glbName: "ROTC OFFICE", name: "ROTC Office", shortName: "ROTC Office", emoji: "🛡️", hidePin: true, isKalinawComplexMember: true, desc: "Reserve Officers' Training Corps campus headquarters and tactical training office.", gradient: "linear-gradient(135deg, #2b453a 0%, #4c7764 100%)" },
  "state-of-the_art_sports_complex001": { name: "State-of-the-Art Sports Complex", shortName: "Field", interactive: false },
  "tissue_culture_lab": { name: "Tissue Culture Laboratory", shortName: "Tissue Culture Lab", emoji: "🧫", hidePin: true, isCAAComplexMember: true, desc: "Biotechnology laboratory dedicated to plant tissue culture micropropagation.", depts: [{ name: "Micropropagation Unit", sub: "Floor 1", icon: "🧫" }], gradient: "linear-gradient(135deg, #384218 0%, #687a33 100%)" },
  "vermi_house": { name: "Vermi House", shortName: "Vermi House", interactive: false },
  "cas_canteen": { name: "CAS Canteen", shortName: "CAS Canteen", interactive: false },
  "ced_lsg_office": { name: "CED LSG Office", shortName: "CED LSG", interactive: false },
  "ttlo": { name: "TTLO Office", shortName: "TTLO", interactive: false },
  "caa": { name: "CAA Complex", shortName: "CAA Complex", hidePin: true, isCAAComplexMember: true },
  "carabao_center": { name: "Carabao Center", shortName: "Carabao Ctr.", interactive: false },
  "basta_didto_tumoy": { name: "Campus Extension Grounds", shortName: "Grounds Ext.", interactive: false }
};

// ── Building → individual GLB path map ───────────────────────────────────────
// All individual building and landmark GLB models from /models/map/
// All files are Draco-compressed in-place via scripts/compress-map-buildings.mjs
const BUILDING_GLB_MAP = {
  // ── Main academic & admin buildings ──────────────────────────────────────
  'masawa_building': '/models/map/masawa%20building.glb',

  'hinang_building': '/models/map/hinang.glb',
  'kinaadman_hall': '/models/map/kh%20comp.glb',
  'hiraya_building': '/models/map/hiraya.glb',
  'new_administrative_bldg': '/models/map/new%20admin%20-.glb',
  'old_administrative_building': '/models/map/old%20admin%20-.glb',
  'state-of-the-art-library': '/models/map/STATE-OF-THE-ART-LIBRARY.glb',
  'batok_hall': '/models/map/batok%20hall%20-.glb',
  'ced_building': '/models/map/CED%20-.glb',
  'caa_building': '/models/map/CAA%20Building.glb',
  'caa': '/models/map/CAA%20Building.glb',
  'dost': '/models/map/DOST%20-.glb',
  'alumni_office': '/models/map/ALUMNI%20OFFICE%20-.glb',
  'csu_student_center': '/models/map/CSU%20STUDENT%20CENTER.glb',
  'executive_house': '/models/map/executive%20house%20-.glb',
  'old_cas': '/models/map/Old%20CAS.glb',
  'kalinaw': '/models/map/KALINAW.glb',
  'csu_gym': '/models/map/GYMNASIUM.glb',
  'sports_office': '/models/map/Sports%20Office.glb',
  'food_innovation_center': '/models/map/Food%20Innovation%20Center.glb',
  'food_technology_center': '/models/map/Food_Technology_Center.glb',
  'amante_building': '/models/map/AMANTE%20BUILDING.glb',
  'milk_processing_facility': '/models/map/Milk%20Processing%20Facility.glb',
  'eco_park_building': '/models/map/ECO%20Park%20Building.glb',
  'ccard_office': '/models/map/CCARD%20OFFICE.glb',
  'church': '/models/map/Church.glb',
  'Villares': '/models/map/Villares%20Center.glb',
  'villares': '/models/map/Villares%20Center.glb',

  // ── Facilities, canteens & support structures ─────────────────────────────
  'power_house': '/models/map/powerhouse%20-.glb',
  'motorpool': '/models/map/motorpool.glb',
  'ched_lgu': '/models/map/ched_lgu%20-.glb',
  'bio_diagnostic_laboratory': '/models/map/bio%20diagnostic%20labtoratory%20-.glb',
  'overpass': '/models/map/overpass%20and%20guardhouse.glb',
  'gas_station': '/models/map/gas%20station%20na%20guba%20-.glb',
  'cas_covered_court': '/models/map/CAS%20COVERED%20COURT%20-.glb',
  'bbc_cafeteria': '/models/map/BBC%20CAFE.glb',
  'cas_canteen': '/models/map/CAS%20CANTEEN%20-.glb',
  'ced_canteen': '/models/map/ced%20canteen%20-.glb',
  'ced_lsg_office': '/models/map/CED%20LSG%20OFFICE%20-.glb',
  'ttlo': '/models/map/TTLO%20-.glb',
  'boffo_canteen': '/models/map/BOFFO%20CANTEEN.glb',
  'caa_canteen': '/models/map/CAA%20Canteen.glb',
  'front_ccis_canteen': '/models/map/Front_CCIS_Canteen.glb',
  'cofes_annex': '/models/map/COFES%20annex.glb',
  'eco_lodge': '/models/map/ECO%20lodge.glb',
  'emb_machine': '/models/map/EMB%20machine.glb',
  'gents_dormitory': '/models/map/GENT\'S%20dorm.glb',
  'oatc': '/models/map/OATC.glb',
  'old_farm_mechanization_center': '/models/map/OLD%20Farm%20Mechanization.glb',
  'rotc_office': '/models/map/ROTC%20OFFICE.glb',
  'bookstore_and_orgms_office': '/models/map/BOOK%20STORE%20AND%20NORMS.glb',
  'agri-workshop_2': '/models/map/Agri%20Workshop%202.glb',
  'annex_3': '/models/map/ANNEX%203.glb',
  'student_office': '/models/map/CAS%20STUDENT%20CENTER%20-.glb',
  'cas_student_center': '/models/map/CAS%20STUDENT%20CENTER%20-.glb',

  // ── Additional campus structures & agricultural facilities ─────────────────
  'agro_forestry_shed': '/models/map/AGRO-FORESTRY%20SHED.glb',
  'annex_2_old_ladies_dorm': '/models/map/ANNEX%202%20(OLD%20LADIES%20DORM).glb',
  'barn_house': '/models/map/BARN%20HOUSE.glb',
  'beef_cattle_building': '/models/map/BEEF%20CATTLE%20BUILDING.glb',
  'bodega': '/models/map/BODEGA.glb',
  'caa_layering_house': '/models/map/CAA%20LAYERING%20HOUSE.glb',
  'caa_swine_laboratory': '/models/map/CAA%20SWINE%20LABORATORY.glb',
  'caa_diagnostic_laboratory': '/models/map/CAA%20diagnostic%20laboratory.glb',
  'caraga_black_native_chicken': '/models/map/CARAGA%20BLACK%20NATIVE%20CHICKEN.glb',
  'chicken_coop': '/models/map/Chicken%20Coop.glb',
  'caretaker_house': '/models/map/CARETAKER%20HOUSE.glb',
  'catching_coral': '/models/map/CATCHING%20CORAL.glb',
  'farm_nursery': '/models/map/FARM%20NURSERY.glb',
  'feedmill': '/models/map/FEEDMILL.glb',
  'gents_dormitory_under_cons': '/models/map/GENTS\'%20DORMITORY%20(%20UNDER%20CONS.).glb',
  'goat_house': '/models/map/GOAT%20HOUSE.glb',
  'green_house': '/models/map/Green%20House.glb',
  'hardening_area': '/models/map/HARDENNING%20AREA.glb',
  'ladies_dormitory_under_cons': '/models/map/LADIES\'%20DORMITORY%20(%20UNDER%20CONS.).glb',
  'mechanical_dryer': '/models/map/MECHANICAL%20DRYER.glb',
  'micoriza_green_house': '/models/map/MICORIZA%20GREEN%20HOUSE.glb',
  'old_ccaarrd_building': '/models/map/OLD%20CCAARRD%20BUILDING.glb',
  'rooting_recovery': '/models/map/ROOTING%20RECOVERY.glb',
  'school_of_medicine_under_cons': '/models/map/SCHOOL%20OF%20MEDICINE%20(%20UNDER%20CONS.%20).glb',
  'sheep_house': '/models/map/SHEEP%20HOUSE.glb',
  'tech_voc_building': '/models/map/TECH%20VOC%20BUILDING.glb',
  'tissue_culture_lab': '/models/map/Tissue%20Culture%20Lab.glb',
  'vermi_house': '/models/map/VERMI%20HOUSE.glb',
  'hostel': '/models/map/HOSTEL.glb',
  'university_hostel': '/models/map/HOSTEL.glb',
  'carabao_center': '/models/map/Carabao%20Center.glb',
  'auxiliary_buildings': '/models/map/auxillary%20buildings.glb',
};

// ── State ─────────────────────────────────────────────────────────────────────
let experience = null;   // Three.js Experience singleton
let worldReady = false;  // true once ground base is loaded
let showAllUnclickable = false; // toggle state for unclickable buildings & labels

const meshIndex = {};       // lowercased mesh name → THREE.Object3D (from individual GLBs)
const pinList = [];         // { key, worldPos, el }
const _projVec = new THREE.Vector3();
const _box = new THREE.Box3();

let activeKey = null;
let activeMesh = null;

// ── Open / Close overlay ──────────────────────────────────────────────────────

export function openMapOverlay() {
  const overlay = document.getElementById('map-overlay');
  if (!overlay) return;

  _syncSupabaseModels();

  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    overlay.style.opacity = '1';
  }));
}

export function closeMapOverlay() {
  const overlay = document.getElementById('map-overlay');
  if (!overlay) return;
  overlay.style.opacity = '0';
  document.body.style.overflow = '';
  setTimeout(() => { overlay.style.display = 'none'; }, 400);
  _closePanel();
}

// ── Three.js bootstrap ────────────────────────────────────────────────────────

function _bootExperience() {
  const canvas = document.querySelector('.experience-canvas');
  if (!canvas) return;

  experience = new Experience(canvas);

  // ── Wire up progress to new preloader bar + pct ──────────────────────────
  const barEl = document.getElementById('preloader-bar');
  const pctEl = document.getElementById('loading-progress');

  function _setProgress(pct) {
    const clamped = Math.min(100, Math.max(0, Math.round(pct)));
    if (barEl) barEl.style.width = clamped + '%';
    if (pctEl) pctEl.textContent = clamped + '%';
  }

  if (experience.resources) {
    const mgr = experience.resources.loadingManager;
    if (mgr) {
      mgr.onProgress = (_url, loaded, total) => {
        if (total > 0) _setProgress((loaded / total) * 100);
      };
    }
  }

  experience.world.on('worldready', () => {
    worldReady = true;
    _setProgress(100);

    // Ground base is ready — hide the preloader immediately.
    // Buildings will stream in progressively in the background.
    const preloader = document.getElementById('tikad-preloader');
    if (preloader) {
      setTimeout(() => {
        preloader.style.transition = 'opacity 0.7s cubic-bezier(0.4,0,0.2,1)';
        preloader.style.opacity = '0';
        setTimeout(() => preloader.classList.add('hidden'), 750);
      }, 400);
    }

    // Build chips and start pin-update loop immediately (buildings will
    // register their own pins as they arrive via 'buildingloaded')
    _buildChips();
    experience.time.on('update', _updatePins);

    // Register base model nodes (campusBase, trees, easterEgg) into meshIndex
    let campusBaseScene = null;
    if (experience.world && experience.world.plateforme10 && experience.world.plateforme10.modelsToLoad) {
      experience.world.plateforme10.modelsToLoad.forEach(({ name, item }) => {
        if (item && item.scene) {
          item.scene.traverse((node) => {
            if (!node.name) return;
            const k = node.name.toLowerCase().trim();
            if (k && !meshIndex[k]) meshIndex[k] = node;
          });
          // Capture the campusBase scene for navigation init
          if (name === 'campusBase') campusBaseScene = item.scene;
        }
      });
    }

    // ── Navigation system init ─────────────────────────────────────────────
    const navSceneRoot = experience.scene || campusBaseScene;
    if (navSceneRoot) {
      // Initialize pathfinding + road segment highlighting against the active 3D scene
      initNavigation(navSceneRoot);
    }

    // Fetch college seals live from Supabase buildings table
    _loadSupabaseSeals();

    // ── Progressive building loading ───────────────────────────────────────
    // Wire up the 'buildingloaded' handler BEFORE kicking off loads so we
    // don't miss any that resolve synchronously from cache.
    experience.world.on('buildingloaded', ({ key, scene }) => {
      _registerBuildingScene(key, scene);
    });

    // Kick off all building loads. They stream in independently.
    Object.entries(BUILDING_GLB_MAP).forEach(([key, path]) => {
      experience.world.loadBuildingGLB(path, key);
    });
  });
}

// ── Register a freshly-loaded building GLB into meshIndex + create its pin ───
function _registerBuildingScene(buildingKey, buildingScene) {
  // Index every named node in this building's GLB
  buildingScene.traverse((node) => {
    if (!node.name) return;
    const k = node.name.toLowerCase().trim();
    if (k) meshIndex[k] = node;

    // Cache original materials for highlight reset
    if (node.isMesh && node.material && !node.userData.origMat) {
      node.userData.origMat = Array.isArray(node.material)
        ? node.material.map(m => m.clone())
        : node.material.clone();
    }
  });

  // Also index by the building key itself so _findNode() can resolve it directly
  const cleanKey = buildingKey.toLowerCase().trim();
  if (!meshIndex[cleanKey]) meshIndex[cleanKey] = buildingScene;

  // Create the 3D pin for this building now that its geometry is in the scene
  _createPinForKey(buildingKey);

  console.log(`[GIYA] Building registered: "${buildingKey}" (${Object.keys(meshIndex).length} total nodes indexed)`);
}

// ── Node lookup helper ────────────────────────────────────────────────────────
function _findNode(key) {
  if (!key) return null;

  // 1️⃣ Priority: use the explicit glbName from BUILDING_DATA (exact, case-insensitive)
  const data = BUILDING_DATA[key];
  if (data && data.glbName) {
    const glbKey = data.glbName.toLowerCase().trim();
    if (meshIndex[glbKey]) return meshIndex[glbKey];
  }

  // 2️⃣ Direct lookup by the registry key itself (lowercased)
  const cleanKey = key.toLowerCase().trim();
  if (meshIndex[cleanKey]) return meshIndex[cleanKey];

  // 3️⃣ Normalized exact match (strip punctuation/spaces)
  const normKey = cleanKey.replace(/[^a-z0-9]/g, '');
  if (!normKey) return null;

  for (const [k, node] of Object.entries(meshIndex)) {
    const normK = k.replace(/[^a-z0-9]/g, '');
    if (normK === normKey) return node;
  }

  // 4️⃣ Partial / inclusion match (pick closest length match)

  let bestMatch = null;
  let bestLen = Infinity;
  for (const [k, node] of Object.entries(meshIndex)) {
    const normK = k.replace(/[^a-z0-9]/g, '');
    if (!normK) continue;
    if (normK.includes(normKey) || normKey.includes(normK)) {
      const diff = Math.abs(normK.length - normKey.length);
      if (diff < bestLen) {
        bestLen = diff;
        bestMatch = node;
      }
    }
  }

  return bestMatch;
}

// ── Quick-select chips (bottom bar) ──────────────────────────────────────────

function _buildChips() {
  const bar = document.getElementById('map-chips-bar');
  if (!bar) return;
  bar.innerHTML = '';
  Object.entries(BUILDING_DATA).forEach(([key, data]) => {
    // Only display interactive buildings unless showAllUnclickable is true
    if (!showAllUnclickable && data.interactive === false) return;

    const btn = document.createElement('button');
    btn.className = 'cat-btn' + (data.interactive === false ? ' non-interactive-chip' : '');
    btn.textContent = data.shortName || data.name.split(' ')[0];
    btn.title = data.name;
    if (data.interactive !== false) {
      btn.addEventListener('click', () => {
        _selectBuilding(key, true);
        // sync search input
        const input = document.getElementById('map-search');
        if (input) input.value = data.name;
      });
    } else {
      btn.style.opacity = '0.7';
      btn.style.cursor = 'default';
    }
    bar.appendChild(btn);
  });
}

// ── Building selection & highlight ───────────────────────────────────────────

let highlightedMeshes = [];

// ── Floating Complex Buildings Card (Bottom Left) ────────────────────────────

const COMPLEX_CONFIGS = {
  caa: {
    title: "CAA Complex",
    icon: "mdi-office-building-marker-outline",
    items: [
      { key: 'caa_building', name: 'Main CAA Building', icon: 'mdi-bank-outline' },
      { key: 'agri-workshop_2', name: 'Agri Workshop 2', icon: 'mdi-storefront-outline' },
      { key: 'tissue_culture_lab', name: 'CAA Tissue Culture Lab', icon: 'mdi-sprout-outline' },
      { key: 'caa_canteen', name: 'CAA Canteen', icon: 'mdi-silverware-fork-knife' },
      { key: 'milk_processing_facility', name: 'Milk Facility', icon: 'mdi-cup-water' },
      { key: 'caa_diagnostic_laboratory', name: 'CAA Diag Lab', icon: 'mdi-flask-outline' },
      { key: 'food_innovation_center', name: 'FIC', icon: 'mdi-lightbulb-outline' }
    ]
  },
  kalinaw: {
    title: "Kalinaw Complex",
    icon: "mdi-home-city-outline",
    items: [
      { key: 'kalinaw', name: 'Main Kalinaw Building', icon: 'mdi-bank-outline' },
      { key: 'bbc_cafeteria', name: 'BBC Cafeteria', icon: 'mdi-coffee-outline' },
      { key: 'boffo_canteen', name: 'Boffo Canteen', icon: 'mdi-silverware-fork-knife' },
      { key: 'rotc_office', name: 'ROTC office', icon: 'mdi-shield-outline' },
      { key: 'bookstore_and_orgms_office', name: 'Bookstore', icon: 'mdi-book-open-page-variant-outline' },
      { key: 'ccard_office', name: 'CCARD office', icon: 'mdi-briefcase-outline' },
      { key: 'csu_student_center', name: 'Student Center', icon: 'mdi-domain' },
      { key: 'amante_building', name: 'Amante Bldg', icon: 'mdi-office-building-outline' },
      { key: 'annex_3', name: 'Annex 3', icon: 'mdi-layers-outline' }
    ]
  }
};

function renderComplexCard(type = 'caa', activeSubKey = null) {
  const card = document.getElementById('caa-complex-card');
  const body = document.getElementById('caa-card-body');
  const titleEl = document.getElementById('caa-card-title');
  const iconEl = document.getElementById('caa-card-icon');
  if (!card || !body) return;

  const config = COMPLEX_CONFIGS[type];
  if (!config) return;

  if (titleEl) titleEl.textContent = config.title;
  if (iconEl) iconEl.className = `caa-card-icon mdi ${config.icon}`;

  const currentActiveKey = activeSubKey || (type === 'kalinaw' ? 'kalinaw' : 'caa_building');

  body.innerHTML = config.items.map(item => {
    const isActive = item.key === currentActiveKey;
    return `
      <div class="caa-card-item${isActive ? ' caa-item--active' : ''}" data-key="${item.key}">
        <span class="caa-item-icon mdi ${item.icon}"></span>
        <span class="caa-item-name">${item.name}</span>
      </div>
    `;
  }).join('');

  body.querySelectorAll('.caa-card-item').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const subKey = el.dataset.key;
      _selectBuilding(subKey, true);
    });
  });

  card.style.display = 'block';
}

function _hideComplexCard() {
  const card = document.getElementById('caa-complex-card');
  if (card) card.style.display = 'none';
}

function _selectBuilding(key, openPanel = true, suppress3dViewer = false, highlightRoom = null, searchMode = false) {
  _resetHighlight();
  activeKey = key;

  const data = BUILDING_DATA[key];

  // Show bottom-left Complex Card if selecting a Complex member
  if (data?.isCAAComplexMember || key === 'caa_building' || key === 'caa') {
    renderComplexCard('caa', key);
  } else if (data?.isKalinawComplexMember || key === 'kalinaw') {
    renderComplexCard('kalinaw', key);
  } else {
    _hideComplexCard();
  }

  const node = _findNode(key);

  if (node) {
    node.traverse((child) => {
      if (child.isMesh && child.material) {
        if (!child.userData.origMat) {
          child.userData.origMat = Array.isArray(child.material)
            ? child.material.map(m => m.clone())
            : child.material.clone();
        }

        const mats = Array.isArray(child.material) ? child.material : [child.material];
        const highlightedMats = mats.map(m => {
          const cloned = m.clone();
          if (cloned.color) cloned.color.setHex(0xeddd53);
          if (cloned.emissive) {
            cloned.emissive.setHex(0xeddd53);
            cloned.emissiveIntensity = 1.2;
          }
          return cloned;
        });

        child.material = Array.isArray(child.material) ? highlightedMats : highlightedMats[0];
        highlightedMeshes.push(child);
      }
    });

  } else {
    console.warn(`No node found for "${key}". Available keys:`, Object.keys(meshIndex));
  }

  // Highlight active chip
  document.querySelectorAll('#map-chips-bar .cat-btn').forEach(b => {
    b.classList.toggle('active-cat', b.title === BUILDING_DATA[key]?.name);
  });

  // Glow the matching 3D pin label
  pinList.forEach(p => p.el.querySelector('.pin-label')?.classList.remove('active-pin'));
  const activePin = pinList.find(p => p.key === key);
  if (activePin) activePin.el.querySelector('.pin-label')?.classList.add('active-pin');

  if (openPanel) _openPanel(key, highlightRoom, searchMode);

  // Trigger immediate WebGL frame paint
  if (experience && experience.renderer) {
    experience.renderer.requestRender();
  }

  closeBuildingViewer();
}

function _resetHighlight() {
  // Clear building mesh highlights
  highlightedMeshes.forEach(child => {
    if (child.userData.origMat) {
      child.material = child.userData.origMat;
    }
  });
  highlightedMeshes = [];
  activeKey = null;
  document.querySelectorAll('#map-chips-bar .cat-btn').forEach(b => b.classList.remove('active-cat'));

  // Clear road segment route highlights
  clearRouteHighlight();

  // Clear active state from all route category buttons
  document.querySelectorAll('.route-category-btn').forEach(btn => {
    btn.classList.remove('active-route-btn');
  });

  _hideComplexCard();

  if (experience && experience.renderer) {
    experience.renderer.requestRender();
  }
}

// ── Dynamic Floor Tabs & Rooms Helper Functions ────────────────────────────────

function renderFloorTabs(floors, activeFloorNumber) {
  return floors.map(f => `
    <button class="floor-tab${f.number === activeFloorNumber ? ' active' : ''}" data-floor="${f.number}">
      Floor ${f.number}
    </button>
  `).join('');
}

function renderFloorRooms(floor) {
  if (!floor || !floor.rooms || floor.rooms.length === 0) {
    return `<div class="room-row room-row-empty"><span class="room-empty-text">No listed facilities on Floor ${floor?.number || 1}</span></div>`;
  }
  const iconMap = {
    office: 'mdi-briefcase-outline',
    hall: 'mdi-domain',
    lab: 'mdi-flask-outline',
    restroom: 'mdi-toilet',
    storage: 'mdi-package-variant-closed',
    room: 'mdi-door-sliding',
    facility: 'mdi-domain'
  };

  return floor.rooms.map(room => {
    let iconContent = '';
    if (room.iconHtml) {
      iconContent = room.iconHtml;
    } else if (room.icon && (room.icon.startsWith('<') || room.icon.startsWith('http'))) {
      iconContent = room.icon.startsWith('<') ? room.icon : `<img src="${room.icon}" alt="" />`;
    } else if (room.icon) {
      iconContent = `<span class="room-emoji">${room.icon}</span>`;
    } else if (room.type && iconMap[room.type]) {
      iconContent = `<i class="mdi ${iconMap[room.type]}" aria-hidden="true"></i>`;
    } else {
      iconContent = `<i class="mdi mdi-door-sliding" aria-hidden="true"></i>`;
    }

    const codeBadge = room.code ? `<span class="room-code">${room.code}</span>` : '';
    const subText = room.sub ? `<span class="room-sub">${room.sub}</span>` : '';
    const matchBadge = room.isMatched ? `<span class="floor-match-badge"><i class="mdi mdi-check-circle"></i> MATCHED</span>` : '';
    const matchedClass = room.isMatched ? ' room-row--matched' : '';

    return `
      <div class="room-row${matchedClass}">
        <span class="room-icon">${iconContent}</span>
        <div class="room-details">
          <span class="room-name">${room.name}</span>
          ${subText}
        </div>
        ${codeBadge}
        ${matchBadge}
      </div>
    `;
  }).join('');
}

function setActiveFloor(floorNumber, floors, container) {
  container.querySelectorAll('.floor-tab').forEach(tab => {
    tab.classList.toggle('active', Number(tab.dataset.floor) === floorNumber);
  });

  const roomsContainer = container.querySelector('.rooms-list');
  if (roomsContainer) {
    roomsContainer.style.opacity = '0';
    setTimeout(() => {
      const floor = floors.find(f => f.number === floorNumber);
      roomsContainer.innerHTML = renderFloorRooms(floor);
      roomsContainer.style.opacity = '1';
    }, 150);
  }
}

function renderFloorSection(floors, container) {
  if (!floors || floors.length === 0) {
    container.innerHTML = `<div class="room-row" style="color:#9ca3af; justify-content:center;">No floor details available</div>`;
    return;
  }

  // Default selection: select floor containing a search match, or lowest floor number
  const matchedFloorObj = floors.find(f => f.rooms.some(r => r.isMatched));
  const activeFloorNumber = matchedFloorObj ? matchedFloorObj.number : floors[0].number;
  const activeFloorObj = floors.find(f => f.number === activeFloorNumber) || floors[0];

  container.innerHTML = `
    <div class="floor-tabs-row">
      ${renderFloorTabs(floors, activeFloorNumber)}
    </div>
    <div class="rooms-list">
      ${renderFloorRooms(activeFloorObj)}
    </div>
  `;

  container.querySelectorAll('.floor-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      setActiveFloor(Number(tab.dataset.floor), floors, container);
    });
  });
}

function parseLocalFloors(depts, highlightRoom = null) {
  const floorMap = {};

  depts.forEach(d => {
    let assignedFloors = [];
    if (d.sub) {
      const rangeMatch = d.sub.match(/Floors?\s*(\d+)\s*[-–]\s*(\d+)/i);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        for (let f = start; f <= end; f++) assignedFloors.push(f);
      } else {
        const singleMatch = d.sub.match(/Floor\s*(\d+)/i);
        if (singleMatch) assignedFloors.push(parseInt(singleMatch[1], 10));
        else if (/ground/i.test(d.sub)) assignedFloors.push(1);
      }
    }
    if (assignedFloors.length === 0) assignedFloors.push(1);

    const isMatched = highlightRoom && `${d.name} ${d.sub || ''}`.toLowerCase().includes(highlightRoom.toLowerCase());

    assignedFloors.forEach(f => {
      if (!floorMap[f]) floorMap[f] = [];
      floorMap[f].push({
        name: d.name,
        sub: d.sub || '',
        icon: d.icon || '🏢',
        isMatched
      });
    });
  });

  const sortedFloorNums = Object.keys(floorMap).map(Number).sort((a, b) => a - b);
  if (sortedFloorNums.length === 0) sortedFloorNums.push(1);

  return sortedFloorNums.map(num => ({
    number: num,
    rooms: floorMap[num] || []
  }));
}

function parseSupabaseFloors(dbBuilding, highlightRoom = null) {
  const floorMap = {};

  const addToFloor = (floorNum, roomObj) => {
    const f = parseInt(floorNum, 10) || 1;
    if (!floorMap[f]) floorMap[f] = [];
    floorMap[f].push(roomObj);
  };

  (dbBuilding.ROOMS || []).forEach(r => {
    const name = r.Room_number && r.Room_name ? r.Room_number : (r.Room_name || r.Room_number || 'Unnamed Room');
    const sub = r.Room_number && r.Room_name ? r.Room_name : '';
    const searchStr = `${r.Room_number || ''} ${r.Room_name || ''}`.toLowerCase();
    const isMatched = highlightRoom && searchStr.includes(highlightRoom.toLowerCase());

    addToFloor(r.Floor, {
      name,
      sub,
      code: r.Room_number || '',
      type: 'room',
      iconHtml: '<i class="mdi mdi-door"></i>',
      isMatched
    });
  });

  (dbBuilding.OFFICES || []).forEach(o => {
    const sub = o.Abbreviations || o.Room_number || '';
    const searchStr = `${o.Office_name || ''} ${o.Abbreviations || ''} ${o.Room_number || ''}`.toLowerCase();
    const isMatched = highlightRoom && searchStr.includes(highlightRoom.toLowerCase());

    addToFloor(o.Floor, {
      name: o.Office_name,
      sub,
      code: o.Abbreviations || '',
      type: 'office',
      iconHtml: '<i class="mdi mdi-briefcase-outline"></i>',
      isMatched
    });
  });

  (dbBuilding.FACILITIES || []).forEach(f => {
    const sub = f.Abbreviations || f.Room_number || '';
    const searchStr = `${f.Facility_name || ''} ${f.Abbreviations || ''} ${f.Room_number || ''}`.toLowerCase();
    const isMatched = highlightRoom && searchStr.includes(highlightRoom.toLowerCase());

    addToFloor(f.Floor, {
      name: f.Facility_name,
      sub,
      code: f.Abbreviations || '',
      type: 'facility',
      iconHtml: '<i class="mdi mdi-domain"></i>',
      isMatched
    });
  });

  const sortedFloorNums = Object.keys(floorMap).map(Number).sort((a, b) => a - b);
  if (sortedFloorNums.length === 0) sortedFloorNums.push(1);

  return sortedFloorNums.map(num => ({
    number: num,
    rooms: floorMap[num] || []
  }));
}

// ── Info panel ────────────────────────────────────────────────────────────────

async function _openPanel(key, highlightRoom = null, searchMode = false) {
  const data = BUILDING_DATA[key];
  if (!data) return;
  if (data.interactive === false) return; // Static landmarks — no panel

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  // 1️⃣ Show panel INSTANTLY with local static data (zero network delay)
  const panel = document.getElementById('info-panel');
  if (panel) {
    panel.style.display = 'flex';
    requestAnimationFrame(() => {
      panel.classList.remove('panel-hidden');
    });
  }

  const buildingName = data.name;
  const buildingDesc = data.desc || '';
  const buildingImg = data.image || '/images/kinaadman.jpg';

  // Set building logo (prioritizes Supabase Logo_URL)
  const logoUrl = data.Logo_URL || data.logo;
  const iconEl = document.getElementById('panel-icon');
  if (iconEl) {
    if (logoUrl) {
      iconEl.innerHTML = `<img src="${logoUrl}" alt="${data.name} logo" />`;
      iconEl.style.background = 'transparent';
    } else {
      iconEl.textContent = data.emoji || '🏛';
      iconEl.style.background = 'rgba(255,255,255,0.15)';
    }
  }

  const imgIconEl = document.getElementById('panel-img-icon');
  if (imgIconEl) imgIconEl.style.display = 'none';

  set('panel-name', buildingName);
  set('panel-desc', buildingDesc);

  const imgEl = document.getElementById('panel-img-bg');
  if (imgEl) {
    imgEl.style.background = `url('${buildingImg}') center center / cover no-repeat`;
  }

  // Complex sub-buildings (not the main building) show no depts / facilities
  const isComplexSubBuilding = (data.isCAAComplexMember && key !== 'caa_building') ||
    (data.isKalinawComplexMember && key !== 'kalinaw');

  // Populate local fallback departments formatted into dynamic floor tabs
  const deptsWrap = document.getElementById('panel-depts-wrap');
  const deptsList = document.getElementById('panel-depts');

  if (deptsWrap && deptsList) {
    if (!isComplexSubBuilding && data.depts?.length) {
      const floors = parseLocalFloors(data.depts, highlightRoom);
      renderFloorSection(floors, deptsList);
      deptsWrap.style.display = '';
    } else {
      deptsWrap.style.display = 'none';
    }
  }

  // Search mode & Contact visibility
  const descWrap = document.querySelector('.panel-body > .panel-label:first-child');
  const descEl = document.getElementById('panel-desc');
  const contactWrap = document.getElementById('panel-contact-wrap');
  const contactContent = document.getElementById('panel-contact');
  const routeSection = document.getElementById('panel-route-section');
  const viewBtnWrap = document.getElementById('panel-view3d-wrap');
  const viewBtn = document.getElementById('panel-view3d-btn');

  if (searchMode) {
    if (descWrap) descWrap.style.display = 'none';
    if (descEl) descEl.style.display = 'none';
    if (contactWrap) contactWrap.style.display = 'none';
    if (routeSection) routeSection.style.display = 'none';
    if (viewBtnWrap) viewBtnWrap.style.display = 'none';
  } else {
    if (descWrap) descWrap.style.display = '';
    if (descEl) descEl.style.display = '';

    // ── Categorized Route Buttons (Nearest / Near / Far) ──
    const routeBtnsWrap = document.getElementById('panel-route-btns-wrap');
    if (routeBtnsWrap) {
      // Only show route buttons if this building has categorized routes defined
      if (!hasCategorizedRoutes(key)) {
        if (routeSection) routeSection.style.display = 'none';
        routeBtnsWrap.style.display = 'none';
      } else {
        if (routeSection) routeSection.style.display = '';
        routeBtnsWrap.style.display = 'grid';

        const btnNearest = document.getElementById('route-btn-nearest');
        const btnNear = document.getElementById('route-btn-near');
        const btnFar = document.getElementById('route-btn-far');
        const allRouteBtns = [btnNearest, btnNear, btnFar];
        const categories = ['nearest', 'near', 'far'];

        // Sync button states on panel open
        const activeCategory = getActiveRouteCategory();
        allRouteBtns.forEach((btn, i) => {
          if (btn) {
            btn.classList.toggle('active-route-btn', activeCategory === categories[i]);
          }
        });

        // Wire up each button
        categories.forEach((cat, i) => {
          const btn = allRouteBtns[i];
          if (!btn) return;

          btn.onclick = () => {
            const currentCategory = getActiveRouteCategory();

            if (currentCategory === cat) {
              // Toggle off — clear the highlight
              clearRouteHighlight();
              allRouteBtns.forEach(b => b && b.classList.remove('active-route-btn'));
            } else {
              // Activate this category's route
              const success = handleCategorizedRoute(key, cat);
              allRouteBtns.forEach(b => b && b.classList.remove('active-route-btn'));
              if (success && hasActiveRoute()) {
                btn.classList.add('active-route-btn');
              }
            }
          };
        });
      }
    }

    if (!isComplexSubBuilding && contactWrap && contactContent && data.contact) {
      contactContent.innerHTML =
        (data.contact.phone ? `📞 ${data.contact.phone}<br>` : '') +
        (data.contact.email ? `✉️ ${data.contact.email}` : '');
      contactWrap.style.display = '';
    } else if (contactWrap) {
      contactWrap.style.display = 'none';
    }

    // ── "View 3D Model" button (only on main buildings, not complex sub-buildings) ──
    if (viewBtnWrap && viewBtn) {
      if (isComplexSubBuilding) {
        viewBtnWrap.style.display = 'none';
      } else {
        viewBtnWrap.style.display = '';

        const handleOpen3D = async () => {
          // 1. If 3D model URL is already known/cached, open immediately
          if (data.model3d) {
            openBuildingViewer(data.model3d, data.name);
            return;
          }

          // 2. Otherwise fetch live model URL from Supabase on demand
          try {
            const originalText = viewBtn.innerHTML;
            viewBtn.innerHTML = `<span class="view3d-icon-wrap"><span class="mdi mdi-loading mdi-spin"></span></span> <span class="view3d-text">Loading 3D Model...</span>`;
            viewBtn.disabled = true;

            let dbB = null;
            if (data.supabaseId) {
              dbB = await getBuildingDetails(data.supabaseId);
            } else {
              dbB = await getBuildingByNameOrKey(key);
            }

            const modelUrl = extractModelUrl(dbB);
            viewBtn.innerHTML = originalText;
            viewBtn.disabled = false;

            if (modelUrl) {
              data.model3d = modelUrl;
              openBuildingViewer(modelUrl, data.name || dbB?.Building_name);
            } else {
              console.warn(`[MapOverlay] No 3D model found in Supabase for "${data.name}"`);
              alert(`No 3D model URL is configured for "${data.name}" yet.`);
            }
          } catch (e) {
            console.error('[MapOverlay] Error loading 3D model from Supabase:', e);
            viewBtn.disabled = false;
          }
        };

        viewBtn.onclick = handleOpen3D;
      } // end else (!isComplexSubBuilding)
    }
  }

  // 2️⃣ Asynchronously fetch live Supabase building record to enhance details in background
  try {
    let dbBuilding = null;
    if (data.supabaseId) {
      dbBuilding = await getBuildingDetails(data.supabaseId);
    } else {
      dbBuilding = await getBuildingByNameOrKey(key);
    }

    if (dbBuilding) {
      if (dbBuilding.Building_name) set('panel-name', dbBuilding.Building_name);
      if (dbBuilding.Description) set('panel-desc', dbBuilding.Description);
      if (dbBuilding.Image_URL && imgEl) {
        imgEl.style.background = `url('${dbBuilding.Image_URL}') center center / cover no-repeat`;
      }

      // Check and update live building logo from Supabase Logo_URL
      const dbLogo = dbBuilding.Logo_URL || dbBuilding.logo_url;
      if (dbLogo && iconEl) {
        data.Logo_URL = dbLogo;
        data.logo = dbLogo;
        iconEl.innerHTML = `<img src="${dbLogo}" alt="${dbBuilding.Building_name || data.name} logo" />`;
        iconEl.style.background = 'transparent';
      }

      // Check and attach live Supabase 3D model URL (only for main buildings)
      if (!isComplexSubBuilding) {
        const liveModelUrl = extractModelUrl(dbBuilding);
        if (liveModelUrl) {
          data.model3d = liveModelUrl;
          if (viewBtnWrap && viewBtn) {
            viewBtn.onclick = () => openBuildingViewer(liveModelUrl, dbBuilding.Building_name || data.name);
            viewBtnWrap.style.display = '';
          }
        }
      }

      // Dynamic Faculties & Offices from Supabase (skip for complex sub-buildings)
      if (!isComplexSubBuilding) {
        const hasSupabaseRooms = (
          (dbBuilding.ROOMS && dbBuilding.ROOMS.length > 0) ||
          (dbBuilding.OFFICES && dbBuilding.OFFICES.length > 0) ||
          (dbBuilding.FACILITIES && dbBuilding.FACILITIES.length > 0)
        );

        if (deptsWrap && deptsList) {
          if (hasSupabaseRooms) {
            const floors = parseSupabaseFloors(dbBuilding, highlightRoom);
            renderFloorSection(floors, deptsList);
            deptsWrap.style.display = '';
          } else {
            deptsList.innerHTML = '';
            deptsWrap.style.display = 'none';
          }
        }
      }

      // Dynamic Contact info from Supabase (skip for complex sub-buildings)
      const dbPhone = dbBuilding.Phone_number || dbBuilding.phone_number || dbBuilding.Contact_Number || dbBuilding.contact_number || dbBuilding.Phone || dbBuilding.phone || '';
      const dbEmail = dbBuilding.Contact_Email || dbBuilding.contact_email || dbBuilding.Email || dbBuilding.email || '';

      if (!isComplexSubBuilding && contactWrap && contactContent) {
        if (dbPhone || dbEmail) {
          contactContent.innerHTML =
            (dbPhone ? `📞 ${dbPhone}<br>` : '') +
            (dbEmail ? `✉️ ${dbEmail}` : '');
          contactWrap.style.display = '';
        } else {
          contactWrap.style.display = 'none';
        }
      }
    }
  } catch (err) {
    console.warn('[Panel] Could not load live Supabase record:', err);
  }
}


function _closePanel() {
  _resetHighlight();
  closeBuildingViewer();
  const panel = document.getElementById('info-panel');
  if (panel) {
    panel.classList.add('panel-hidden');
    setTimeout(() => { panel.style.display = 'none'; }, 350);
  }
  pinList.forEach(p => p.el.classList.remove('active-pin'));
  const input = document.getElementById('map-search');
  if (input) input.value = '';
  document.querySelectorAll('#map-chips-bar .cat-btn').forEach(b => b.classList.remove('active-cat'));
}

// ── 3D Pin markers ────────────────────────────────────────────────────────────

/**
/**
/**
 * createBuildingPin(building)
 * Renders a separated building marker with stacked circular seal badge (Logo_URL or emoji fallback)
 * and compact name label.
 * @param {Object} building - { name, Logo_URL, logo, emoji }
 */
function createBuildingPin(building) {
  const marker = document.createElement('div');
  marker.className = 'building-marker';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'marker-icon';

  const logoUrl = building.Logo_URL || building.logo;
  if (logoUrl) {
    const img = document.createElement('img');
    img.src = logoUrl;
    img.alt = `${building.name} logo`;
    img.onerror = () => {
      iconWrap.innerHTML = `<span style="font-size:15px;line-height:1;">${building.emoji || '🏛'}</span>`;
    };
    iconWrap.appendChild(img);
  } else {
    iconWrap.innerHTML = `<span style="font-size:15px;line-height:1;">${building.emoji || '🏛'}</span>`;
  }

  marker.appendChild(iconWrap);

  const label = document.createElement('span');
  label.className = 'marker-label';
  label.textContent = building.name;
  marker.appendChild(label);

  return marker;
}

/**
 * _createPinForKey(key)
 * Creates the DOM pin element for a single building key and appends it to the
 * #mapPins container. Called by _registerBuildingScene() as each GLB arrives.
 */
function _createPinForKey(key) {
  const container = document.getElementById('mapPins');
  if (!container) return;

  const data = BUILDING_DATA[key];
  if (!data || data.hidePin) return;

  // Don't create duplicate pins for the same key
  if (pinList.some(p => p.key === key)) return;

  const node = _findNode(key);
  if (!node) {
    console.warn(`[GIYA Map] Pin creation skipped: No 3D node for "${key}" (${data.name})`);
    return;
  }

  const worldPos = new THREE.Vector3();
  _box.setFromObject(node);
  _box.getCenter(worldPos);

  // Elevate the pin above the building's top face
  const height = _box.max.y - _box.min.y;
  worldPos.y = _box.max.y + Math.max(0.15, height * 0.05);

  if (data.pinOffset && Array.isArray(data.pinOffset)) {
    worldPos.x += data.pinOffset[0] || 0;
    worldPos.y += data.pinOffset[1] || 0;
    worldPos.z += data.pinOffset[2] || 0;
  }

  const el = document.createElement('div');
  el.className = 'bldg-pin';

  const isInteractive = data.interactive !== false;

  if (isInteractive) {
    el.style.cssText = 'position:absolute;transform:translate(-50%,-50%);cursor:pointer;pointer-events:all;z-index:5;';

    const buildingName = data.abbrev || data.shortName || data.name.split(' ')[0];
    const logoUrl = data.Logo_URL || data.logo || null;

    const pinEl = createBuildingPin({
      name: buildingName,
      Logo_URL: logoUrl,
      logo: logoUrl,
      emoji: data.emoji
    });

    el.appendChild(pinEl);

    el.addEventListener('click', () => {
      pinList.forEach(p => p.el.querySelector('.building-marker, .building-pin, .pin-label')?.classList.remove('active-pin'));
      pinEl.classList.add('active-pin');
      const input = document.getElementById('map-search');
      if (input) input.value = data.name;
      _selectBuilding(key, true);
    });
  } else if (!data.isCAAComplexMember && !data.isKalinawComplexMember) {
    // Only show static floating label for non-complex non-interactive buildings
    el.style.cssText = 'position:absolute;transform:translate(-50%,-50%);cursor:default;pointer-events:none;z-index:4;';
    el.innerHTML = `
      <div class="pin-label-static">${data.shortName || data.name}</div>
    `;
  } else {
    return; // Complex sub-buildings: no floating label shown
  }

  container.appendChild(el);
  pinList.push({ key, worldPos, el, interactive: isInteractive, data });
}

/**
 * Loads building seals (Logo_URL) live from Supabase buildings table and updates active pins
 */
async function _loadSupabaseSeals() {
  try {
    const buildings = await fetchBuildingSeals();
    if (!buildings || buildings.length === 0) return;

    console.log(`[Supabase] Loaded ${buildings.length} building records with college seals.`);

    buildings.forEach(b => {
      const logoUrl = b.Logo_URL || b.logo_url || null;
      if (!logoUrl) return;

      const dbId = b.id || b.Building_ID;
      const dbName = (b.name || b.Building_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      Object.keys(BUILDING_DATA).forEach(k => {
        const item = BUILDING_DATA[k];
        let match = false;

        if (item.supabaseId && dbId && item.supabaseId === dbId) {
          match = true;
        } else if (item.supabaseNames && Array.isArray(item.supabaseNames)) {
          match = item.supabaseNames.some(alias => alias.toLowerCase().replace(/[^a-z0-9]/g, '') === dbName);
        } else {
          const itemName = (item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          match = dbName && itemName && (dbName === itemName || dbName.includes(itemName) || itemName.includes(dbName));
        }

        if (match) {
          item.Logo_URL = logoUrl;

          // Update existing live pin element with the newly fetched seal
          const existing = pinList.find(p => p.key === k);
          if (existing && existing.interactive) {
            const oldMarkerEl = existing.el.querySelector('.building-marker, .building-pin');
            if (oldMarkerEl) {
              const buildingName = item.abbrev || item.shortName || item.name.split(' ')[0];
              const newMarkerEl = createBuildingPin({
                name: buildingName,
                Logo_URL: logoUrl,
                logo: logoUrl,
                emoji: item.emoji
              });
              if (oldMarkerEl.classList.contains('active-pin')) {
                newMarkerEl.classList.add('active-pin');
              }
              existing.el.replaceChild(newMarkerEl, oldMarkerEl);
            }
          }
        }
      });
    });
  } catch (err) {
    console.error('Error updating building seals from Supabase:', err);
  }
}

/**
 * _createPins() — legacy stub kept for safety.
 * With progressive loading, pins are created individually via _createPinForKey().
 */
function _createPins() {
  // No-op: pins now created one-at-a-time in _registerBuildingScene()
}

/**
 * _updatePins()
 * Project 3D world coordinates to 2D screen positions and perform
 * screen-space collision avoidance for dense building clusters.
 */
function _updatePins() {
  if (!experience || !worldReady) return;
  const cam = experience.camera.orthographicCamera;
  const W = experience.sizes.width;
  const H = experience.sizes.height;
  const zoom = cam.zoom;

  const visiblePins = [];

  pinList.forEach((pin) => {
    _projVec.copy(pin.worldPos).project(cam);
    if (_projVec.z > 1) {
      pin.el.style.visibility = 'hidden';
      return;
    }

    if (!pin.interactive) {
      if (!showAllUnclickable || zoom < 0.3) {
        pin.el.style.display = 'none';
        return;
      }
    }

    pin.el.style.display = '';
    pin.el.style.visibility = 'visible';

    const screenX = (_projVec.x * 0.5 + 0.5) * W;
    const screenY = (_projVec.y * -0.5 + 0.5) * H;

    pin.screenX = screenX;
    pin.screenY = screenY;
    pin.offsetY = 0;

    if (pin.interactive) {
      visiblePins.push(pin);
    } else {
      pin.el.style.left = screenX + 'px';
      pin.el.style.top = screenY + 'px';
    }
  });

  // ── Overlap handling / Collision avoidance for dense building clusters ──
  const COLLISION_DIST_X = 42; // px horizontal threshold
  const COLLISION_DIST_Y = 36; // px vertical threshold
  const STAGGER_STEP = 26;     // px vertical offset shift

  const clusters = [];

  visiblePins.forEach(pin => {
    let placed = false;
    for (const cluster of clusters) {
      const isNear = cluster.some(other =>
        Math.abs(pin.screenX - other.screenX) < COLLISION_DIST_X &&
        Math.abs(pin.screenY - other.screenY) < COLLISION_DIST_Y
      );
      if (isNear) {
        cluster.push(pin);
        placed = true;
        break;
      }
    }
    if (!placed) {
      clusters.push([pin]);
    }
  });

  clusters.forEach(cluster => {
    if (cluster.length <= 1) return;

    // Sort cluster pins from top to bottom
    cluster.sort((a, b) => a.screenY - b.screenY);

    const totalShift = (cluster.length - 1) * STAGGER_STEP;
    const startOffset = -totalShift / 2;

    cluster.forEach((pin, idx) => {
      pin.offsetY = startOffset + idx * STAGGER_STEP;
    });
  });

  visiblePins.forEach(pin => {
    pin.el.style.left = pin.screenX + 'px';
    pin.el.style.top = (pin.screenY + pin.offsetY) + 'px';
  });
}

// ── Search (wired to existing #map-search input) ──────────────────────────────

function _findKeyByBuildingName(name) {
  if (!name) return null;
  const clean = name.toLowerCase().trim();

  // Normalize a string: lowercase, remove punctuation/underscores/extra spaces
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

  const cleanNorm = normalize(clean);

  // ── Strategy 0: Check supabaseNames aliases (highest priority) ───────────────────
  for (const [k, b] of Object.entries(BUILDING_DATA)) {
    if (!b.supabaseNames) continue;
    const hit = b.supabaseNames.some(alias =>
      normalize(alias) === cleanNorm ||
      normalize(alias).includes(cleanNorm) ||
      cleanNorm.includes(normalize(alias))
    );
    if (hit) return k;
  }

  // ── Strategy 1: Exact normalized name match ──────────────────────────────
  for (const [k, b] of Object.entries(BUILDING_DATA)) {
    if (normalize(b.name) === cleanNorm) return k;
  }

  // ── Strategy 2: Normalized name contains the other (substring) ───────────
  for (const [k, b] of Object.entries(BUILDING_DATA)) {
    const bNorm = normalize(b.name);
    if (bNorm.includes(cleanNorm) || cleanNorm.includes(bNorm)) return k;
  }

  // ── Strategy 3: Key-derived words vs. query words (word overlap) ──────────
  // e.g. "new_administrative_bldg" → ["new","administrative","bldg"] vs "new admin building"
  const queryWords = cleanNorm.split(' ').filter(w => w.length > 2);
  let bestKey = null;
  let bestScore = 0;

  for (const [k, b] of Object.entries(BUILDING_DATA)) {
    const keyWords = normalize(k.replace(/_/g, ' ')).split(' ').filter(w => w.length > 2);
    const nameWords = normalize(b.name).split(' ').filter(w => w.length > 2);
    const allWords = [...new Set([...keyWords, ...nameWords])];

    let score = 0;
    for (const qw of queryWords) {
      // Allow prefix matching (e.g. "admin" matches "administrative")
      if (allWords.some(w => w.startsWith(qw) || qw.startsWith(w))) score++;
    }
    if (score > bestScore) { bestScore = score; bestKey = k; }
  }

  if (bestScore > 0) return bestKey;

  console.warn(`[GIYA Search] Could not map building name "${name}" to any BUILDING_DATA key.`);
  return null;
}

async function _handleSearch(query) {
  const q = query.trim();
  if (!q) return;

  // 1️⃣ Check direct building name/alias match first for instant 0ms highlight
  const directKey = _findKeyByBuildingName(q) || Object.keys(BUILDING_DATA).find(k =>
    BUILDING_DATA[k].interactive !== false &&
    (k.toLowerCase() === q.toLowerCase() ||
      BUILDING_DATA[k].name.toLowerCase() === q.toLowerCase() ||
      (BUILDING_DATA[k].shortName && BUILDING_DATA[k].shortName.toLowerCase() === q.toLowerCase()) ||
      (BUILDING_DATA[k].abbrev && BUILDING_DATA[k].abbrev.toLowerCase() === q.toLowerCase()))
  );

  if (directKey) {
    const input = document.getElementById('map-search');
    if (input) input.value = BUILDING_DATA[directKey]?.name || directKey;
    _selectBuilding(directKey, true, false, null);
    return;
  }

  // 2️⃣ Search Supabase rooms, offices, facilities
  const { rooms, offices, facilities } = await searchCampusEntities(q);

  if (rooms.length > 0) {
    const r = rooms[0];
    const buildingName = r.BUILDINGS?.Building_name;
    const key = _findKeyByBuildingName(buildingName);
    if (key) {
      const input = document.getElementById('map-search');
      if (input) input.value = `${r.Room_number || r.Room_name} (${buildingName})`;
      _selectBuilding(key, true, true, r.Room_number || r.Room_name, true);
      return;
    }
  }

  if (offices.length > 0) {
    const o = offices[0];
    const buildingName = o.BUILDINGS?.Building_name;
    const key = _findKeyByBuildingName(buildingName);
    if (key) {
      const input = document.getElementById('map-search');
      if (input) input.value = `${o.Office_name} (${buildingName})`;
      _selectBuilding(key, true, true, o.Office_name, true);
      return;
    }
  }

  if (facilities.length > 0) {
    const f = facilities[0];
    const buildingName = f.BUILDINGS?.Building_name;
    const key = _findKeyByBuildingName(buildingName);
    if (key) {
      const input = document.getElementById('map-search');
      if (input) input.value = `${f.Facility_name} (${buildingName})`;
      _selectBuilding(key, true, true, f.Facility_name, true);
      return;
    }
  }

  // 3️⃣ Partial fallback match for building names
  const key = Object.keys(BUILDING_DATA).find(k =>
    BUILDING_DATA[k].interactive !== false &&
    (k.toLowerCase().includes(q.toLowerCase()) ||
      BUILDING_DATA[k].name.toLowerCase().includes(q.toLowerCase()) ||
      (BUILDING_DATA[k].shortName && BUILDING_DATA[k].shortName.toLowerCase().includes(q.toLowerCase())) ||
      (BUILDING_DATA[k].abbrev && BUILDING_DATA[k].abbrev.toLowerCase().includes(q.toLowerCase())))
  );

  if (key) {
    const input = document.getElementById('map-search');
    if (input) input.value = BUILDING_DATA[key]?.name || key;
    _selectBuilding(key, true, false, null);
  } else {
    const dd = document.getElementById('search-dropdown');
    if (dd) { dd.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:#6b7280;">No matches found</div>'; dd.style.display = 'block'; }
  }
}

async function _buildDropdown(query) {
  const dd = document.getElementById('search-dropdown');
  if (!dd) return;
  if (!query.trim() || query.trim().length < 2) { dd.style.display = 'none'; return; }

  const { buildings, rooms, offices, facilities } = await searchCampusEntities(query);

  let html = '';

  // 1. Render matched Rooms
  rooms.forEach(r => {
    const bName = r.BUILDINGS?.Building_name || 'Building';
    const target = r.Room_number || r.Room_name || '';
    const roomSub = (r.Room_number && r.Room_name) ? ` — ${r.Room_name}` : (r.Room_name && !r.Room_number ? r.Room_name : '');
    const roomMain = r.Room_number || r.Room_name || 'Unnamed Room';
    html += `
      <div data-type="room" data-building="${bName}" data-target="${target}" class="search-dropdown-item">
        <span><i class="mdi mdi-door"></i></span>
        <span><strong>${roomMain}</strong>${r.Room_number && r.Room_name ? ` — ${r.Room_name}` : ''}</span>
        <span class="search-dropdown-item-type">in ${bName}</span>
      </div>`;
  });

  // 2. Render matched Offices
  offices.forEach(o => {
    const bName = o.BUILDINGS?.Building_name || 'Building';
    html += `
      <div data-type="office" data-building="${bName}" data-target="${o.Office_name}" class="search-dropdown-item">
        <span><i class="mdi mdi-briefcase-outline"></i></span>
        <span>${o.Office_name}</span>
        <span class="search-dropdown-item-type">in ${bName}</span>
      </div>`;
  });

  // 3. Render matched Facilities
  facilities.forEach(f => {
    const bName = f.BUILDINGS?.Building_name || 'Building';
    html += `
      <div data-type="facility" data-building="${bName}" data-target="${f.Facility_name}" class="search-dropdown-item">
        <span><i class="mdi mdi-domain"></i></span>
        <span>${f.Facility_name}</span>
        <span class="search-dropdown-item-type">in ${bName}</span>
      </div>`;
  });

  // 4. Render matched Local Buildings
  const qLower = query.toLowerCase();
  const localMatches = Object.entries(BUILDING_DATA).filter(([k, b]) =>
    b.interactive !== false &&
    (k.toLowerCase().includes(qLower) ||
      b.name.toLowerCase().includes(qLower) ||
      (b.shortName && b.shortName.toLowerCase().includes(qLower)) ||
      (b.abbrev && b.abbrev.toLowerCase().includes(qLower)) ||
      (b.supabaseNames && b.supabaseNames.some(s => s.toLowerCase().includes(qLower))))
  );

  localMatches.forEach(([key, b]) => {
    html += `
      <div data-type="building" data-key="${key}" class="search-dropdown-item">
        <span>${b.emoji || '🏛'}</span>
        <span>${b.name}</span>
        <span class="search-dropdown-item-type">${b.type || 'Building'}</span>
      </div>`;
  });

  if (!html) {
    dd.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:#6b7280;">No matches found</div>';
    dd.style.display = 'block';
    return;
  }

  dd.innerHTML = html;

  // Add click events for dropdown items
  dd.querySelectorAll('.search-dropdown-item').forEach(el => {
    el.addEventListener('click', () => {
      const type = el.dataset.type;
      dd.style.display = 'none';

      if (type === 'building') {
        const k = el.dataset.key;
        const input = document.getElementById('map-search');
        if (input) input.value = BUILDING_DATA[k]?.name || k;
        _selectBuilding(k, true, false, null);
      } else {
        const buildingName = el.dataset.building;
        const targetName = el.dataset.target;
        const input = document.getElementById('map-search');
        if (input) input.value = `${targetName} (${buildingName})`;

        const key = _findKeyByBuildingName(buildingName);
        if (key) {
          // Select building, open panel in search mode, SUPPRESS 3D MODEL VIEWER, highlight target!
          _selectBuilding(key, true, true, targetName, true);
        }
      }
    });
  });

  dd.style.display = 'block';
}


// ── Init ──────────────────────────────────────────────────────────────────────

export function initMapOverlay() {
  // Expose for inline onclick in HTML
  window.openMapOverlay = openMapOverlay;
  window.closeMapOverlay = closeMapOverlay;

  // Bind launch buttons
  const launchIds = ['nav-launch-map', 'hero-explore-map', 'cta-explore-map'];
  launchIds.forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', e => {
        e.preventDefault();
        openMapOverlay();
      });
    }
  });

  // Bind close button
  const mapCloseBtn = document.getElementById('map-close-btn');
  if (mapCloseBtn) {
    mapCloseBtn.addEventListener('click', e => {
      e.preventDefault();
      closeMapOverlay();
    });
  }

  // Escape closes overlay
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMapOverlay(); });

  // Search input
  const searchInput = document.getElementById('map-search');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      const raw = e.target.value;
      const q = raw.trim();

      if (!q) {
        _resetHighlight();
        const dd = document.getElementById('search-dropdown');
        if (dd) dd.style.display = 'none';
        return;
      }

      // Populate search dropdown suggestions as user types
      _buildDropdown(raw);
    });

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        _handleSearch(e.target.value);
        const dd = document.getElementById('search-dropdown');
        if (dd) dd.style.display = 'none';
      }
    });
  }

  // Close search dropdown on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('#map-search') && !e.target.closest('#search-dropdown')) {
      const dd = document.getElementById('search-dropdown');
      if (dd) dd.style.display = 'none';
    }
  });

  // Close panel button (now has id instead of onclick)
  const closeBtn = document.getElementById('panel-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', _closePanel);

  // Prevent map drag/zoom while scrolling inside info panel
  const infoPanelEl = document.getElementById('info-panel');
  if (infoPanelEl) {
    infoPanelEl.addEventListener('wheel', e => e.stopPropagation(), { passive: true });
    infoPanelEl.addEventListener('pointerdown', e => e.stopPropagation());
    infoPanelEl.addEventListener('mousedown', e => e.stopPropagation());
    infoPanelEl.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    infoPanelEl.addEventListener('touchmove', e => e.stopPropagation(), { passive: true });
  }

  // View toggle (2D / 3D) event listeners
  const btn2D = document.getElementById('view-toggle-2d');
  const btn3D = document.getElementById('view-toggle-3d');
  if (btn2D && btn3D) {
    btn2D.addEventListener('click', () => {
      if (experience && experience.controls) {
        experience.controls.setViewMode('2D');
      }
    });
    btn3D.addEventListener('click', () => {
      if (experience && experience.controls) {
        experience.controls.setViewMode('3D');
      }
    });
  }

  // Show All button listener
  const showAllBtn = document.getElementById('show-all-btn');
  if (showAllBtn) {
    showAllBtn.addEventListener('click', () => {
      showAllUnclickable = !showAllUnclickable;
      showAllBtn.classList.toggle('active', showAllUnclickable);
      const textSpan = showAllBtn.querySelector('span:not(.mdi)');
      if (textSpan) textSpan.textContent = showAllUnclickable ? 'Hide Buildings' : 'Show All';
      const icon = showAllBtn.querySelector('.mdi');
      if (icon) {
        icon.className = showAllUnclickable ? 'mdi mdi-eye-off-outline' : 'mdi mdi-eye-outline';
      }
      _buildChips();
      if (worldReady) {
        _updatePins();
      }
    });
  }

  // ── Raycast click handler for 3D building models on the canvas ────────────
  const canvas = document.querySelector('.experience-canvas');
  if (canvas) {
    let pointerDownPos = { x: 0, y: 0 };

    canvas.addEventListener('pointerdown', e => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('pointerup', e => {
      // Ignore dragging / camera orbit rotation
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return;
      if (!experience || !experience.camera || !worldReady) return;

      const rect = canvas.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, experience.camera.orthographicCamera);

      const meshes = [];
      Object.values(meshIndex).forEach(node => {
        if (!node) return;
        if (node.isMesh) meshes.push(node);
        else if (node.traverse) {
          node.traverse(child => { if (child.isMesh) meshes.push(child); });
        }
      });

      const intersects = raycaster.intersectObjects(meshes, false);
      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        for (const [key, bData] of Object.entries(BUILDING_DATA)) {
          if (bData.interactive === false) continue;
          const node = _findNode(key);
          if (node) {
            let matched = false;
            if (node === hitMesh) matched = true;
            else if (node.traverse) {
              node.traverse(child => { if (child === hitMesh) matched = true; });
            }
            if (matched) {
              _selectBuilding(key, true);
              const input = document.getElementById('map-search');
              if (input) input.value = bData.name;
              break;
            }
          }
        }
      }
    });
  }

  // Keep old globals for any stray references
  window.closePanel = _closePanel;
  window.filterBuildings = q => _buildDropdown(q);

  // Hide panel initially
  const panel = document.getElementById('info-panel');
  if (panel) panel.style.display = 'none';

  // Boot the 3D Experience in the background immediately on page load
  _bootExperience();

  // Sync 3D model URLs from Supabase on init
  _syncSupabaseModels();
}

