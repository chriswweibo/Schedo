import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const DEMO_PASSWORD = 'password123'

// ── Sydney suburbs ────────────────────────────────────────────
const SUBURBS: [string, number, number][] = [
  ['CBD',           -33.8688, 151.2093],
  ['Surry Hills',   -33.8847, 151.2111],
  ['Newtown',       -33.8975, 151.1793],
  ['Bondi',         -33.8915, 151.2767],
  ['Manly',         -33.7976, 151.2870],
  ['Mosman',        -33.8276, 151.2434],
  ['North Sydney',  -33.8399, 151.2068],
  ['Chatswood',     -33.7967, 151.1825],
  ['Parramatta',    -33.8150, 151.0011],
  ['Leichhardt',    -33.8840, 151.1581],
  ['Balmain',       -33.8593, 151.1785],
  ['Marrickville',  -33.9102, 151.1564],
  ['Randwick',      -33.9147, 151.2404],
  ['Coogee',        -33.9206, 151.2569],
  ['Paddington',    -33.8836, 151.2282],
  ['Double Bay',    -33.8769, 151.2447],
  ['Glebe',         -33.8819, 151.1855],
  ['Pyrmont',       -33.8726, 151.1949],
  ['Redfern',       -33.8934, 151.2046],
  ['Hurstville',    -33.9684, 151.1031],
  ['Bankstown',     -33.9179, 151.0344],
  ['Burwood',       -33.8696, 151.1022],
  ['Strathfield',   -33.8728, 151.0843],
  ['Cronulla',      -34.0556, 151.1510],
  ['Sutherland',    -34.0315, 151.0566],
  ['Castle Hill',   -33.7340, 151.0049],
  ['Ryde',          -33.8153, 151.1042],
  ['Campsie',       -33.9101, 151.1024],
  ['Kogarah',       -33.9644, 151.1298],
  ['Lane Cove',     -33.8137, 151.1672],
  ['Neutral Bay',   -33.8331, 151.2196],
  ['Rozelle',       -33.8627, 151.1727],
  ['Alexandria',    -33.9049, 151.1987],
  ['Waterloo',      -33.9011, 151.2107],
  ['Mascot',        -33.9258, 151.1921],
  ['Rockdale',      -33.9518, 151.1391],
  ['Miranda',       -34.0297, 151.1018],
  ['Blacktown',     -33.7736, 150.9085],
  ['Penrith',       -33.7503, 150.6942],
  ['Liverpool',     -33.9200, 150.9230],
]

// ── Names ─────────────────────────────────────────────────────
const NAMES = [
  'James Carter',    'Sophie Okafor',   'Liam Thornton',   'Priya Mehta',
  'Marcus Webb',     'Aisha Rahman',    'Tom Nguyen',      'Claire Dubois',
  'Daniel Park',     'Emma Wilson',     'Chris Stavros',   'Fatima Ali',
  'Jack Morrison',   'Lily Chen',       'Samuel Adeyemi',  'Grace Kim',
  'Oliver Brown',    'Isabelle Martin', 'Noah Patel',      'Mia Kowalski',
  'Ethan Walsh',     'Zoe Tremblay',    'Lucas Ferreira',  'Ava Johnson',
  'Henry Clarke',    'Amara Diallo',    'William Scott',   'Maya Rodriguez',
  'Ben Thompson',    'Sara Johansson',  'Ryan Murphy',     'Layla Hassan',
  'Jake Harrison',   'Chloe Xu',        'Alex Petrov',     'Nadia Kostadinova',
  'Patrick Flynn',   'Mei-Ling Wu',     'David Osei',      'Anna Lindberg',
  'Sean O\'Brien',   'Yuki Tanaka',     'Mark Fitzgerald', 'Sonia Kapoor',
  'Josh Reynolds',   'Tanya Bowen',     'Adam Khalid',     'Rebecca Stone',
  'Nick Papadopoulos','Elena Russo',    'Carl Stevens',    'Diana Ngo',
  'Matt Brennan',    'Ingrid Hansen',   'Aaron Levy',      'Camille Laurent',
  'Kyle Henderson',  'Jasmine Okonkwo', 'Tom Svensson',    'Rosa Castillo',
  'Finn McCarthy',   'Aiko Yamamoto',   'Declan Hughes',   'Valentina Cruz',
  'Rory Mackenzie',  'Selena Popescu',  'Angus McDonald',  'Beatriz Oliveira',
  'Connor Walsh',    'Hana Suzuki',     'Brendan Kelly',   'Soraya Benhali',
  'Callum Grant',    'Nina Johanssen',  'Patrick Doherty', 'Adaeze Eze',
  'Stuart Baxter',   'Keiko Watanabe',  'Glen Morrison',   'Petra Kovacs',
  'Wayne Dixon',     'Chioma Eze',      'Barry Hollingsworth','Deepa Nair',
  'Terry Lawson',    'Anita Sharma',    'Kevin Burgess',   'Monica Tran',
  'Dennis Harrington','Sunita Patel',   'Frank Carmody',   'Leila Mansouri',
  'Gary Whitfield',  'Pooja Mishra',    'Tony Gambino',    'Mei Zhang',
  'Steve Aldridge',  'Nkechi Obi',      'Paul McAuley',    'Laura Buckley',
]

// ── Professions with bios & keywords ─────────────────────────
type ProfessionDef = {
  name: string
  bio: string
  keywords: string[]
}

const PROFESSION_DEFS: ProfessionDef[] = [
  {
    name: 'Electrician',
    bio: 'Licensed electrician covering domestic and light commercial work. Specialising in rewiring, consumer unit upgrades, fault finding, and EV charger installation. Fully Part P certified.',
    keywords: ['electrician', 'rewiring', 'consumer unit', 'EV charger', 'fault finding', 'emergency electrician'],
  },
  {
    name: 'Plumber',
    bio: 'Qualified plumber handling all domestic plumbing needs — boiler installs, leak repairs, bathroom fitting, and central heating. Emergency callouts available seven days a week.',
    keywords: ['plumber', 'boiler', 'leak repair', 'bathroom fitting', 'central heating', 'emergency plumber'],
  },
  {
    name: 'Gas Engineer',
    bio: 'Gas Safe registered engineer for boiler servicing, repairs, and new installations. Annual safety checks and landlord certificates available. Fast response across Sydney metro.',
    keywords: ['gas engineer', 'boiler service', 'gas safe', 'landlord certificate', 'boiler repair', 'heating'],
  },
  {
    name: 'Carpenter',
    bio: 'Skilled carpenter offering bespoke joinery, fitted wardrobes, kitchen installations, door hanging, skirting, and general woodwork. Quality craftsmanship guaranteed.',
    keywords: ['carpenter', 'joinery', 'fitted wardrobes', 'kitchen installation', 'door hanging', 'woodwork'],
  },
  {
    name: 'Joiner',
    bio: 'Expert joiner specialising in staircases, bespoke furniture, timber framing, and heritage restoration work. All projects finished to the highest standard.',
    keywords: ['joiner', 'staircase', 'bespoke furniture', 'timber framing', 'heritage joinery', 'woodwork'],
  },
  {
    name: 'Roofer',
    bio: 'Professional roofer covering repairs, full re-roofs, guttering, flat roofs, and emergency patch-ups. Free quotes. All work guaranteed and fully insured.',
    keywords: ['roofer', 'roof repair', 're-roof', 'guttering', 'flat roof', 'emergency roof repair'],
  },
  {
    name: 'Builder',
    bio: 'General builder with 15 years experience in extensions, loft conversions, structural alterations, and new builds. All work fully insured and project managed end to end.',
    keywords: ['builder', 'extension', 'loft conversion', 'structural', 'groundwork', 'brickwork'],
  },
  {
    name: 'Plasterer',
    bio: 'Experienced plasterer offering skimming, dot and dab, rendering, and coving. Smooth, durable finishes ready to paint. Domestic and commercial projects welcome.',
    keywords: ['plasterer', 'skimming', 'rendering', 'dot and dab', 'coving', 'plasterboard'],
  },
  {
    name: 'Tiler',
    bio: 'Professional tiler specialising in bathrooms, kitchens, and outdoor spaces. Wall and floor tiling, wet rooms, and natural stone. Grout and adhesive supplied.',
    keywords: ['tiler', 'bathroom tiling', 'kitchen tiling', 'floor tiles', 'wet room', 'natural stone'],
  },
  {
    name: 'Bricklayer',
    bio: 'Qualified bricklayer with expertise in new builds, garden walls, driveways, repointing, and chimney repairs. Clean, precise work delivered on time and on budget.',
    keywords: ['bricklayer', 'garden wall', 'repointing', 'chimney repair', 'driveway', 'blockwork'],
  },
  {
    name: 'Painter & Decorator',
    bio: 'Professional painter and decorator with an eye for detail. Interior and exterior work, feature walls, wallpapering, and colour consultation included. Fully insured.',
    keywords: ['painter', 'decorator', 'wallpaper', 'feature wall', 'interior painting', 'exterior painting'],
  },
  {
    name: 'Cleaner',
    bio: 'Reliable and thorough domestic cleaner offering regular weekly cleans, deep cleans, end-of-tenancy, and post-build cleaning. Own supplies and equipment provided.',
    keywords: ['cleaner', 'deep clean', 'end of tenancy', 'domestic cleaning', 'regular cleaning', 'house clean'],
  },
  {
    name: 'Gardener',
    bio: 'Passionate gardener offering regular lawn maintenance, garden design, planting schemes, hedge trimming, and seasonal tidy-ups. RHS qualified with 10 years experience.',
    keywords: ['gardener', 'lawn care', 'garden design', 'planting', 'hedge trimming', 'landscaping'],
  },
  {
    name: 'Handyman',
    bio: 'Versatile handyman for all those odd jobs — flat pack assembly, TV mounting, door adjustments, shelf installation, and minor repairs. No job too small.',
    keywords: ['handyman', 'flat pack', 'tv mounting', 'shelf installation', 'odd jobs', 'minor repairs'],
  },
  {
    name: 'Locksmith',
    bio: 'Fully qualified locksmith available 24/7 for lockouts, lock changes, security upgrades, and safe installation. Competitive rates with no call-out charge during business hours.',
    keywords: ['locksmith', 'lockout', 'lock change', 'security upgrade', 'safe installation', 'emergency locksmith'],
  },
  {
    name: 'Window Cleaner',
    bio: 'Professional window cleaner using pure water fed pole system for streak-free results. Residential and commercial. Regular scheduled cleans available at discounted rates.',
    keywords: ['window cleaner', 'pure water', 'residential', 'commercial', 'regular cleaning', 'streak-free'],
  },
  {
    name: 'Pest Control',
    bio: 'Certified pest control technician for residential and commercial properties. Specialist in rodents, insects, and birds. Discreet, effective, and child-safe treatments.',
    keywords: ['pest control', 'rodents', 'insects', 'rats', 'cockroaches', 'bed bugs', 'bird control'],
  },
  {
    name: 'Appliance Repair',
    bio: 'Fast and affordable appliance repair for washing machines, dishwashers, ovens, tumble dryers, and fridges. Same-day call-outs available. All makes and models.',
    keywords: ['appliance repair', 'washing machine', 'dishwasher', 'oven repair', 'tumble dryer', 'fridge repair'],
  },
  {
    name: 'HVAC Technician',
    bio: 'Qualified HVAC technician for installation, servicing, and repair of heating, ventilation, and air conditioning systems. Residential and light commercial. F-Gas certified.',
    keywords: ['HVAC', 'air conditioning', 'AC repair', 'ventilation', 'heat pump', 'ducted air'],
  },
  {
    name: 'Boiler Engineer',
    bio: 'Gas Safe registered boiler engineer for annual servicing, breakdown repair, and system upgrades. Worcester Bosch and Vaillant specialist. 24-hour emergency line.',
    keywords: ['boiler engineer', 'boiler service', 'boiler repair', 'gas safe', 'heating engineer', 'combi boiler'],
  },
  {
    name: 'Personal Trainer',
    bio: 'Certified personal trainer offering one-on-one and small group sessions. Specialising in weight loss, strength training, and rehabilitation. Home visits and online coaching available.',
    keywords: ['personal trainer', 'fitness', 'weight loss', 'strength training', 'home visits', 'online coaching'],
  },
  {
    name: 'Tutor',
    bio: 'Experienced tutor for primary, secondary, and university students. Subjects include maths, science, English, and test preparation. Patient, encouraging teaching style.',
    keywords: ['tutor', 'maths tutor', 'science tutor', 'English tutor', 'HSC preparation', 'primary school'],
  },
  {
    name: 'Dog Walker',
    bio: 'Passionate dog lover offering daily walks, group walks, and puppy drop-ins. GPS tracked walks with photo updates. Fully insured and pet first aid trained.',
    keywords: ['dog walker', 'dog walking', 'puppy', 'group walks', 'pet sitting', 'dog care'],
  },
  {
    name: 'Babysitter',
    bio: 'Experienced and caring babysitter with a Working With Children Check. Available evenings and weekends. First aid trained, non-smoking, with excellent references.',
    keywords: ['babysitter', 'childcare', 'nanny', 'babysitting', 'evening childcare', 'weekend babysitter'],
  },
  {
    name: 'Chef',
    bio: 'Private chef with fine dining experience offering meal prep, dinner parties, and special occasion catering. Menu tailored to dietary requirements. Locally sourced ingredients.',
    keywords: ['chef', 'private chef', 'meal prep', 'dinner party', 'catering', 'meal delivery'],
  },
  {
    name: 'Photographer',
    bio: 'Creative photographer specialising in portraits, family sessions, events, real estate, and headshots. Fast turnaround with professional editing. Studio or on-location.',
    keywords: ['photographer', 'portrait', 'family photos', 'event photography', 'real estate photos', 'headshots'],
  },
]

// ── Jobs per profession ───────────────────────────────────────
type JobTemplate = { title: string; description: string }

const JOBS_BY_PROFESSION: Record<string, JobTemplate[]> = {
  'Electrician': [
    { title: 'Consumer unit upgrade', description: 'Replaced ageing fuse board with a new 18-way consumer unit, RCDs, and surge protection.' },
    { title: 'EV charger installation', description: 'Installed a 7 kW home EV charger on a dedicated circuit with load balancing.' },
    { title: 'Full kitchen rewire', description: 'Rewired all kitchen circuits including sockets, under-cabinet lighting, and extraction fan.' },
  ],
  'Plumber': [
    { title: 'Walk-in shower conversion', description: 'Removed bath and fitted a frameless walk-in shower with thermostat valve and rainfall head.' },
    { title: 'Combi boiler swap', description: 'Replaced old system boiler with a Vaillant combi, including new TRVs throughout.' },
    { title: 'Emergency leak repair', description: 'Diagnosed and fixed a concealed pipe leak behind kitchen cabinets before major damage occurred.' },
  ],
  'Gas Engineer': [
    { title: 'Annual boiler service', description: 'Full service and safety check on Worcester Bosch combi — issued landlord gas safety certificate.' },
    { title: 'Boiler breakdown repair', description: 'Diagnosed faulty heat exchanger; replaced part and restored heating within the day.' },
    { title: 'Gas hob installation', description: 'Disconnected old electric hob and installed new 5-burner gas range with flexible connection.' },
  ],
  'Carpenter': [
    { title: 'Fitted wardrobe build', description: 'Designed and built floor-to-ceiling fitted wardrobes with sliding doors in master bedroom.' },
    { title: 'Kitchen installation', description: 'Fitted new kitchen including all cabinets, island, and appliance housing.' },
    { title: 'Hardwood flooring', description: 'Laid engineered oak flooring throughout open-plan living and dining area.' },
  ],
  'Joiner': [
    { title: 'Bespoke staircase', description: 'Designed and built a feature open-tread staircase with steel balustrade.' },
    { title: 'Home office built-in desk', description: 'Built a full-width desk with shelving and cable management in alcove.' },
    { title: 'Window frame restoration', description: 'Repaired and restored original sash windows in 1900s terrace to original spec.' },
  ],
  'Roofer': [
    { title: 'Full re-roof — terrace house', description: 'Stripped and re-tiled entire roof with new felt, battens, and ridge tiles.' },
    { title: 'Flat roof replacement', description: 'Replaced leaking felt flat roof with EPDM rubber membrane — 20-year guarantee.' },
    { title: 'Gutter replacement', description: 'Removed corroded cast iron guttering and fitted new uPVC system throughout.' },
  ],
  'Builder': [
    { title: 'Single-storey rear extension', description: 'Built 4 m × 6 m kitchen extension with bifold doors, lantern roof, and underfloor heating.' },
    { title: 'Loft conversion', description: 'Dormer loft conversion creating a master bedroom with en-suite and Juliet balcony.' },
    { title: 'Garage conversion', description: 'Converted double garage into a self-contained studio flat with kitchenette and shower room.' },
  ],
  'Plasterer': [
    { title: 'Whole-house skim', description: 'Skimmed all walls and ceilings in a 4-bed new build to smooth finish ready for painting.' },
    { title: 'Coving installation', description: 'Fitted ornate plaster coving throughout Victorian property, matched to original profile.' },
    { title: 'External render repair', description: 'Hacked off failed render, applied scratch coat and top coat, finished with masonry paint.' },
  ],
  'Tiler': [
    { title: 'Bathroom wall and floor tiling', description: 'Full tiling of family bathroom using large-format porcelain tiles with minimal grout lines.' },
    { title: 'Kitchen splashback', description: 'Installed metro brick tile splashback with dark grout behind Aga range cooker.' },
    { title: 'Outdoor patio', description: 'Laid natural slate tiles to rear patio with weatherproof adhesive and frost-resistant grout.' },
  ],
  'Bricklayer': [
    { title: 'Garden boundary wall', description: 'Built 20 m double-skin brick wall with blue engineering brick coping and piers.' },
    { title: 'Chimney repointing', description: 'Repointed crumbling mortar on two chimney stacks and fitted new lead flashing.' },
    { title: 'Block paving driveway', description: 'Excavated and laid herringbone block paving with soldier course edging.' },
  ],
  'Painter & Decorator': [
    { title: 'Whole-house redecoration', description: 'Five-room interior repaint in Farrow & Ball tones including ceilings and all woodwork.' },
    { title: 'Feature wall wallpaper', description: 'Hung Cole & Son botanical wallpaper on chimney breast with perfect pattern matching.' },
    { title: 'Exterior repaint', description: 'Full exterior repaint of 1930s semi including rendered walls, soffits, and fascias.' },
  ],
  'Cleaner': [
    { title: 'End-of-tenancy deep clean', description: 'Full deep clean of 3-bed flat to landlord standard — oven, carpets, windows, and all surfaces.' },
    { title: 'Post-renovation clean', description: 'Removed construction dust and debris from newly refurbished kitchen and bathrooms.' },
    { title: 'Regular weekly clean', description: 'Ongoing weekly maintenance clean for a family home — reliable, thorough, and trusted.' },
  ],
  'Gardener': [
    { title: 'Full garden redesign', description: 'Transformed overgrown back garden into low-maintenance space with raised beds and decking.' },
    { title: 'Lawn restoration', description: 'Scarified, aerated, overseeded, and top-dressed neglected lawn — back to health in 6 weeks.' },
    { title: 'Hedge trimming and tidy', description: 'Shaped and trimmed 40 m of mixed hedging, cleared beds, and removed green waste.' },
  ],
  'Handyman': [
    { title: 'Flat pack assembly', description: 'Assembled full bedroom set — wardrobe, chest of drawers, bed frame, and bedside tables.' },
    { title: 'TV and shelving installation', description: 'Wall-mounted 65" TV with cable concealment, installed 3 floating shelves.' },
    { title: 'Door and lock fixes', description: 'Adjusted sticking doors, replaced 2 locks, and fitted draught excluders throughout.' },
  ],
  'Locksmith': [
    { title: 'Emergency lockout', description: 'Gained non-destructive entry for locked-out homeowner and replaced cylinder same day.' },
    { title: 'Security upgrade', description: 'Upgraded front and back doors with British Standard cylinders and multipoint locks.' },
    { title: 'Safe installation', description: 'Supplied and fitted floor-mounted safe, concealed under flooring in home office.' },
  ],
  'Window Cleaner': [
    { title: 'Residential window clean', description: 'Internal and external clean of all windows in 4-bed house using pure water fed pole system.' },
    { title: 'Commercial glazing clean', description: 'Monthly clean of retail unit shopfront and internal glass partitions — streak-free results.' },
    { title: 'Conservatory roof clean', description: 'Removed algae and debris from polycarbonate conservatory roof using specialist detergent.' },
  ],
  'Pest Control': [
    { title: 'Rat infestation treatment', description: 'Surveyed entry points, set bait stations, and sealed access routes — cleared in 3 visits.' },
    { title: 'Bed bug treatment', description: 'Heat treatment and insecticide application to all rooms — full clearance confirmed on follow-up.' },
    { title: 'Wasp nest removal', description: 'Safely treated and removed large wasp nest in loft — same-day service, no mess.' },
  ],
  'Appliance Repair': [
    { title: 'Washing machine repair', description: 'Replaced faulty drum bearing on Bosch washing machine — back running quietly the same day.' },
    { title: 'Oven element replacement', description: 'Diagnosed failed top element in AEG oven, sourced and fitted genuine part.' },
    { title: 'Dishwasher fix', description: 'Cleared blocked spray arms and replaced worn door seal on Siemens dishwasher.' },
  ],
  'HVAC Technician': [
    { title: 'Ducted AC installation', description: 'Installed 3-zone ducted reverse-cycle system in new build — full commissioning and test.' },
    { title: 'AC service and regas', description: 'Serviced split system units throughout office, cleaned coils, and recharged refrigerant.' },
    { title: 'Ventilation system install', description: 'Fitted MVHR whole-house ventilation system with heat recovery — significant energy savings.' },
  ],
  'Boiler Engineer': [
    { title: 'Boiler annual service', description: 'Full service of Ideal Logic combi — checked all safety devices, flue, and combustion readings.' },
    { title: 'Power flush', description: 'Power flushed 12-radiator system, removed sludge, and added inhibitor — heat output improved dramatically.' },
    { title: 'Radiator installation', description: 'Fitted 3 new radiators in extension, balanced system, and optimised boiler settings.' },
  ],
  'Personal Trainer': [
    { title: '12-week body transformation', description: 'Coached client through 12-week strength and fat-loss programme — 8 kg lost, 5 kg muscle gained.' },
    { title: 'Postnatal fitness programme', description: 'Tailored low-impact programme for new mother, focusing on core restoration and energy.' },
    { title: 'Sports performance coaching', description: 'Periodised training plan for amateur triathlete preparing for first Olympic-distance event.' },
  ],
  'Tutor': [
    { title: 'HSC Maths Extension coaching', description: 'Intensive 6-month preparation for HSC Extension 1 — student achieved Band 6.' },
    { title: 'Primary reading support', description: 'Weekly sessions supporting Year 3 student with reading comprehension — 2 year level improvement.' },
    { title: 'University statistics tutoring', description: 'One-on-one statistics tutoring for first-year nursing student — passed exam with distinction.' },
  ],
  'Dog Walker': [
    { title: 'Daily group walks', description: 'Regular morning group walks for 4 dogs in local park — GPS tracked, photo updates sent.' },
    { title: 'Puppy socialisation walks', description: 'Specialist puppy walks introducing young Labrador to other dogs and environments.' },
    { title: 'Holiday pet sitting', description: 'Two-week in-home pet sit for family of 3 dogs while owners were overseas.' },
  ],
  'Babysitter': [
    { title: 'Regular evening babysitting', description: 'Twice-weekly evening care for two children aged 3 and 6 — bedtime routine and reading.' },
    { title: 'School holiday childcare', description: 'Full-day childcare during school holidays including activities, meals, and outings.' },
    { title: 'Emergency last-minute cover', description: 'Short-notice cover for family when regular carer was unavailable — calm and dependable.' },
  ],
  'Chef': [
    { title: 'Dinner party for 10', description: 'Designed and cooked 4-course tasting menu for anniversary dinner — sourced all local produce.' },
    { title: 'Weekly meal prep service', description: 'Weekly batch cooking for busy family — 5 days of balanced, varied dinners prepared and portioned.' },
    { title: 'Birthday celebration catering', description: 'Catered 40-person birthday party with grazing tables, canapés, and a hot buffet.' },
  ],
  'Photographer': [
    { title: 'Family portrait session', description: 'Outdoor family shoot at Centennial Park — 60 edited images delivered within 48 hours.' },
    { title: 'Real estate photography', description: 'Photographed 4-bed property in Mosman for sale listing — drone shots included.' },
    { title: 'Corporate headshots', description: 'Studio headshots for 15-person team — consistent lighting, background, and quick turnaround.' },
  ],
}

// Picsum photo seeds grouped loosely by profession type
// Trades-ish: 10-100, Home: 200-300, Lifestyle: 400-500
const PHOTO_SEEDS_BY_PROFESSION: Record<string, number[]> = {
  'Electrician':        [10, 57, 83],
  'Plumber':            [20, 64, 91],
  'Gas Engineer':       [30, 71, 99],
  'Carpenter':          [40, 78, 107],
  'Joiner':             [50, 85, 115],
  'Roofer':             [60, 92, 123],
  'Builder':            [70, 100, 131],
  'Plasterer':          [80, 108, 139],
  'Tiler':              [90, 116, 147],
  'Bricklayer':         [110, 124, 155],
  'Painter & Decorator':[200, 213, 226],
  'Cleaner':            [201, 214, 227],
  'Gardener':           [202, 215, 228],
  'Handyman':           [203, 216, 229],
  'Locksmith':          [204, 217, 230],
  'Window Cleaner':     [205, 218, 231],
  'Pest Control':       [206, 219, 232],
  'Appliance Repair':   [207, 220, 233],
  'HVAC Technician':    [208, 221, 234],
  'Boiler Engineer':    [209, 222, 235],
  'Personal Trainer':   [400, 416, 432],
  'Tutor':              [401, 417, 433],
  'Dog Walker':         [402, 418, 434],
  'Babysitter':         [403, 419, 435],
  'Chef':               [404, 420, 436],
  'Photographer':       [405, 421, 437],
}

// ── New-category professions (broader Bark-style services) ────
// Each profession/keyword set is crafted so the homepage category links
// (/search?keyword=<service>) return results via substring match.
type NewProfessionDef = ProfessionDef & { jobs: JobTemplate[]; photoSeeds: [number, number] }

const NEW_PROFESSION_DEFS: NewProfessionDef[] = [
  {
    name: 'DJ',
    bio: 'Professional DJ for weddings, parties, and corporate events with a full sound and lighting setup. Reads the room and keeps the dance floor moving all night.',
    keywords: ['dj', 'wedding dj', 'party dj', 'mobile disco', 'event dj', 'club dj'],
    jobs: [
      { title: 'Wedding reception DJ', description: '5-hour set for a 120-guest wedding with MC duties and a full lighting rig included.' },
      { title: '21st birthday party', description: 'Mobile disco with smoke machine, taking live requests through the night.' },
    ],
    photoSeeds: [440, 441],
  },
  {
    name: 'Caterer',
    bio: 'Event caterer offering grazing tables, canapés, and hot buffets tailored to your guest count and dietary needs. Fresh, locally sourced produce.',
    keywords: ['caterer', 'catering', 'event catering', 'canapés', 'buffet', 'private catering'],
    jobs: [
      { title: 'Corporate lunch catering', description: 'Catered a 50-person corporate lunch with grazing platters and full dietary options.' },
      { title: 'Engagement party canapés', description: 'Designed and served a canapé menu for an 80-guest engagement celebration.' },
    ],
    photoSeeds: [442, 443],
  },
  {
    name: 'Event Planner',
    bio: 'Detail-obsessed event planner handling weddings, parties, and corporate functions end to end — venues, suppliers, run sheets, and on-the-day coordination.',
    keywords: ['event planner', 'event planning', 'party planner', 'wedding planner', 'corporate events'],
    jobs: [
      { title: 'Wedding coordination', description: 'Full planning and on-the-day coordination for a 100-guest harbourside wedding.' },
      { title: 'Product launch event', description: 'Organised venue, catering, and run sheet for a brand product launch evening.' },
    ],
    photoSeeds: [444, 445],
  },
  {
    name: 'Videographer',
    bio: 'Videographer producing cinematic wedding films, event coverage, and promotional videos. Professional editing with a fast turnaround.',
    keywords: ['videographer', 'wedding video', 'event video', 'video production', 'promo video'],
    jobs: [
      { title: 'Wedding highlight film', description: 'Filmed and edited a cinematic 4-minute highlight reel plus full ceremony footage.' },
      { title: 'Business promo video', description: 'Produced a 60-second promotional video for a local café, including drone shots.' },
    ],
    photoSeeds: [446, 447],
  },
  {
    name: 'Massage Therapist',
    bio: 'Qualified remedial massage therapist offering deep tissue, sports, and relaxation massage. Mobile appointments available in your home.',
    keywords: ['massage therapist', 'remedial massage', 'deep tissue', 'sports massage', 'relaxation massage', 'mobile massage'],
    jobs: [
      { title: 'Remedial massage course', description: 'Six-session remedial program resolving chronic shoulder tension for an office worker.' },
      { title: 'Pre-event sports massage', description: 'Mobile sports massage for a marathon runner in the week before race day.' },
    ],
    photoSeeds: [448, 449],
  },
  {
    name: 'Counsellor',
    bio: 'Registered counsellor providing a safe, confidential space for anxiety, stress, and relationship support. In-person and online sessions.',
    keywords: ['counsellor', 'counselling', 'therapy', 'mental health', 'relationship counselling', 'anxiety'],
    jobs: [
      { title: 'Anxiety support program', description: 'Ten-week CBT-based counselling program supporting a client through workplace anxiety.' },
      { title: 'Relationship counselling', description: 'Couples sessions improving communication and conflict resolution.' },
    ],
    photoSeeds: [450, 451],
  },
  {
    name: 'Nutritionist',
    bio: 'Accredited nutritionist creating realistic, personalised meal plans for weight management, energy, and sports performance.',
    keywords: ['nutritionist', 'nutrition', 'diet plan', 'meal planning', 'weight management', 'sports nutrition'],
    jobs: [
      { title: 'Personalised meal plan', description: 'Built a 12-week meal plan and shopping guide for sustainable weight management.' },
      { title: 'Sports nutrition plan', description: 'Designed a race-day fuelling strategy for an amateur cyclist.' },
    ],
    photoSeeds: [452, 453],
  },
  {
    name: 'Music Teacher',
    bio: 'Friendly music teacher offering piano, guitar, and singing lessons for all ages and levels, from first notes to graded exams.',
    keywords: ['music teacher', 'piano lessons', 'guitar lessons', 'singing lessons', 'music tuition'],
    jobs: [
      { title: 'Beginner piano lessons', description: 'Weekly piano lessons taking a 9-year-old from beginner to their first graded exam.' },
      { title: 'Adult guitar coaching', description: 'Adult beginner guitar lessons — playing first full songs within two months.' },
    ],
    photoSeeds: [454, 455],
  },
  {
    name: 'Language Tutor',
    bio: 'Experienced language tutor offering lessons in English, Spanish, French, and Mandarin — conversational fluency and exam preparation.',
    keywords: ['language lessons', 'language tutor', 'english lessons', 'spanish lessons', 'french lessons', 'mandarin lessons'],
    jobs: [
      { title: 'Conversational Spanish', description: 'Weekly conversational Spanish for an adult preparing for overseas travel.' },
      { title: 'IELTS English prep', description: 'English coaching helping a student reach their target IELTS band.' },
    ],
    photoSeeds: [456, 457],
  },
  {
    name: 'Driving Instructor',
    bio: 'Patient, fully accredited driving instructor for learners and nervous drivers. Manual and automatic, with structured test preparation.',
    keywords: ['driving instructor', 'driving lessons', 'learner driver', 'manual lessons', 'test preparation'],
    jobs: [
      { title: 'Learner to test-ready', description: 'Took a nervous learner from first lesson to passing on the first attempt.' },
      { title: 'Refresher lessons', description: 'Confidence-building refresher course for a returning driver after years off the road.' },
    ],
    photoSeeds: [458, 459],
  },
  {
    name: 'Accountant',
    bio: 'Registered accountant for individuals and small businesses — tax returns, BAS, bookkeeping, and payroll. Clear advice, no jargon.',
    keywords: ['accountant', 'bookkeeping', 'tax return', 'BAS', 'small business accounting', 'payroll'],
    jobs: [
      { title: 'Small business BAS', description: 'Quarterly BAS lodgement and a bookkeeping cleanup for a sole trader.' },
      { title: 'Annual tax return', description: 'Prepared and lodged individual and rental-property tax returns.' },
    ],
    photoSeeds: [460, 461],
  },
  {
    name: 'Web Designer',
    bio: 'Freelance web designer building fast, responsive websites and online stores. From landing pages to full e-commerce, design to launch.',
    keywords: ['web design', 'web designer', 'website', 'wordpress', 'e-commerce', 'landing page'],
    jobs: [
      { title: 'Small business website', description: 'Designed and built a 6-page responsive website with an online enquiry form.' },
      { title: 'E-commerce store', description: 'Launched a Shopify store with product photography and payment setup.' },
    ],
    photoSeeds: [462, 463],
  },
  {
    name: 'Marketing Consultant',
    bio: 'Marketing consultant helping small businesses grow through social media, SEO, and targeted advertising. Strategy plus hands-on execution.',
    keywords: ['marketing', 'digital marketing', 'social media', 'SEO', 'advertising', 'branding'],
    jobs: [
      { title: 'Social media relaunch', description: 'Rebuilt a café’s Instagram presence, tripling engagement in three months.' },
      { title: 'SEO audit', description: 'Full SEO audit and content plan lifting a service business onto page one.' },
    ],
    photoSeeds: [464, 465],
  },
  {
    name: 'Business Consultant',
    bio: 'Business consultant supporting startups and small businesses with strategy, operations, and growth planning.',
    keywords: ['consultant', 'business consulting', 'strategy', 'startup advice', 'operations'],
    jobs: [
      { title: 'Startup strategy', description: 'Three-month strategy engagement helping a startup define its go-to-market plan.' },
      { title: 'Operations review', description: 'Streamlined operations for a growing trades business, cutting admin time in half.' },
    ],
    photoSeeds: [466, 467],
  },
  {
    name: 'IT Support Technician',
    bio: 'IT support technician for homes and small offices — computer repairs, network setup, data recovery, and tech troubleshooting.',
    keywords: ['it support', 'computer repair', 'tech support', 'network setup', 'data recovery'],
    jobs: [
      { title: 'Home network setup', description: 'Installed mesh Wi-Fi and configured a secure home network across a three-storey home.' },
      { title: 'Laptop data recovery', description: 'Recovered data from a failed drive and migrated everything to a new laptop.' },
    ],
    photoSeeds: [468, 469],
  },
  {
    name: 'Pet Carer',
    bio: 'Loving pet carer offering pet sitting, feeding, and minding for cats, dogs, and small animals. Fully insured with daily photo updates.',
    keywords: ['pet care', 'pet sitting', 'cat sitting', 'pet feeding', 'pet minding'],
    jobs: [
      { title: 'Holiday cat sitting', description: 'Two-week in-home cat sitting with daily feeding, play, and photo updates.' },
      { title: 'Daily pet feeding', description: 'Twice-daily feeding and check-ins for pets while owners worked long shifts.' },
    ],
    photoSeeds: [470, 471],
  },
  {
    name: 'Removalist',
    bio: 'Reliable removalist for local home and office moves — careful packing, furniture removal, and a man-with-a-van service. Fully insured.',
    keywords: ['mover', 'removalist', 'house removals', 'furniture removal', 'man with a van', 'moving'],
    jobs: [
      { title: 'Two-bedroom move', description: 'Full pack and move of a two-bedroom apartment across Sydney in a single day.' },
      { title: 'Furniture delivery', description: 'Careful delivery and assembly of bulky furniture up three flights of stairs.' },
    ],
    photoSeeds: [472, 473],
  },
]

// 2 providers per new profession (34 total)
const NEW_NAMES = [
  'Marco Bianchi',    'Yasmin Farah',     'Hugo Lefebvre',    'Priscilla Adeyemi',
  'Dane Robertson',   'Carmen Delgado',   'Felix Nowak',      'Harriet Quinn',
  'Omar Haddad',      'Tessa Lindqvist',  'Raj Malhotra',     'Bianca Costa',
  'Otis Freeman',     'Greta Olsen',      'Damien Cole',      'Sofia Romano',
  'Caleb Mensah',     'Ingrid Vasquez',   'Theo Karlsson',    'Manon Girard',
  'Vikram Rao',       'Eleni Georgiou',   'Cody Mitchell',    'Aaliyah Bello',
  'Bruno Almeida',    'Naomi Fischer',    'Hassan Nazari',    'Polly Drummond',
  'Andre Santos',     'Mira Kaplan',      'Joel Beckett',     'Saanvi Iyer',
  'Lars Andersen',    'Cleo Hamilton',
]

// ── Availability templates ────────────────────────────────────
type AvailDay = { dayOfWeek: number; startTime: string; endTime: string }

const AVAIL_TEMPLATES: AvailDay[][] = [
  // Mon–Fri full day
  [1,2,3,4,5].map(d => ({ dayOfWeek: d, startTime: '08:00', endTime: '17:00' })),
  // Mon–Fri early
  [1,2,3,4,5].map(d => ({ dayOfWeek: d, startTime: '07:00', endTime: '16:00' })),
  // Mon–Fri + Sat morning
  [...[1,2,3,4,5].map(d => ({ dayOfWeek: d, startTime: '09:00', endTime: '18:00' })),
   { dayOfWeek: 6, startTime: '09:00', endTime: '13:00' }],
  // Mon–Sat
  [1,2,3,4,5,6].map(d => ({ dayOfWeek: d, startTime: '08:00', endTime: '17:00' })),
  // Tue–Sat
  [2,3,4,5,6].map(d => ({ dayOfWeek: d, startTime: '08:30', endTime: '17:30' })),
  // Mon–Thu
  [1,2,3,4].map(d => ({ dayOfWeek: d, startTime: '09:00', endTime: '17:00' })),
  // Flexible — Mon, Wed, Fri + weekend
  [1,3,5].map(d => ({ dayOfWeek: d, startTime: '10:00', endTime: '18:00' })),
  // Weekend only
  [0,6].map(d => ({ dayOfWeek: d, startTime: '09:00', endTime: '15:00' })),
]

// ── Booking modes ─────────────────────────────────────────────
const BOOKING_MODES = ['INSTANT', 'REQUEST', 'BOTH', 'INSTANT', 'INSTANT'] as const

// ── Build providers ───────────────────────────────────────────
function slugify(name: string, idx: number) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + idx
}

function pick<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length]
}

// Distribute professions evenly across 100 slots
const PROFESSION_DISTRIBUTION: string[] = []
const counts: Record<string, number> = {
  'Electrician': 7, 'Plumber': 7, 'Gas Engineer': 4, 'Carpenter': 5,
  'Joiner': 3, 'Roofer': 4, 'Builder': 5, 'Plasterer': 3, 'Tiler': 4,
  'Bricklayer': 3, 'Painter & Decorator': 7, 'Cleaner': 7, 'Gardener': 6,
  'Handyman': 6, 'Locksmith': 3, 'Window Cleaner': 3, 'Pest Control': 3,
  'Appliance Repair': 3, 'HVAC Technician': 4, 'Boiler Engineer': 3,
  'Personal Trainer': 4, 'Tutor': 4, 'Dog Walker': 3, 'Babysitter': 2,
  'Chef': 2, 'Photographer': 3,
}
for (const [prof, count] of Object.entries(counts)) {
  for (let i = 0; i < count; i++) PROFESSION_DISTRIBUTION.push(prof)
}

async function main() {
  console.log('Seeding 100 Sydney providers…')
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12)

  for (let i = 0; i < 100; i++) {
    const name = NAMES[i]
    const slug = slugify(name, i + 1)
    const email = `provider${i + 1}@demo.schedo.app`
    const profName = PROFESSION_DISTRIBUTION[i]
    const profDef = PROFESSION_DEFS.find(p => p.name === profName)!
    const [suburb, baseLat, baseLng] = pick(SUBURBS, i * 3 + 7)

    // Small jitter so pins don't all stack
    const lat = baseLat + (Math.sin(i * 1.7) * 0.012)
    const lng = baseLng + (Math.cos(i * 2.3) * 0.015)

    const availTemplate = pick(AVAIL_TEMPLATES, i)
    const bookingMode = pick(BOOKING_MODES, i)
    const radius = [10, 15, 20, 25, 30][i % 5]

    const provider = await prisma.provider.upsert({
      where: { email },
      update: {},
      create: {
        name,
        slug,
        email,
        passwordHash: hash,
        profession: profName,
        bio: `${profDef.bio} Based in ${suburb}, Sydney.`,
        keywords: profDef.keywords,
        lat,
        lng,
        acceptedRadiusKm: radius,
        bookingMode,
        isVisible: true,
        availability: {
          create: availTemplate.map(a => ({ ...a, isActive: true })),
        },
      },
    })

    // Add 3 completed jobs per provider
    const jobTemplates = JOBS_BY_PROFESSION[profName] ?? []
    const photoSeeds = PHOTO_SEEDS_BY_PROFESSION[profName] ?? [100, 200, 300]
    await prisma.completedJob.deleteMany({ where: { providerId: provider.id } })
    if (jobTemplates.length > 0) {
      await prisma.completedJob.createMany({
        data: jobTemplates.map((job, j) => ({
          providerId: provider.id,
          title: job.title,
          description: job.description,
          imageUrl: `https://picsum.photos/seed/${photoSeeds[j]}/600/400`,
          completedAt: new Date(Date.now() - (j + 1) * 90 * 24 * 60 * 60 * 1000),
        })),
      })
    }

    console.log(`  ${(i + 1).toString().padStart(3)}. ${provider.name.padEnd(22)} ${profName.padEnd(22)} ${suburb}`)
  }

  // ── New-category providers (2 per profession) ───────────────
  console.log('\nSeeding new-category providers…')
  let n = 0
  for (const def of NEW_PROFESSION_DEFS) {
    for (let k = 0; k < 2; k++) {
      const idx = 100 + n // continue the global index for suburb/jitter variety
      const name = NEW_NAMES[n]
      const slug = slugify(name, idx + 1)
      const email = `catprovider${n + 1}@demo.schedo.app`
      const [suburb, baseLat, baseLng] = pick(SUBURBS, idx * 3 + 7)

      const lat = baseLat + (Math.sin(idx * 1.7) * 0.012)
      const lng = baseLng + (Math.cos(idx * 2.3) * 0.015)

      const availTemplate = pick(AVAIL_TEMPLATES, idx)
      const bookingMode = pick(BOOKING_MODES, idx)
      const radius = [10, 15, 20, 25, 30][idx % 5]

      const provider = await prisma.provider.upsert({
        where: { email },
        update: {},
        create: {
          name,
          slug,
          email,
          passwordHash: hash,
          profession: def.name,
          bio: `${def.bio} Based in ${suburb}, Sydney.`,
          keywords: def.keywords,
          lat,
          lng,
          acceptedRadiusKm: radius,
          bookingMode,
          isVisible: true,
          availability: {
            create: availTemplate.map((a) => ({ ...a, isActive: true })),
          },
        },
      })

      await prisma.completedJob.deleteMany({ where: { providerId: provider.id } })
      await prisma.completedJob.createMany({
        data: def.jobs.map((job, j) => ({
          providerId: provider.id,
          title: job.title,
          description: job.description,
          imageUrl: `https://picsum.photos/seed/${def.photoSeeds[j % def.photoSeeds.length]}/600/400`,
          completedAt: new Date(Date.now() - (j + 1) * 90 * 24 * 60 * 60 * 1000),
        })),
      })

      console.log(`  ${(n + 1).toString().padStart(3)}. ${provider.name.padEnd(22)} ${def.name.padEnd(22)} ${suburb}`)
      n++
    }
  }

  console.log('\nDone. All accounts use password:', DEMO_PASSWORD)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
