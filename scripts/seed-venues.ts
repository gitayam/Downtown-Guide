/**
 * Seed script for Fayetteville venues database
 *
 * This script populates the venues table with known Fayetteville venues
 * and their detailed information (address, coordinates, etc.)
 *
 * Usage: npx tsx scripts/seed-venues.ts
 */

interface Venue {
  id: string;
  name: string;
  short_name?: string;
  description?: string;
  address?: string;
  city: string;
  state: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  capacity?: number;
  venue_type: string;
  google_maps_url?: string;
  apple_maps_url?: string;
  image_url?: string;
  hours_of_operation?: string;
  aliases?: string[];
}

const FAYETTEVILLE_VENUES: Venue[] = [
  // Major Sports/Entertainment Venues
  {
    id: 'segra_stadium',
    name: 'Segra Stadium',
    short_name: 'Segra',
    description: 'Home of the Fayetteville Woodpeckers minor league baseball team (Houston Astros affiliate). Modern stadium in downtown with capacity for 5,200 fans.',
    address: '460 Hay St',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28301',
    latitude: 35.0525,
    longitude: -78.8784,
    phone: '(910) 339-1989',
    website: 'https://www.milb.com/fayetteville',
    capacity: 5200,
    venue_type: 'stadium',
    google_maps_url: 'https://maps.google.com/?q=Segra+Stadium+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=460%20Hay%20St,%20Fayetteville,%20NC%20%2028301,%20United%20States',
    hours_of_operation: 'Box Office: Mon-Fri 10am-6pm; Game Days: Varies',
    aliases: ['Segra', 'Woodpeckers Stadium', 'SEGRA Stadium']
  },
  {
    id: 'crown_coliseum',
    name: 'Crown Coliseum',
    short_name: 'Crown',
    description: 'Multi-purpose arena hosting SPHL hockey (Fayetteville Marksmen), concerts, and events. Part of the Crown Complex.',
    address: '1960 Coliseum Dr',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28306',
    latitude: 35.0156,
    longitude: -78.9397,
    phone: '(910) 438-4100',
    website: 'https://www.crowncomplexnc.com',
    capacity: 13000,
    venue_type: 'arena',
    google_maps_url: 'https://maps.google.com/?q=Crown+Coliseum+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=1960%20Coliseum%20Dr,%20Fayetteville,%20NC%20%2028306,%20United%20States',
    hours_of_operation: 'Box Office: Mon-Fri 10am-6pm, Sat 10am-4pm',
    aliases: ['Crown', 'The Crown', 'Crown Arena', 'Crown Center']
  },
  {
    id: 'crown_expo',
    name: 'Crown Expo Center',
    short_name: 'Crown Expo',
    description: 'Exhibition and convention center hosting trade shows, expos, and large gatherings. Part of the Crown Complex.',
    address: '1960 Coliseum Dr',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28306',
    latitude: 35.0156,
    longitude: -78.9397,
    phone: '(910) 438-4100',
    website: 'https://www.crowncomplexnc.com',
    capacity: 100000,
    venue_type: 'expo',
    google_maps_url: 'https://maps.google.com/?q=Crown+Expo+Center+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=1960%20Coliseum%20Dr,%20Fayetteville,%20NC%20%2028306,%20United%20States',
    hours_of_operation: 'Box Office: Mon-Fri 10am-6pm, Sat 10am-4pm',
    aliases: ['Crown Expo', 'Expo Center']
  },
  {
    id: 'crown_theatre',
    name: 'Crown Theatre',
    short_name: 'Crown Theatre',
    description: 'Intimate theater venue for concerts, comedy, and performing arts. Part of the Crown Complex.',
    address: '1960 Coliseum Dr',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28306',
    latitude: 35.0156,
    longitude: -78.9397,
    phone: '(910) 438-4100',
    website: 'https://www.crowncomplexnc.com',
    capacity: 2000,
    venue_type: 'theater',
    google_maps_url: 'https://maps.google.com/?q=Crown+Theatre+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=1960%20Coliseum%20Dr,%20Fayetteville,%20NC%20%2028306,%20United%20States',
    hours_of_operation: 'Box Office: Mon-Fri 10am-6pm, Sat 10am-4pm',
    aliases: []
  },

  // Downtown Venues
  {
    id: 'festival_park',
    name: 'Festival Park',
    short_name: 'Festival Park',
    description: 'Outdoor venue in downtown Fayetteville hosting the Dogwood Festival and other community events.',
    address: '335 Ray Ave',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28301',
    latitude: 35.0550,
    longitude: -78.8789,
    phone: '(910) 433-1547',
    venue_type: 'park',
    google_maps_url: 'https://maps.google.com/?q=Festival+Park+Fayetteville+NC',
    apple_maps_url: 'http://maps.apple.com/?address=335%20Ray%20Ave,%20Fayetteville,%20NC%20%2028301,%20United%20States',
    hours_of_operation: 'Hours vary by event',
    aliases: ['Dogwood Festival Park']
  },
  {
    id: 'downtown_fayetteville',
    name: 'Downtown Fayetteville',
    short_name: 'Downtown',
    description: 'Historic downtown district with restaurants, shops, and event spaces along Hay Street.',
    address: '222 Hay St',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28301',
    latitude: 35.0527,
    longitude: -78.8784,
    venue_type: 'district',
    google_maps_url: 'https://maps.google.com/?q=Downtown+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=222%20Hay%20St,%20Fayetteville,%20NC%20%2028301,%20United%20States',
    aliases: ['Downtown', 'Hay Street', 'Fayetteville Downtown']
  },
  {
    id: 'cameo_art_house',
    name: 'Cameo Art House Theatre',
    short_name: 'Cameo',
    description: 'Historic independent movie theater showing art films, documentaries, and classic movies in downtown Fayetteville.',
    address: '225 Hay St',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28301',
    latitude: 35.0513,
    longitude: -78.8791,
    phone: '(910) 486-6633',
    website: 'https://www.cameoarthouse.com',
    capacity: 200,
    venue_type: 'theater',
    google_maps_url: 'https://maps.google.com/?q=Cameo+Art+House+Theatre+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=225%20Hay%20St,%20Fayetteville,%20NC%20%2028301,%20United%20States',
    hours_of_operation: 'Showtimes vary',
    aliases: ['Cameo Theatre', 'Cameo', 'Cameo Art House']
  },
  {
    id: 'arts_center',
    name: 'The Arts Center',
    short_name: 'Arts Center',
    description: 'Home of the Arts Council of Fayetteville featuring gallery exhibitions and community arts programs.',
    address: '301 Hay St',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28301',
    latitude: 35.0520,
    longitude: -78.8785,
    phone: '(910) 323-1776',
    website: 'https://www.wearethearts.com',
    venue_type: 'museum',
    google_maps_url: 'https://maps.google.com/?q=Arts+Center+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=301%20Hay%20St,%20Fayetteville,%20NC%20%2028301,%20United%20States',
    hours_of_operation: 'Mon-Thu 9am-5pm, Fri 9am-12pm, Sat 12pm-6pm, Sun 2pm-6pm',
    aliases: ['Arts Council', 'Fayetteville Arts Center']
  },

  // University Venues
  {
    id: 'capel_arena',
    name: 'Capel Arena',
    short_name: 'Capel Arena',
    description: 'Basketball arena at Fayetteville State University, home of the FSU Broncos basketball teams.',
    address: '713 Langdon St',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28301',
    latitude: 35.0678,
    longitude: -78.9106,
    phone: '(910) 672-1314',
    website: 'https://fsubroncos.com',
    capacity: 3000,
    venue_type: 'arena',
    google_maps_url: 'https://maps.google.com/?q=Capel+Arena+FSU+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=713%20Langdon%20St,%20Fayetteville,%20NC%20%2028301,%20United%20States',
    hours_of_operation: 'Varies by event',
    aliases: ['FSU Capel Arena', 'Fayetteville State Capel Arena']
  },
  {
    id: 'seabrook_auditorium',
    name: 'Seabrook Auditorium',
    short_name: 'Seabrook',
    description: 'Performing arts venue at Fayetteville State University hosting concerts and cultural events.',
    address: '1200 Murchison Rd',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28301',
    latitude: 35.0678,
    longitude: -78.9106,
    phone: '(910) 672-1314',
    website: 'https://www.uncfsu.edu',
    capacity: 1500,
    venue_type: 'theater',
    google_maps_url: 'https://maps.google.com/?q=Seabrook+Auditorium+FSU+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=1200%20Murchison%20Rd,%20Fayetteville,%20NC%20%2028301,%20United%20States',
    hours_of_operation: 'Varies by event',
    aliases: ['FSU Seabrook', 'Seabrook Auditorium (Fayetteville State University)']
  },
  {
    id: 'jeralds_stadium',
    name: 'Luther "Nick" Jeralds Stadium',
    short_name: 'Jeralds Stadium',
    description: 'Football stadium at Fayetteville State University, home of the FSU Broncos football team.',
    address: '1200 Murchison Rd',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28301',
    latitude: 35.0680,
    longitude: -78.9100,
    phone: '(910) 672-1314',
    website: 'https://fsubroncos.com',
    capacity: 10000,
    venue_type: 'stadium',
    google_maps_url: 'https://maps.google.com/?q=Jeralds+Stadium+FSU+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=1200%20Murchison%20Rd,%20Fayetteville,%20NC%20%2028301,%20United%20States',
    hours_of_operation: 'Varies by event',
    aliases: ['FSU Stadium', 'FSU Football Stadium', 'Jeralds']
  },
  {
    id: 'huff_concert_hall',
    name: 'Huff Concert Hall',
    short_name: 'Huff Hall',
    description: 'Concert hall at Methodist University hosting symphony performances and recitals.',
    address: '5400 Ramsey St',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28311',
    latitude: 35.0012,
    longitude: -78.9678,
    website: 'https://www.methodist.edu',
    capacity: 800,
    venue_type: 'theater',
    google_maps_url: 'https://maps.google.com/?q=Huff+Concert+Hall+Methodist+University+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=5400%20Ramsey%20St,%20Fayetteville,%20NC%20%2028311,%20United%20States',
    hours_of_operation: 'Varies by event',
    aliases: ['Huff Concert Hall (Methodist University)', 'Methodist University Huff Hall']
  },

  // Libraries
  {
    id: 'headquarters_library',
    name: 'Headquarters Library',
    short_name: 'HQ Library',
    description: 'Main branch of Cumberland County Public Library with meeting rooms and community programs.',
    address: '300 Maiden Ln',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28301',
    latitude: 35.0543,
    longitude: -78.8803,
    phone: '(910) 483-7727',
    website: 'https://cumberland.librarycalendar.com',
    venue_type: 'library',
    google_maps_url: 'https://maps.google.com/?q=Headquarters+Library+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=300%20Maiden%20Ln,%20Fayetteville,%20NC%20%2028301,%20United%20States',
    hours_of_operation: 'Mon-Tue, Thu 9am-7pm; Wed, Fri-Sat 9am-6pm; Sun 2pm-6pm',
    aliases: ['Cumberland County Library', 'Main Library']
  },

  // Fort Liberty
  {
    id: 'fort_liberty',
    name: 'Fort Liberty',
    short_name: 'Ft. Liberty',
    description: 'U.S. Army installation (formerly Fort Bragg) with MWR facilities and community events.',
    address: '3550 All American Fwy',
    city: 'Fort Liberty',
    state: 'NC',
    zip: '28310',
    latitude: 35.1395,
    longitude: -79.0064,
    website: 'https://bragg.armymwr.com',
    venue_type: 'military',
    google_maps_url: 'https://maps.google.com/?q=Fort+Liberty+NC',
    apple_maps_url: 'https://maps.apple.com/?address=3550%20All%20American%20Fwy,%20Fort%20Liberty,%20NC%20%2028310,%20United%20States',
    aliases: ['Fort Bragg', 'Ft. Bragg', 'Ft Liberty']
  },

  // Motor Sports
  {
    id: 'fayetteville_speedway',
    name: 'Fayetteville Motor Speedway',
    short_name: 'Speedway',
    description: '4/10-mile dirt oval track hosting NASCAR Advance Auto Parts Weekly Series racing.',
    address: '3407 Doc Bennett Rd',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28306',
    latitude: 35.0012,
    longitude: -78.8256,
    phone: '(910) 990-3488',
    website: 'https://www.myracepass.com/tracks/2933',
    capacity: 8000,
    venue_type: 'stadium',
    google_maps_url: 'https://maps.google.com/?q=Fayetteville+Motor+Speedway+NC',
    apple_maps_url: 'https://maps.apple.com/?address=3407%20Doc%20Bennett%20Rd,%20Fayetteville,%20NC%2028306',
    hours_of_operation: 'Sat: Races; Office: Mon-Sun 9am-5pm',
    aliases: ['Speedway', 'Fay Motor Speedway', 'Fayetteville Speedway']
  },

  // Cafes & Restaurants
  {
    id: 'muse_and_co',
    name: 'Muse & Co',
    short_name: 'Muse',
    description: "Fayetteville's Artist Lounge and Teahouse in downtown.",
    address: '311 Hay St',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28301',
    latitude: 35.0521,
    longitude: -78.8787,
    website: 'https://ncmuse.co',
    venue_type: 'cafe',
    google_maps_url: 'https://maps.google.com/?q=Muse+and+Co+311+Hay+St+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=311%20Hay%20St,%20Fayetteville,%20NC%20%2028301,%20United%20States',
    hours_of_operation: 'Tue-Fri 11am-7pm, Sat-Sun 11am-8pm',
    aliases: ['Muse', 'Muse and Co']
  },
  {
    id: 'the_warehouse',
    name: 'The Warehouse',
    short_name: 'The Warehouse',
    description: 'Premier event venue in downtown Fayetteville hosting weddings, corporate events, and private parties.',
    address: '226 Donaldson St',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28301',
    latitude: 35.0538,
    longitude: -78.8778,
    phone: '(910) 920-4104',
    website: 'https://226thewarehousenc.com',
    venue_type: 'other',
    google_maps_url: 'https://maps.google.com/?q=226+Donaldson+St+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=226%20Donaldson%20St,%20Fayetteville,%20NC%20%2028301,%20United%20States',
    hours_of_operation: 'By appointment',
    aliases: ['226 The Warehouse', 'The Warehouse at 226', '226 Donaldson St']
  },

  // Bars & Entertainment
  {
    id: 'paddys_irish_pub',
    name: "Paddy's Irish Public House",
    short_name: "Paddy's",
    description: 'Award-winning Irish Pub with live music, comedy, and dance events.',
    address: '2606 Raeford Rd, Ste B',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28303',
    phone: '(910) 568-5654',
    website: 'https://paddysirishpub.com',
    venue_type: 'bar',
    google_maps_url: "https://maps.google.com/?q=Paddy's+Irish+Public+House+Fayetteville+NC",
    apple_maps_url: 'https://maps.apple.com/?address=2606%20Raeford%20Rd,%20Fayetteville,%20NC%2028303',
    hours_of_operation: 'Wed-Sat 6pm-2am',
    aliases: ["Paddys Irish Public House", "Paddys Irish Pub", "Paddy's"]
  },
  {
    id: 'latitude_35',
    name: 'Latitude 35 Bar and Grill',
    short_name: 'Latitude 35',
    description: 'Caribbean-inspired New American cuisine in Haymont Historic District.',
    address: '1217 Hay St',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28305',
    phone: '(910) 485-4777',
    website: 'https://latitude35.netwaiter.com',
    venue_type: 'restaurant',
    google_maps_url: 'https://maps.google.com/?q=Latitude+35+Bar+Grill+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=1217%20Hay%20St,%20Fayetteville,%20NC%2028305',
    hours_of_operation: 'Tue-Thu 11:30am-10pm, Fri-Sat 11:30am-12am, Sun 9am-9pm',
    aliases: ['Latitude 35 Bar & Grill', 'Latitude 35']
  },
  {
    id: 'taste_of_west_africa',
    name: 'Taste of West Africa',
    short_name: 'TOWA',
    description: 'Authentic West African cuisine with lounge and bar in downtown.',
    address: '116 Person St',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28301',
    phone: '(910) 779-2375',
    website: 'https://www.tasteofwestafrica.net',
    venue_type: 'restaurant',
    google_maps_url: 'https://maps.google.com/?q=Taste+of+West+Africa+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=116%20Person%20St,%20Fayetteville,%20NC%2028301',
    hours_of_operation: 'Wed-Sat 11am-8pm, Sun 11am-5pm',
    aliases: ['TOWA', 'A Taste of West Africa']
  },

  // Galleries & Retail
  {
    id: 'city_center_gallery',
    name: 'City Center Gallery and Books',
    short_name: 'City Center Gallery',
    description: 'Art gallery and indie bookstore in historic downtown Fayetteville.',
    address: '112 Hay St',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28301',
    phone: '(910) 678-8899',
    website: 'https://www.citycentergallery.com',
    venue_type: 'gallery',
    google_maps_url: 'https://maps.google.com/?q=City+Center+Gallery+Books+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=112%20Hay%20St,%20Fayetteville,%20NC%2028301',
    hours_of_operation: 'Mon-Thu 10am-6pm, Fri-Sat 10am-8pm',
    aliases: ['City Center Gallery & Books', 'City Center Gallery']
  },
  {
    id: 'garnet_skull',
    name: 'Garnet Skull',
    short_name: 'Garnet Skull',
    description: 'Metaphysical supply and oddities shop.',
    address: '120 Hay St',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28301',
    website: 'https://www.garnetskull.com',
    venue_type: 'retail',
    google_maps_url: 'https://maps.google.com/?q=Garnet+Skull+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=120%20Hay%20St,%20Fayetteville,%20NC%2028301',
    hours_of_operation: '11am-7pm daily',
    aliases: ['The Garnet Skull']
  },

  // Event Venues
  {
    id: 'volta_space',
    name: 'Volta Space',
    short_name: 'Volta',
    description: 'Rustic event space and wedding venue in Cool Spring Downtown District.',
    address: '116 Person St',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28301',
    phone: '(910) 978-3352',
    website: 'https://www.voltaspace.com',
    venue_type: 'event_venue',
    google_maps_url: 'https://maps.google.com/?q=Volta+Space+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=116%20Person%20St,%20Fayetteville,%20NC%2028301',
    hours_of_operation: 'Mon-Fri 9am-5pm, Sat 9am-3pm',
    aliases: ['Volta']
  },

  // Sports & Recreation
  {
    id: 'tj_robinson_sportsplex',
    name: 'T.J. Robinson Sportsplex',
    short_name: 'TJ Robinson',
    description: 'Largest sportsplex in Cumberland County with NBA hardwood courts.',
    address: '4221 Black Bridge Rd',
    city: 'Hope Mills',
    state: 'NC',
    zip: '28348',
    phone: '(910) 860-8898',
    website: 'https://robinsonsportsplex.com',
    venue_type: 'sports_complex',
    google_maps_url: 'https://maps.google.com/?q=TJ+Robinson+Sportsplex+Hope+Mills+NC',
    apple_maps_url: 'https://maps.apple.com/?address=4221%20Black%20Bridge%20Rd,%20Hope%20Mills,%20NC%2028348',
    aliases: ['T.J. Robinson Life Center', 'TJ Robinson Sportsplex', 'Robinson Sportsplex']
  },
  {
    id: 'pechmann_fishing_center',
    name: 'John E. Pechmann Fishing Education Center',
    short_name: 'Pechmann Center',
    description: 'NC Wildlife fishing education facility.',
    address: '7489 Raeford Rd',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28304',
    website: 'https://www.ncwildlife.gov/education/john-e-pechmann-fishing-education-center',
    venue_type: 'education',
    google_maps_url: 'https://maps.google.com/?q=Pechmann+Fishing+Education+Center+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=7489%20Raeford%20Rd,%20Fayetteville,%20NC%2028304',
    hours_of_operation: 'Mon-Fri 9am-4pm',
    aliases: ['Pechmann Fishing Center', 'Pechmann Center']
  },

  // Universities
  {
    id: 'riddle_center',
    name: 'March F. Riddle Center',
    short_name: 'Riddle Center',
    description: 'Multi-purpose arena at Methodist University.',
    address: '5400 Ramsey St',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28311',
    phone: '(910) 630-7022',
    website: 'https://mumonarchs.com',
    capacity: 1300,
    venue_type: 'arena',
    google_maps_url: 'https://maps.google.com/?q=March+F+Riddle+Center+Methodist+University+Fayetteville+NC',
    apple_maps_url: 'https://maps.apple.com/?address=5400%20Ramsey%20St,%20Fayetteville,%20NC%2028311',
    aliases: ['Methodist University - March F. Riddle Center', 'Riddle Center', 'Methodist University Riddle Center']
  },

  // Transportation
  {
    id: 'fayetteville_airport',
    name: 'Fayetteville Regional Airport',
    short_name: 'FAY Airport',
    description: 'Public airport serving Fayetteville and Fort Liberty.',
    address: '400 Airport Rd',
    city: 'Fayetteville',
    state: 'NC',
    zip: '28306',
    phone: '(910) 433-1160',
    website: 'https://www.fayettevillenc.gov/City-Departments/Airport',
    venue_type: 'airport',
    google_maps_url: 'https://maps.google.com/?q=Fayetteville+Regional+Airport+NC',
    apple_maps_url: 'https://maps.apple.com/?address=400%20Airport%20Rd,%20Fayetteville,%20NC%2028306',
    aliases: ['FAY Airport', 'FAY', 'Grannis Field']
  },
];

async function seedVenues() {
  console.log('Seeding venues database...\n');

  // Generate SQL statements
  const statements: string[] = [];

  for (const venue of FAYETTEVILLE_VENUES) {
    // Insert venue
    const cols = ['id', 'name', 'city', 'state', 'venue_type'];
    const vals = [
      `'${venue.id}'`,
      `'${venue.name.replace(/'/g, "''")}'`,
      `'${venue.city}'`,
      `'${venue.state}'`,
      `'${venue.venue_type}'`
    ];

    if (venue.short_name) { cols.push('short_name'); vals.push(`'${venue.short_name.replace(/'/g, "''")}'`); }
    if (venue.description) { cols.push('description'); vals.push(`'${venue.description.replace(/'/g, "''")}'`); }
    if (venue.address) { cols.push('address'); vals.push(`'${venue.address.replace(/'/g, "''")}'`); }
    if (venue.zip) { cols.push('zip'); vals.push(`'${venue.zip}'`); }
    if (venue.latitude) { cols.push('latitude'); vals.push(`${venue.latitude}`); }
    if (venue.longitude) { cols.push('longitude'); vals.push(`${venue.longitude}`); }
    if (venue.phone) { cols.push('phone'); vals.push(`'${venue.phone}'`); }
    if (venue.website) { cols.push('website'); vals.push(`'${venue.website}'`); }
    if (venue.capacity) { cols.push('capacity'); vals.push(`${venue.capacity}`); }
    if (venue.google_maps_url) { cols.push('google_maps_url'); vals.push(`'${venue.google_maps_url}'`); }
    if (venue.apple_maps_url) { cols.push('apple_maps_url'); vals.push(`'${venue.apple_maps_url}'`); }
    if (venue.hours_of_operation) { cols.push('hours_of_operation'); vals.push(`'${venue.hours_of_operation.replace(/'/g, "''")}'`); }
    if (venue.image_url) { cols.push('image_url'); vals.push(`'${venue.image_url}'`); }

    statements.push(
      `INSERT OR REPLACE INTO venues (${cols.join(', ')}) VALUES (${vals.join(', ')});`
    );

    // Insert aliases
    if (venue.aliases) {
      for (const alias of venue.aliases) {
        statements.push(
          `INSERT OR IGNORE INTO venue_aliases (venue_id, alias) VALUES ('${venue.id}', '${alias.replace(/'/g, "''")}');`
        );
      }
    }

    console.log(`  ✓ ${venue.name}`);
    if (venue.aliases?.length) {
      console.log(`    Aliases: ${venue.aliases.join(', ')}`);
    }
  }

  // Output SQL file
  const sqlContent = `-- Venue seed data generated ${new Date().toISOString()}\n\n${statements.join('\n')}`;

  console.log(`\n📝 Generated ${statements.length} SQL statements for ${FAYETTEVILLE_VENUES.length} venues`);
  console.log('\nTo apply, run:');
  console.log('  npx wrangler d1 execute downtown-events --remote --file=scripts/venues-seed.sql\n');

  // Write to file
  const fs = await import('fs');
  fs.writeFileSync('scripts/venues-seed.sql', sqlContent);
  console.log('✅ SQL written to scripts/venues-seed.sql');
}

seedVenues().catch(console.error);
