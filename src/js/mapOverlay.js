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

// ── Building registry ─────────────────────────────────────────────────────────
// Keys must match (lowercased, trimmed) mesh names exported in your GLB file.
// Run the app, open the console and look for the logged mesh names after load.
const BUILDING_DATA = {
  "masawa_building": {
    name: "Masawa Building", shortName: "Masawa", type: "Academic Building", emoji: "🏫",
    image: "/images/masawa.jpg",
    logo: "/images/logo ccis.jpg",
    gradient: "linear-gradient(135deg, #1a3a5c 0%, #2d6a9f 100%)",
    desc: "Houses the College of Computing and Information Sciences (CCIS), offering undergraduate programs in Computer Science, Information Technology, and related fields. Equipped with modern computer labs and development studios.",
    depts: [
      { icon: "💻", name: "College of Computing & Information Sciences", sub: "All Floors" },
      { icon: "🖥️", name: "Computer Labs 1–4", sub: "Floors 1–2" },
      { icon: "🔐", name: "IT Resource Center", sub: "Floor 3" },
    ],
    contact: { phone: "(085) 341-2321", email: "ccis@csu.edu.ph" }
  },
  "hinang_building": {
    name: "Hinang Building", shortName: "Hinang", type: "Academic Building", emoji: "🏛",
    image: "/images/hinang.jpg",
    logo: "/images/logo cegs.jpg",
    gradient: "linear-gradient(135deg, #1a4a2e 0%, #2e7d52 100%)",
    model3d: "/models/hinang.draco.glb",
    desc: "Home of the College of Engineering and Geosciences (CEGS), providing programs in Civil, Electrical, and Mechanical Engineering. Features laboratories, drafting rooms, and workshops for hands-on technical education.",
    depts: [
      { icon: "⚙️", name: "College of Engineering & Geosciences", sub: "All Floors" },
      { icon: "🏗️", name: "Civil Engineering Lab", sub: "Ground Floor" },
      { icon: "⚡", name: "Electrical Engineering Lab", sub: "Floor 2" },
      { icon: "🔧", name: "Mechanical Workshop", sub: "Floor 3" },
    ],
    contact: { phone: "(085) 341-2322", email: "cegs@csu.edu.ph" }
  },
  "kinaadman_hall": {
    name: "Kinaadman Hall", shortName: "Kinaadman", type: "Academic Hall", emoji: "🎓",
    image: "/images/kinaadman.jpg",
    logo: "/images/logo chass.jpg",
    gradient: "linear-gradient(135deg, #2c1a4e 0%, #5a3a8c 100%)",
    model3d: "/models/kinaadman.draco.glb",
    desc: "Named after the Bisaya word for knowledge, Kinaadman Hall is the intellectual hub of the campus. It houses the College of Humanities, Arts, and Social Sciences (CHASS) alongside the University Research Center.",
    depts: [
      { icon: "📚", name: "College of Humanities, Arts & Social Sciences", sub: "Floors 1–3" },
      { icon: "🔬", name: "University Research Center", sub: "Floor 4" },
      { icon: "📖", name: "Library Annex", sub: "Ground Floor" },
    ],
    contact: { phone: "(085) 341-2323", email: "chass@csu.edu.ph" }
  },
  "hiaraya_building": {
    name: "Hiraya Building", shortName: "Hiraya", type: "Academic Building", emoji: "🌟",
    image: "/images/hiraya.jpg",
    logo: "/images/logo ccis.jpg",
    gradient: "linear-gradient(135deg, #4a2800 0%, #a05010 100%)",
    model3d: "/models/hiraya.draco.glb",
    desc: "The Hiraya Building supports the College of Agriculture and Natural Resources (CANR) and the College of Fisheries. It offers programs and research facilities centered on sustainable agriculture, aquaculture, and environmental science.",
    depts: [
      { icon: "🌾", name: "College of Agriculture & Natural Resources", sub: "Floors 1–2" },
      { icon: "🐟", name: "College of Fisheries", sub: "Floor 3" },
      { icon: "🧪", name: "Agricultural Science Labs", sub: "Ground Floor" },
    ],
    contact: { phone: "(085) 341-2324", email: "canr@csu.edu.ph" }
  },
  "batok_hall": {
    name: "Batok Hall", shortName: "Batok", type: "Multi-Purpose Hall", emoji: "🏟",
    image: "/images/batok.jpg",
    logo: "/images/logo chass.jpg",
    gradient: "linear-gradient(135deg, #5c1a1a 0%, #9f2d2d 100%)",
    model3d: "/models/nsb-batok.draco.glb",
    desc: "The primary venue for university-wide events, convocations, commencement ceremonies, and large-scale student activities. Batok Hall seats over 1,000 people and is equipped with full audio-visual systems.",
    depts: [
      { icon: "🏢", name: "Events & Facilities Office", sub: "Ground Floor" },
      { icon: "🎤", name: "Main Auditorium", sub: "Main Hall" },
      { icon: "🎪", name: "Student Activity Center", sub: "Side Wing" },
    ],
    contact: { phone: "(085) 341-2325", email: "events@csu.edu.ph" }
  },
  "new_administrative_bldg": {
    name: "New Admin Building", shortName: "Admin", type: "Administration", emoji: "🏢",
    image: "/images/new admin.jpeg",
    logo: "/images/logo ccis.jpg",
    gradient: "linear-gradient(135deg, #003300 0%, #006600 100%)",
    model3d: "/models/textured-admin-building.draco.glb",   // ← lazy-loaded on demand
    desc: "The central hub for all administrative operations of Caraga State University. Houses the Office of the President, University Registrar, Finance Division, and student support services. One-stop for all official university transactions.",
    depts: [
      { icon: "🎓", name: "Office of the University President", sub: "Floor 4" },
      { icon: "📋", name: "University Registrar's Office", sub: "Ground Floor" },
      { icon: "💰", name: "Finance & Accounting Division", sub: "Floor 2" },
      { icon: "👥", name: "Student Affairs & Services", sub: "Floor 3" },
      { icon: "📢", name: "Public Information Office", sub: "Floor 1" },
    ],
    contact: { phone: "(085) 341-2300", email: "admin@csu.edu.ph" }
  },
  "state-of-the-art-library": {
    name: "State-of-the-Art Library", shortName: "Library", type: "Library / Learning Hub", emoji: "📖",
    image: "/images/kinaadman.jpg",
    logo: "/images/logo ccis.jpg",
    gradient: "linear-gradient(135deg, #1b3548 0%, #3e6d8a 100%)",
    model3d: "/models/textured-library.draco.glb",
    desc: "Caraga State University's main campus library. Houses vast print collections, multimedia centers, digital learning lounges, research archives, and open study areas for all student levels.",
    depts: [
      { icon: "📚", name: "Circulation & Reference Section", sub: "Floor 1" },
      { icon: "🖥️", name: "E-Library & Multimedia Lounge", sub: "Floor 2" },
      { icon: "🔍", name: "Graduate Research Section", sub: "Floor 3" }
    ],
    contact: { phone: "(085) 341-2350", email: "library@csu.edu.ph" }
  },
  "kalinaw": {
    name: "Kalinaw Hall", shortName: "Kalinaw", type: "Guest House & Seminar Center", emoji: "🏨",
    image: "/images/kinaadman.jpg",
    logo: "/images/logo chass.jpg",
    gradient: "linear-gradient(135deg, #2b453a 0%, #4c7764 100%)",
    desc: "Acts as the university's prime guest facility, lodging services, and executive seminar workspace, providing high-quality hospitality accommodations for visiting scholars and events.",
    depts: [
      { icon: "🛏️", name: "Guest Suites & Dormitories", sub: "Floors 2–3" },
      { icon: "🎙️", name: "Executive Seminar Rooms", sub: "Floor 1" },
      { icon: "☕", name: "Social & Catering Services", sub: "Floor 1" }
    ],
    contact: { phone: "(085) 341-2361", email: "kalinaw@csu.edu.ph" }
  },
  "csu_student_center": {
    name: "Student Center", shortName: "Student Center", abbrev: "Std. Ctr.", type: "Student Services", emoji: "🏢",
    image: "/images/kinaadman.jpg",
    logo: "/images/logo ccis.jpg",
    gradient: "linear-gradient(135deg, #3d3b5c 0%, #696599 100%)",
    desc: "The nerve center for all student activities, student government leadership meetings, publications, and student welfare services.",
    depts: [
      { icon: "⚖️", name: "University Student Council Office", sub: "Floor 2" },
      { icon: "📰", name: "Gold Collar Publications", sub: "Floor 2" },
      { icon: "🎭", name: "Organization Workspaces", sub: "Floor 1" }
    ],
    contact: { phone: "(085) 341-2370", email: "studentcenter@csu.edu.ph" }
  },
  "ced_building": {
    name: "CED Building", shortName: "CED", type: "Academic Building", emoji: "🏫",
    image: "/images/kinaadman.jpg",
    logo: "/images/logo cegs.jpg",
    gradient: "linear-gradient(135deg, #4d2020 0%, #853e3e 100%)",
    desc: "Houses the College of Education (CED). Dedicated to training and preparing the next generation of educators, instructors, and specialists.",
    depts: [
      { icon: "🍎", name: "Elementary & Secondary Education", sub: "Floor 1" },
      { icon: "🏃", name: "Physical Education Department", sub: "Floor 2" },
      { icon: "📖", name: "Professional Education Department", sub: "Floor 3" }
    ],
    contact: { phone: "(085) 341-2330", email: "ced@csu.edu.ph" }
  },
  "caa_building": {
    name: "CAA Building", shortName: "CAA", type: "Academic Building", emoji: "🌾",
    image: "/images/kinaadman.jpg",
    logo: "/images/logo cegs.jpg",
    gradient: "linear-gradient(135deg, #384218 0%, #687a33 100%)",
    desc: "College of Agriculture and Forestry. Equipped with laboratories for soil studies, plant sciences, and research spaces supporting campus agricultural farms.",
    depts: [
      { icon: "🌱", name: "Agricultural Science Dept", sub: "Floor 1" },
      { icon: "🌲", name: "Forestry & Silviculture Section", sub: "Floor 2" }
    ],
    contact: { phone: "(085) 341-2340", email: "caa@csu.edu.ph" }
  },
  "dost": {
    name: "DOST Building", shortName: "DOST", type: "Research Center", emoji: "🔬",
    image: "/images/kinaadman.jpg",
    logo: "/images/logo ccis.jpg",
    gradient: "linear-gradient(135deg, #0f2c59 0%, #205090 100%)",
    desc: "Department of Science and Technology research center. Hosts joint innovation labs, meteorological research units, and regional development initiatives.",
    depts: [
      { icon: "🔬", name: "CSU-DOST Regional Laboratory", sub: "Floor 1" },
      { icon: "🛰️", name: "Geospatial Research Center", sub: "Floor 2" }
    ],
    contact: { phone: "(085) 341-2390", email: "dost@csu.edu.ph" }
  },
  "food_innovation_center": {
    name: "Food Innovation Center", shortName: "FIC", type: "Research & Development Center", emoji: "🍎",
    image: "/images/kinaadman.jpg",
    logo: "/images/logo cegs.jpg",
    gradient: "linear-gradient(135deg, #6b4311 0%, #a16c27 100%)",
    model3d: "/models/food%20technology%20center.draco.glb",
    desc: "Dedicated to local food technology development, offering testing laboratories and processing machinery for food scientists and agricultural graduates.",
    depts: [
      { icon: "🧪", name: "Food Testing Lab", sub: "Floor 1" },
      { icon: "⚙️", name: "Product Development Wing", sub: "Floor 1" }
    ],
    contact: { phone: "(085) 341-2388", email: "fic@csu.edu.ph" }
  },
  "hostel": {
    name: "University Hostel", shortName: "Hostel", type: "Accommodation", emoji: "🏨",
    image: "/images/kinaadman.jpg",
    logo: "/images/logo chass.jpg",
    gradient: "linear-gradient(135deg, #1b3d35 0%, #30665a 100%)",
    desc: "Campus hostel facility providing lodging services, conference spaces, and visitor suites for incoming guests and scholars.",
    depts: [
      { icon: "🛏️", name: "Guest Accommodations", sub: "Floors 1–2" },
      { icon: "🍽️", name: "Lobby Dining area", sub: "Floor 1" }
    ],
    contact: { phone: "(085) 341-2365", email: "hostel@csu.edu.ph" }
  },
  "school_of_medicine_(_under_cons_)": {
    name: "School of Medicine", shortName: "Medicine", type: "Under Construction", emoji: "🏥",
    image: "/images/kinaadman.jpg",
    logo: "/images/logo ccis.jpg",
    gradient: "linear-gradient(135deg, #1c4558 0%, #2f6983 100%)",
    desc: "Future campus building dedicated to the upcoming College of Medicine, designed to house advanced clinical laboratories and simulation classrooms.",
    depts: [
      { icon: "🏗️", name: "Construction Site - Under Development", sub: "N/A" }
    ],
    contact: { phone: "(085) 341-2300", email: "medicine.project@csu.edu.ph" }
  },
  "csu_gym": {
    name: "University Gymnasium", shortName: "Gymnasium", type: "Under Construction", emoji: "🏟",
    image: "/images/kinaadman.jpg",
    logo: "/images/logo chass.jpg",
    gradient: "linear-gradient(135deg, #441c58 0%, #683083 100%)",
    model3d: "/models/textured-gym-building.draco.glb",
    desc: "Future state-of-the-art sports arena for university athletics, concerts, cultural pageants, and campus gatherings.",
    depts: [
      { icon: "🏗️", name: "Construction Site - Under Development", sub: "N/A" }
    ],
    contact: { phone: "(085) 341-2300", email: "gym.project@csu.edu.ph" }
  },
  "old_administrative_building": {
    name: "Old Admin Building", shortName: "Old Admin", abbrev: "Old Admin", type: "Academic Support", emoji: "🏢",
    image: "/images/kinaadman.jpg",
    logo: "/images/logo chass.jpg",
    gradient: "linear-gradient(135deg, #3d3b5c 0%, #696599 100%)",
    desc: "The legacy administrative center, now housing auxiliary units, faculty offices, and legacy records departments.",
    depts: [
      { icon: "📦", name: "Auxiliary Records Office", sub: "Floor 1" },
      { icon: "👥", name: "Faculty Lounge & Offices", sub: "Floor 2" }
    ],
    contact: { phone: "(085) 341-2305", email: "oldadmin@csu.edu.ph" }
  },

  "old_cas": {
    name: "Old CAS Building", shortName: "Old CAS", type: "Academic Building", emoji: "🏫",
    image: "/images/kinaadman.jpg",
    logo: "/images/logo ccis.jpg",
    gradient: "linear-gradient(135deg, #2a3a1a 0%, #4a6a2a 100%)",
    model3d: "/models/old_cas.draco.glb",
    desc: "Original College of Arts and Sciences building, now serving as additional academic space for various university departments and administrative units.",
    depts: [
      { icon: "📚", name: "Arts & Sciences Departments", sub: "All Floors" },
    ],
    contact: { phone: "(085) 341-2300", email: "cas@csu.edu.ph" }
  },
  "sports_office": {
    name: "Sports Office", shortName: "Sports Office", type: "Athletics & Sports", emoji: "🏆",
    image: "/images/kinaadman.jpg",
    logo: "/images/logo chass.jpg",
    gradient: "linear-gradient(135deg, #1a2a4a 0%, #2a4a8a 100%)",
    model3d: "/models/sports_office.draco.glb",
    desc: "Headquarters of the University Athletics program, managing varsity teams, intramural leagues, sports events, and student athletic development.",
    depts: [
      { icon: "⚽", name: "University Athletics Office", sub: "Ground Floor" },
      { icon: "🏃", name: "Varsity & Intramurals", sub: "Ground Floor" },
    ],
    contact: { phone: "(085) 341-2380", email: "sports@csu.edu.ph" }
  },

  "Villares": {
    name: "Villares", shortName: "Villares", type: "Athletics & Sports", emoji: "🏆",
    image: "/images/kinaadman.jpg",
    logo: "/images/logo chass.jpg",
    gradient: "linear-gradient(135deg, #1a2a4a 0%, #2a4a8a 100%)",
    model3d: "/models/sports_office.draco.glb",
    desc: "Headquarters of the University Athletics program, managing varsity teams, intramural leagues, sports events, and student athletic development.",
    depts: [
      { icon: "⚽", name: "University Athletics Office", sub: "Ground Floor" },
      { icon: "🏃", name: "Varsity & Intramurals", sub: "Ground Floor" },
    ],
    contact: { phone: "(085) 341-2380", email: "sports@csu.edu.ph" }
  },
  "Annex 3": {
    name: "Annex 3", shortName: "Annex 3", type: "Athletics & Sports", emoji: "🏆",
    image: "/images/kinaadman.jpg",
    logo: "/images/logo chass.jpg",
    gradient: "linear-gradient(135deg, #1a2a4a 0%, #2a4a8a 100%)",
    model3d: "/models/sports_office.draco.glb",
    desc: "Headquarters of the University Athletics program, managing varsity teams, intramural leagues, sports events, and student athletic development.",
    depts: [
      { icon: "⚽", name: "University Athletics Office", sub: "Ground Floor" },
      { icon: "🏃", name: "Varsity & Intramurals", sub: "Ground Floor" },
    ],
    contact: { phone: "(085) 341-2380", email: "sports@csu.edu.ph" }
  },


  // ── NON-INTERACTIVE LANDMARKS (Static labels, no info panels) ──
  "bbc_cafeteria": { name: "BBC Cafeteria", shortName: "BBC Cafeteria", interactive: false },
  "canteen": { name: "Main Canteen", shortName: "Canteen", interactive: false },
  "ced_canteen": { name: "CED Canteen", shortName: "CED Canteen", interactive: false },
  "caa_canteen": { name: "CAA Canteen", shortName: "CAA Canteen", interactive: false },
  "overpass": { name: "Campus Overpass", shortName: "Overpass", interactive: false },
  "guard_house": { name: "Guard House", shortName: "Guard House", interactive: false },
  "guard_house001": { name: "Guard House", shortName: "Guard House", interactive: false },

  "harrison_statue": { name: "Harrison Statue", shortName: "Harrison Statue", interactive: false },
  "ochoa_statue": { name: "Ochoa Statue", shortName: "Ochoa Statue", interactive: false },
  "green_house": { name: "Green House", shortName: "Green House", interactive: false },
  "micoriza_green_house": { name: "Micoriza Green House", shortName: "Green House", interactive: false },
  "church": { name: "Campus Chapel", shortName: "Chapel", interactive: false },
  "eco_park_building": { name: "Eco Park", shortName: "Eco Park", interactive: false },
  "reservoir": { name: "Water Reservoir", shortName: "Reservoir", interactive: false },
  "mrf": { name: "Materials Recovery Facility", shortName: "MRF", interactive: false },
  "feedmill": { name: "Feedmill", shortName: "Feedmill", interactive: false },
  "milk_processing_facility": { name: "Milk Processing Facility", shortName: "Milk Facility", interactive: false },
  "da_dairy_processing_center": { name: "Dairy Processing Center", shortName: "Dairy Center", interactive: false },
  "caretaker_house": { name: "Caretaker House", shortName: "Caretaker House", interactive: false },
  "beef_cattle_building": { name: "Beef Cattle Shed", shortName: "Cattle Building", interactive: false },
  "barn_house": { name: "Barn House", shortName: "Barn House", interactive: false },
  "goat_house": { name: "Goat House", shortName: "Goat House", interactive: false },
  "sheep_house": { name: "Sheep House", shortName: "Sheep House", interactive: false },
  "agro-forestry_shed": { name: "Agro-Forestry Shed", shortName: "Agro Shed", interactive: false },
  "wood_workshoptech_voc_building": { name: "Wood Workshop Tech Voc", shortName: "Wood Workshop", interactive: false },

  // ── ADDITIONAL CAMPUS STRUCTURES ──────────────────────────────────────────
  "agri-workshop_2": { name: "Agri Workshop 2", shortName: "Agri Workshop 2", interactive: false },
  "alumni_office": { name: "Alumni Office", shortName: "Alumni Office", interactive: false },
  "amante_building": { name: "Amante Building", shortName: "Amante Bldg.", interactive: false },
  "annex_2_(old_ladies_dorm)": { name: "Annex 2 (Old Ladies Dorm)", shortName: "Annex 2", interactive: false },
  "annex_3": { name: "Annex 3", shortName: "Annex 3", interactive: false },
  "atm_machine_landbank": { name: "ATM - Landbank", shortName: "ATM Landbank", interactive: false },
  "atm_machine_pnb": { name: "ATM - PNB", shortName: "ATM PNB", interactive: false },
  "bio_diagnostic_laboratory": { name: "Bio-Diagnostic Laboratory", shortName: "Bio-Diag Lab", interactive: false },
  "bodega": { name: "Bodega", shortName: "Bodega", interactive: false },
  "bookstore_and_orgms_office": { name: "Bookstore & Orgs Office", shortName: "Bookstore", interactive: false },
  "caa_diagnostic_laboratory": { name: "CAA Diagnostic Laboratory", shortName: "CAA Diag Lab", interactive: false },
  "caa_layering_house": { name: "CAA Layering House", shortName: "Layering House", interactive: false },
  "caa_restroom": { name: "CAA Restroom", shortName: "CAA Restroom", interactive: false },
  "caa_swine_laboratory": { name: "CAA Swine Laboratory", shortName: "Swine Lab", interactive: false },
  "caraga_black_native_chicken": { name: "Caraga Black Native Chicken House", shortName: "Native Chicken", interactive: false },
  "cas_covered_court": { name: "CAS Covered Court", shortName: "CAS Court", interactive: false },
  "cas_student_center": { name: "CAS Student Center", shortName: "CAS Std. Ctr.", interactive: false },
  "catching_coral": { name: "Catching Coral", shortName: "Catching Coral", interactive: false },
  "ccard_office": { name: "CCARD Office", shortName: "CCARD Office", interactive: false },
  "ced_restroom": { name: "CED Restroom", shortName: "CED Restroom", interactive: false },
  "ched_lgu": { name: "CHED-LGU Building", shortName: "CHED-LGU", interactive: false },
  "cofes_annex": { name: "COFES Annex", shortName: "COFES Annex", interactive: false },
  "eco_lodge": { name: "Eco Lodge", shortName: "Eco Lodge", interactive: false },
  "emb_machine": { name: "EMB Machine", shortName: "EMB Machine", interactive: false },
  "executive_house": { name: "Executive House", shortName: "Executive House", interactive: false },
  "farm_nursery": { name: "Farm Nursery", shortName: "Farm Nursery", interactive: false },
  "gas_station": { name: "Gas Station", shortName: "Gas Station", interactive: false },
  "gent's_dormitory": { name: "Gent's Dormitory", shortName: "Gent's Dorm", interactive: false },
  "gents'_dormitory_(_under_cons)": { name: "Gent's Dormitory (Under Const.)", shortName: "Gent's Dorm", interactive: false },
  "graduation_portrait": { name: "Graduation Portrait", shortName: "Grad. Portrait", interactive: false },
  "hardenning_area": { name: "Hardening Area", shortName: "Hardening Area", interactive: false },
  "hero_statue": { name: "Hero Statue", shortName: "Hero Statue", interactive: false },
  "ladies'_dormitory_(_under_cons)": { name: "Ladies' Dormitory (Under Const.)", shortName: "Ladies' Dorm", interactive: false },
  "mechanical_dryer": { name: "Mechanical Dryer", shortName: "Mech. Dryer", interactive: false },
  "micoriza_office": { name: "Micoriza Office", shortName: "Micoriza Office", interactive: false },
  "motorpool": { name: "Motorpool", shortName: "Motorpool", interactive: false },
  "oatc": { name: "OATC", shortName: "OATC", interactive: false },
  "old_ccaarrd_building": { name: "Old CCAARRD Building", shortName: "Old CCAARRD", interactive: false },
  "old_cegsttloresearch_services_office": { name: "Old Research Services Office", shortName: "Old Research Ofc.", interactive: false },
  "old_farm_mechanization_center": { name: "Old Farm Mechanization Center", shortName: "Old Farm Mech.", interactive: false },
  "power_house": { name: "Power House", shortName: "Power House", interactive: false },
  "power_house001": { name: "Power House", shortName: "Power House", interactive: false },
  "rooting_recovery": { name: "Rooting Recovery Area", shortName: "Rooting Area", interactive: false },
  "rotc_office": { name: "ROTC Office", shortName: "ROTC Office", interactive: false },
  "state-of-the_art_sports_complex001": { name: "State-of-the-Art Sports Complex", shortName: "Field", interactive: false },
  "tissue_culture_lab": { name: "Tissue Culture Laboratory", shortName: "Tissue Culture Lab", interactive: false },
  "vermi_house": { name: "Vermi House", shortName: "Vermi House", interactive: false }
};

// ── State ─────────────────────────────────────────────────────────────────────
let experience = null;   // Three.js Experience singleton
let worldReady = false;  // true once GLB is loaded & meshes indexed

const meshIndex = {};       // lowercased mesh name → THREE.Mesh
const pinList = [];       // { key, worldPos, el }
const _projVec = new THREE.Vector3();
const _box = new THREE.Box3();

let activeKey = null;
let activeMesh = null;

// ── Open / Close overlay ──────────────────────────────────────────────────────

export function openMapOverlay() {
  const overlay = document.getElementById('map-overlay');
  if (!overlay) return;

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

    // Hide preloader with a short delay so the bar reaches 100% visually
    const preloader = document.getElementById('tikad-preloader');
    if (preloader) {
      setTimeout(() => {
        preloader.style.transition = 'opacity 0.7s cubic-bezier(0.4,0,0.2,1)';
        preloader.style.opacity = '0';
        setTimeout(() => preloader.classList.add('hidden'), 750);
      }, 400);
    }

    // Index all nodes (both Groups/Object3Ds and Meshes) from the GLB
    experience.scene.traverse((node) => {
      if (!node.name) return;
      const key = node.name.toLowerCase().trim();
      if (key) {
        meshIndex[key] = node;
      }
      if (node.isMesh && node.material) {
        if (!node.userData.origMat) {
          node.userData.origMat = Array.isArray(node.material)
            ? node.material.map(m => m.clone())
            : node.material.clone();
        }
      }
    });
    // TEMP DEBUG: log all mesh keys and highlight ones NOT yet in BUILDING_DATA
    const knownKeys = Object.keys(BUILDING_DATA).map(k => k.toLowerCase().trim());
    const allKeys = Object.keys(meshIndex).sort();
    const unknownKeys = allKeys.filter(k => !knownKeys.some(kk => k.includes(kk) || kk.includes(k)));
    console.log('[GIYA] ALL scene node keys:\n' + allKeys.join('\n'));
    console.log('[GIYA] UNLABELED nodes (not in BUILDING_DATA):\n' + unknownKeys.join('\n'));
    _buildChips();
    _createPins();

    // Pin position update every frame
    experience.time.on('update', _updatePins);
  });
}

// ── Node lookup helper ────────────────────────────────────────────────────────
function _findNode(key) {
  if (!key) return null;
  const cleanKey = key.toLowerCase().trim();
  if (meshIndex[cleanKey]) return meshIndex[cleanKey];

  const normKey = cleanKey.replace(/[^a-z0-9]/g, '');
  if (!normKey) return null;

  // Exact match after normalization (ignoring underscores, spaces, dashes)
  for (const [k, node] of Object.entries(meshIndex)) {
    const normK = k.replace(/[^a-z0-9]/g, '');
    if (normK === normKey) return node;
  }

  // Partial / inclusion match (pick closest length match)
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
    // Only display interactive buildings in the directory list
    if (data.interactive === false) return;

    const btn = document.createElement('button');
    btn.className = 'cat-btn';
    btn.textContent = data.shortName || data.name.split(' ')[0];
    btn.title = data.name;
    btn.addEventListener('click', () => {
      _selectBuilding(key, true);
      // sync search input
      const input = document.getElementById('map-search');
      if (input) input.value = data.name;
    });
    bar.appendChild(btn);
  });
}

// ── Building selection & highlight ───────────────────────────────────────────

let highlightedMeshes = [];

function _selectBuilding(key, openPanel = true) {
  _resetHighlight();
  activeKey = key;

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

  if (openPanel) _openPanel(key);

  // Automatically open the floating 3D building preview if this building has a 3D model asset
  const data = BUILDING_DATA[key];
  if (data && data.model3d) {
    openBuildingViewer(data.model3d, data.name);
  } else {
    closeBuildingViewer();
  }
}

function _resetHighlight() {
  highlightedMeshes.forEach(child => {
    if (child.userData.origMat) {
      child.material = Array.isArray(child.userData.origMat)
        ? child.userData.origMat.map(m => m.clone())
        : child.userData.origMat.clone();
    }
  });
  highlightedMeshes = [];
  activeKey = null;
  document.querySelectorAll('#map-chips-bar .cat-btn').forEach(b => b.classList.remove('active-cat'));
}

// ── Info panel ────────────────────────────────────────────────────────────────

function _openPanel(key) {
  const data = BUILDING_DATA[key];
  if (!data) return;
  if (data.interactive === false) return; // Static landmarks — no panel

  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  // Set the building logo in the image overlay
  const iconEl = document.getElementById('panel-icon');
  if (iconEl) {
    if (data.logo) {
      iconEl.innerHTML = `<img src="${data.logo}" />`;
      iconEl.style.background = 'transparent';
    } else {
      iconEl.textContent = data.emoji || '🏛';
      iconEl.style.background = 'rgba(255,255,255,0.15)';
    }
  }

  // Hide the emoji icon overlapping the building photo
  const imgIconEl = document.getElementById('panel-img-icon');
  if (imgIconEl) imgIconEl.style.display = 'none';

  set('panel-name', data.name);
  set('panel-type', data.type);
  set('panel-desc', data.desc);

  // Set the building image dynamically
  const imgEl = document.getElementById('panel-img-bg');
  if (imgEl) {
    if (data.image) {
      imgEl.style.background = `url('${data.image}') center center / cover no-repeat`;
    } else {
      imgEl.style.background = `url('/images/kinaadman.jpg') center center / cover no-repeat`;
    }
  }

  // Departments list
  const deptsWrap = document.getElementById('panel-depts-wrap');
  const deptsList = document.getElementById('panel-depts');
  if (deptsWrap && deptsList && data.depts?.length) {
    deptsList.innerHTML = data.depts.map(d => `
      <li class="panel-facility-item">
        <span class="panel-facility-check">${d.icon || '🏢'}</span>
        <span><strong>${d.name}</strong>${d.sub ? ` · ${d.sub}` : ''}</span>
      </li>`).join('');
    deptsWrap.style.display = '';
  } else if (deptsWrap) {
    deptsWrap.style.display = 'none';
  }

  // Contact
  const contactWrap = document.getElementById('panel-contact-wrap');
  const contactContent = document.getElementById('panel-contact');
  if (contactWrap && contactContent && data.contact) {
    contactContent.innerHTML =
      (data.contact.phone ? `📞 ${data.contact.phone}<br>` : '') +
      (data.contact.email ? `✉️ ${data.contact.email}` : '');
    contactWrap.style.display = '';
  } else if (contactWrap) {
    contactWrap.style.display = 'none';
  }

  // ── "View 3D Model" button (only for buildings with a model3d path) ──
  const viewBtnWrap = document.getElementById('panel-view3d-wrap');
  const viewBtn = document.getElementById('panel-view3d-btn');
  if (viewBtnWrap && viewBtn) {
    if (data.model3d) {
      viewBtn.onclick = () => openBuildingViewer(data.model3d, data.name);
      viewBtnWrap.style.display = '';
    } else {
      viewBtnWrap.style.display = 'none';
    }
  }

  // Show panel (uses existing TIKAD #info-panel CSS)
  const panel = document.getElementById('info-panel');
  if (panel) {
    panel.classList.remove('panel-hidden');
    panel.style.display = 'block';
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

function _createPins() {
  const container = document.getElementById('mapPins');
  if (!container) return;
  container.innerHTML = '';
  pinList.length = 0;

  Object.entries(BUILDING_DATA).forEach(([key, data]) => {
    const node = _findNode(key);

    if (!node) {
      console.warn(`[GIYA Map] Pin creation skipped: No 3D model node found for "${key}" (${data.name})`);
      return;
    }

    const worldPos = new THREE.Vector3();
    _box.setFromObject(node);
    _box.getCenter(worldPos);

    // Elevate the pin to float cleanly above the top of the building's bounding box
    const height = _box.max.y - _box.min.y;
    worldPos.y = _box.max.y + Math.max(0.15, height * 0.05);

    const el = document.createElement('div');
    el.className = 'bldg-pin';

    const isInteractive = data.interactive !== false;

    if (isInteractive) {
      el.style.cssText = 'position:absolute;transform:translate(-50%,-50%);cursor:pointer;pointer-events:all;z-index:5;';
      el.innerHTML = `
        <div class="pin-label">${data.abbrev || data.shortName || data.name.split(' ')[0]}</div>
      `;

      el.addEventListener('click', () => {
        // Remove active state from all pins
        pinList.forEach(p => p.el.querySelector('.pin-label')?.classList.remove('active-pin'));
        // Add active state to clicked pin
        el.querySelector('.pin-label')?.classList.add('active-pin');
        const input = document.getElementById('map-search');
        if (input) input.value = data.name;
        _selectBuilding(key, true);
      });
    } else {
      // Non-interactive / static labels (e.g. Canteens, ATMs, Chapels)
      el.style.cssText = 'position:absolute;transform:translate(-50%,-50%);cursor:default;pointer-events:none;z-index:4;';
      el.innerHTML = `
        <div class="pin-label-static">${data.shortName || data.name}</div>
      `;
    }

    container.appendChild(el);
    pinList.push({ key, worldPos, el, interactive: isInteractive });
  });
}

function _updatePins() {
  if (!experience || !worldReady) return;
  const cam = experience.camera.orthographicCamera;
  const W = experience.sizes.width;
  const H = experience.sizes.height;
  const zoom = cam.zoom;

  pinList.forEach(({ worldPos, el, interactive }) => {
    _projVec.copy(worldPos).project(cam);
    if (_projVec.z > 1) { el.style.visibility = 'hidden'; return; }

    // Zoom-based Level of Detail (LOD) — show static labels at any meaningful zoom
    if (!interactive && zoom < 0.3) {
      el.style.display = 'none';
      return;
    }

    el.style.display = '';
    el.style.visibility = 'visible';
    el.style.left = ((_projVec.x * 0.5 + 0.5) * W) + 'px';
    el.style.top = ((_projVec.y * -0.5 + 0.5) * H) + 'px';
  });
}

// ── Search (wired to existing #map-search input) ──────────────────────────────

function _handleSearch(query) {
  if (!query.trim()) return;
  // Only search interactive buildings
  const key = Object.keys(BUILDING_DATA).find(k =>
    BUILDING_DATA[k].interactive !== false &&
    (k.includes(query.toLowerCase()) ||
      BUILDING_DATA[k].name.toLowerCase().includes(query.toLowerCase()))
  );
  if (key) {
    _selectBuilding(key, true);
  } else {
    const dd = document.getElementById('search-dropdown');
    if (dd) { dd.innerHTML = '<div style="padding:10px 14px;font-size:13px;color:#6b7280;">No buildings found</div>'; dd.style.display = 'block'; }
  }
}

function _buildDropdown(query) {
  const dd = document.getElementById('search-dropdown');
  if (!dd) return;
  if (!query.trim()) { dd.style.display = 'none'; return; }

  // Only show interactive buildings in the search dropdown
  const matches = Object.entries(BUILDING_DATA).filter(([k, b]) =>
    b.interactive !== false &&
    (k.includes(query.toLowerCase()) || b.name.toLowerCase().includes(query.toLowerCase()))
  );

  if (!matches.length) { dd.style.display = 'none'; return; }

  dd.innerHTML = matches.map(([key, b]) => `
    <div
      data-key="${key}"
      class="search-dropdown-item"
    >
      <span>${b.emoji || '🏛'}</span>
      <span>${b.name}</span>
      <span class="search-dropdown-item-type">${b.type || ''}</span>
    </div>`).join('');

  // click handler per result
  dd.querySelectorAll('[data-key]').forEach(el => {
    el.addEventListener('click', () => {
      const k = el.dataset.key;
      const input = document.getElementById('map-search');
      if (input) input.value = BUILDING_DATA[k].name;
      dd.style.display = 'none';
      _selectBuilding(k, true);
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
    searchInput.addEventListener('input', e => _buildDropdown(e.target.value));
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

  // Keep old globals for any stray references
  window.closePanel = _closePanel;
  window.filterBuildings = q => _buildDropdown(q);

  // Hide panel initially
  const panel = document.getElementById('info-panel');
  if (panel) panel.style.display = 'none';

  // Boot the 3D Experience in the background immediately on page load
  _bootExperience();
}

