const CITY_STORAGE_KEY = "movix-selected-city";
const CITY_CHANGE_EVENT = "movix-city-change";
const DEFAULT_CITY = "Jabalpur";
const INDIA_CITY_OPTIONS = [
  "Jabalpur",
  "Mumbai",
  "Delhi NCR",
  "Bengaluru",
  "Hyderabad",
  "Ahmedabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Jaipur",
  "Surat",
  "Lucknow",
  "Kanpur",
  "Nagpur",
  "Indore",
  "Thane",
  "Bhopal",
  "Visakhapatnam",
  "Patna",
  "Vadodara",
  "Ghaziabad",
  "Ludhiana",
  "Agra",
  "Nashik",
  "Faridabad",
  "Meerut",
  "Rajkot",
  "Kalyan",
  "Vasai",
  "Varanasi",
  "Srinagar",
  "Aurangabad",
  "Dhanbad",
  "Amritsar",
  "Navi Mumbai",
  "Allahabad",
  "Prayagraj",
  "Ranchi",
  "Howrah",
  "Coimbatore",
  "Gwalior",
  "Vijayawada",
  "Jodhpur",
  "Madurai",
  "Raipur",
  "Kota",
  "Guwahati",
  "Chandigarh",
  "Solapur",
  "Hubballi",
  "Mysuru",
  "Tiruchirappalli",
  "Bareilly",
  "Aligarh",
  "Moradabad",
  "Gurugram",
  "Gurgaon",
  "Noida",
  "Jalandhar",
  "Bhubaneswar",
  "Salem",
  "Warangal",
  "Mira Bhayandar",
  "Thiruvananthapuram",
  "Guntur",
  "Bhiwandi",
  "Saharanpur",
  "Gorakhpur",
  "Bikaner",
  "Amravati",
  "Jamshedpur",
  "Bhilai",
  "Cuttack",
  "Firozabad",
  "Kochi",
  "Nellore",
  "Bhavnagar",
  "Dehradun",
  "Durgapur",
  "Asansol",
  "Rourkela",
  "Nanded",
  "Kolhapur",
  "Ajmer",
  "Akola",
  "Gulbarga",
  "Jamnagar",
  "Ujjain",
  "Loni",
  "Siliguri",
  "Jhansi",
  "Ulhasnagar",
  "Jammu",
  "Sangli",
  "Mangalore",
  "Erode",
  "Belgaum",
  "Ambattur",
  "Tirunelveli",
  "Malegaon",
  "Gaya",
  "Jalgaon",
  "Udaipur",
  "Maheshtala",
  "Tiruppur",
  "Davanagere",
  "Kozhikode",
  "Kurnool",
  "Rajpur Sonarpur",
  "Bokaro",
  "South Dumdum",
  "Bellary",
  "Patiala",
  "Gopalpur",
  "Agartala",
  "Bhagalpur",
  "Muzaffarnagar",
  "Bhatpara",
  "Panihati",
  "Latur",
  "Dhule",
  "Rohtak",
  "Korba",
  "Bhilwara",
  "Brahmapur",
  "Muzaffarpur",
  "Ahmednagar",
  "Mathura",
  "Kollam",
  "Avadi",
  "Kadapa",
  "Kamarhati",
  "Sambalpur",
  "Bilaspur",
  "Shahjahanpur",
  "Satara",
  "Bijapur",
  "Rampur",
  "Shivamogga",
  "Chandrapur",
  "Junagadh",
  "Thrissur",
  "Alwar",
  "Bardhaman",
  "Kulti",
  "Kakinada",
  "Nizamabad",
  "Parbhani",
  "Tumkur",
  "Khammam",
  "Ozhukarai",
  "Bihar Sharif",
  "Panipat",
  "Darbhanga",
  "Bally",
  "Aizawl",
  "Dewas",
  "Ichalkaranji",
  "Karnal",
  "Bathinda",
  "Jalna",
  "Eluru",
  "Barasat",
  "Kirari Suleman Nagar",
  "Purnia",
  "Satna",
  "Mau",
  "Sonipat",
  "Farrukhabad",
  "Sagar",
  "Rourkela",
  "Durg",
  "Imphal",
  "Ratlam",
  "Hapur",
  "Arrah",
  "Karimnagar",
  "Anantapur",
  "Etawah",
  "Ambernath",
  "North Dumdum",
  "Bharatpur",
  "Begusarai",
  "New Delhi",
  "Gandhidham",
  "Baranagar",
  "Tiruvottiyur",
  "Pondicherry",
  "Puducherry",
  "Sikar",
  "Thoothukudi",
  "Rewa",
  "Mirzapur",
  "Raichur",
  "Pali",
  "Ramagundam",
  "Haridwar",
  "Vijayanagaram",
  "Katihar",
  "Nagercoil",
  "Sri Ganganagar",
  "Karawal Nagar",
  "Mango",
  "Thanjavur",
  "Bulandshahr",
  "Uluberia",
  "Katni",
  "Sambhal",
  "Singrauli",
  "Nadiad",
  "Secunderabad",
  "Naihati",
  "Yamunanagar",
  "Bidhan Nagar",
  "Pallavaram",
  "Bidar",
  "Munger",
  "Panchkula",
  "Burhanpur",
  "Raurkela Industrial Township",
  "Kharagpur",
  "Dindigul",
  "Gandhinagar",
  "Hospet",
  "Nangloi Jat",
  "Malda",
  "Ongole",
  "Deoghar",
  "Chapra",
  "Haldia",
  "Khandwa",
  "Nandyal",
  "Morena",
  "Amroha",
  "Anand",
  "Bhind",
  "Bhalswa Jahangir Pur",
  "Madhyamgram",
  "Bhiwani",
  "Berhampur",
  "Ambala",
  "Morbi",
  "Fatehpur",
  "Raebareli",
  "Khora",
  "Chittoor",
  "Bhusawal",
  "Orai",
  "Bahraich",
  "Phusro",
  "Vellore",
  "Mehsana",
  "Raiganj",
  "Sirsa",
  "Danapur",
  "Serampore",
  "Sultan Pur Majra",
  "Guna",
  "Jaunpur",
  "Panvel",
  "Shivpuri",
  "Surendranagar",
  "Unnao",
  "Hugli",
  "Alappuzha",
  "Kottayam",
  "Shimla",
  "Shillong",
  "Gangtok",
  "Itanagar",
  "Kohima",
  "Dispur",
  "Port Blair",
  "Daman",
  "Diu",
  "Silvassa",
  "Leh",
  "Kargil",
];
const INDIA_STATE_NAMES = new Set([
  "Andaman and Nicobar Islands (union territory)",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh (union territory)",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu (union territory)",
  "Delhi (national capital territory)",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir (union territory)",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh (union territory)",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry (union territory)",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
]);
const INDIA_CITY_DIRECTORY_TEXT = `
Andaman and Nicobar Islands (union territory)
Port Blair
Andhra Pradesh
Adoni
Amaravati
Anantapur
Chandragiri
Chittoor
Dowlaiswaram
Eluru
Guntur
Kadapa
Kakinada
Kurnool
Machilipatnam
Nagarjunakonda
Rajahmundry
Srikakulam
Tirupati
Vijayawada
Visakhapatnam
Vizianagaram
Yemmiganur
Arunachal Pradesh
Itanagar
Assam
Dhuburi
Dibrugarh
Dispur
Guwahati
Jorhat
Nagaon
Sivasagar
Silchar
Tezpur
Tinsukia
Bihar
Ara
Barauni
Begusarai
Bettiah
Bhagalpur
Bihar Sharif
Bodh Gaya
Buxar
Chapra
Darbhanga
Dehri
Dinapur Nizamat
Gaya
Hajipur
Jamalpur
Katihar
Madhubani
Motihari
Munger
Muzaffarpur
Patna
Purnia
Pusa
Saharsa
Samastipur
Sasaram
Sitamarhi
Siwan
Chandigarh (union territory)
Chandigarh
Chhattisgarh
Ambikapur
Bhilai
Bilaspur
Dhamtari
Durg
Jagdalpur
Raipur
Rajnandgaon
Dadra and Nagar Haveli and Daman and Diu (union territory)
Daman
Diu
Silvassa
Delhi (national capital territory)
Delhi
New Delhi
Goa
Madgaon
Panaji
Gujarat
Ahmadabad
Amreli
Bharuch
Bhavnagar
Bhuj
Dwarka
Gandhinagar
Godhra
Jamnagar
Junagadh
Kandla
Khambhat
Kheda
Mahesana
Morbi
Nadiad
Navsari
Okha
Palanpur
Patan
Porbandar
Rajkot
Surat
Surendranagar
Valsad
Veraval
Haryana
Ambala
Bhiwani
Chandigarh
Faridabad
Firozpur Jhirka
Gurugram
Hansi
Hisar
Jind
Kaithal
Karnal
Kurukshetra
Panipat
Pehowa
Rewari
Rohtak
Sirsa
Sonipat
Himachal Pradesh
Bilaspur
Chamba
Dalhousie
Dharmshala
Hamirpur
Kangra
Kullu
Mandi
Nahan
Shimla
Una
Jammu and Kashmir (union territory)
Anantnag
Baramula
Doda
Gulmarg
Jammu
Kathua
Punch
Rajouri
Srinagar
Udhampur
Jharkhand
Bokaro
Chaibasa
Deoghar
Dhanbad
Dumka
Giridih
Hazaribag
Jamshedpur
Jharia
Rajmahal
Ranchi
Saraikela
Karnataka
Badami
Ballari
Bengaluru
Belagavi
Bhadravati
Bidar
Chikkamagaluru
Chitradurga
Davangere
Halebid
Hassan
Hubballi-Dharwad
Kalaburagi
Kolar
Madikeri
Mandya
Mangaluru
Mysuru
Raichur
Shivamogga
Shravanabelagola
Shrirangapattana
Tumakuru
Vijayapura
Kerala
Alappuzha
Vatakara
Idukki
Kannur
Kochi
Kollam
Kottayam
Kozhikode
Mattancheri
Palakkad
Thalassery
Thiruvananthapuram
Thrissur
Ladakh (union territory)
Kargil
Leh
Madhya Pradesh
Balaghat
Barwani
Betul
Bharhut
Bhind
Bhojpur
Bhopal
Burhanpur
Chhatarpur
Chhindwara
Damoh
Datia
Dewas
Dhar
Dr. Ambedkar Nagar (Mhow)
Guna
Gwalior
Hoshangabad
Indore
Itarsi
Jabalpur
Jhabua
Khajuraho
Khandwa
Khargone
Maheshwar
Mandla
Mandsaur
Morena
Murwara
Narsimhapur
Narsinghgarh
Narwar
Neemuch
Nowgong
Orchha
Panna
Raisen
Rajgarh
Ratlam
Rewa
Sagar
Sarangpur
Satna
Sehore
Seoni
Shahdol
Shajapur
Sheopur
Shivpuri
Ujjain
Vidisha
Maharashtra
Ahmadnagar
Akola
Amravati
Aurangabad
Bhandara
Bhusawal
Bid
Buldhana
Chandrapur
Daulatabad
Dhule
Jalgaon
Kalyan
Karli
Kolhapur
Mahabaleshwar
Malegaon
Matheran
Mumbai
Nagpur
Nanded
Nashik
Osmanabad
Pandharpur
Parbhani
Pune
Ratnagiri
Sangli
Satara
Sevagram
Solapur
Thane
Ulhasnagar
Vasai-Virar
Wardha
Yavatmal
Manipur
Imphal
Meghalaya
Cherrapunji
Shillong
Mizoram
Aizawl
Lunglei
Nagaland
Kohima
Mon
Phek
Wokha
Zunheboto
Odisha
Balangir
Baleshwar
Baripada
Bhubaneshwar
Brahmapur
Cuttack
Dhenkanal
Kendujhar
Konark
Koraput
Paradip
Phulabani
Puri
Sambalpur
Udayagiri
Puducherry (union territory)
Karaikal
Mahe
Puducherry
Yanam
Punjab
Amritsar
Batala
Chandigarh
Faridkot
Firozpur
Gurdaspur
Hoshiarpur
Jalandhar
Kapurthala
Ludhiana
Nabha
Patiala
Rupnagar
Sangrur
Rajasthan
Abu
Ajmer
Alwar
Amer
Barmer
Beawar
Bharatpur
Bhilwara
Bikaner
Bundi
Chittaurgarh
Churu
Dhaulpur
Dungarpur
Ganganagar
Hanumangarh
Jaipur
Jaisalmer
Jalor
Jhalawar
Jhunjhunu
Jodhpur
Kishangarh
Kota
Merta
Nagaur
Nathdwara
Pali
Phalodi
Pushkar
Sawai Madhopur
Shahpura
Sikar
Sirohi
Tonk
Udaipur
Sikkim
Gangtok
Gyalshing
Lachung
Mangan
Tamil Nadu
Arcot
Chengalpattu
Chennai
Chidambaram
Coimbatore
Cuddalore
Dharmapuri
Dindigul
Erode
Kanchipuram
Kanniyakumari
Kodaikanal
Kumbakonam
Madurai
Mamallapuram
Nagappattinam
Nagercoil
Palayamkottai
Pudukkottai
Rajapalayam
Ramanathapuram
Salem
Thanjavur
Tiruchchirappalli
Tirunelveli
Tiruppur
Thoothukudi
Udhagamandalam
Vellore
Telangana
Hyderabad
Karimnagar
Khammam
Mahbubnagar
Nizamabad
Sangareddi
Warangal
Tripura
Agartala
Uttar Pradesh
Agra
Aligarh
Amroha
Ayodhya
Azamgarh
Bahraich
Ballia
Banda
Bara Banki
Bareilly
Basti
Bijnor
Bithur
Budaun
Bulandshahr
Deoria
Etah
Etawah
Faizabad
Farrukhabad-cum-Fatehgarh
Fatehpur
Fatehpur Sikri
Ghaziabad
Ghazipur
Gonda
Gorakhpur
Hamirpur
Hardoi
Hathras
Jalaun
Jaunpur
Jhansi
Kannauj
Kanpur
Lakhimpur
Lalitpur
Lucknow
Mainpuri
Mathura
Meerut
Mirzapur-Vindhyachal
Moradabad
Muzaffarnagar
Partapgarh
Pilibhit
Prayagraj
Rae Bareli
Rampur
Saharanpur
Sambhal
Shahjahanpur
Sitapur
Sultanpur
Tehri
Varanasi
Uttarakhand
Almora
Dehra Dun
Haridwar
Mussoorie
Nainital
Pithoragarh
West Bengal
Alipore
Alipur Duar
Asansol
Baharampur
Bally
Balurghat
Bankura
Baranagar
Barasat
Barrackpore
Basirhat
Bhatpara
Bishnupur
Budge Budge
Burdwan
Chandernagore
Darjeeling
Diamond Harbour
Dum Dum
Durgapur
Halisahar
Haora
Hugli
Ingraj Bazar
Jalpaiguri
Kalimpong
Kamarhati
Kanchrapara
Kharagpur
Cooch Behar
Kolkata
Krishnanagar
Malda
Midnapore
Murshidabad
Nabadwip
Palashi
Panihati
Purulia
Raiganj
Santipur
Shantiniketan
Shrirampur
Siliguri
Siuri
Tamluk
Titagarh
`;
const SEARCHABLE_CITY_OPTIONS = parseCityDirectory(INDIA_CITY_DIRECTORY_TEXT);

function readPreferredCity() {
  if (typeof window === "undefined") return DEFAULT_CITY;
  return window.localStorage.getItem(CITY_STORAGE_KEY) || DEFAULT_CITY;
}

function writePreferredCity(city) {
  const nextCity = normalizeCity(city);
  if (typeof window === "undefined" || !nextCity) return;
  window.localStorage.setItem(CITY_STORAGE_KEY, nextCity);
  window.dispatchEvent(new CustomEvent(CITY_CHANGE_EVENT, { detail: { city: nextCity } }));
}

function subscribePreferredCity(listener) {
  if (typeof window === "undefined") return () => {};

  const handleCityChange = (event) => {
    listener(event.detail?.city || readPreferredCity());
  };
  const handleStorage = (event) => {
    if (event.key === CITY_STORAGE_KEY) listener(event.newValue || DEFAULT_CITY);
  };

  window.addEventListener(CITY_CHANGE_EVENT, handleCityChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(CITY_CHANGE_EVENT, handleCityChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function sortCities(cities) {
  return [...new Set(cities.map(normalizeCity).filter(Boolean))].sort((a, b) => {
    if (a === DEFAULT_CITY) return -1;
    if (b === DEFAULT_CITY) return 1;
    return a.localeCompare(b);
  });
}

function buildCityOptions(cities = [], selectedCity = "") {
  const knownCities = new Set(
    SEARCHABLE_CITY_OPTIONS.map((option) => normalizeSearch(option.city)),
  );
  const extraOptions = sortCities([...cities, selectedCity])
    .filter((city) => !knownCities.has(normalizeSearch(city)))
    .map((city) => makeCityOption(city, ""));

  return prioritizeSelectedCity([...SEARCHABLE_CITY_OPTIONS, ...extraOptions], selectedCity);
}

function normalizeCity(city) {
  return String(city ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSearch(value) {
  return normalizeCity(value).toLowerCase();
}

function makeCityOption(city, state) {
  const normalizedCity = normalizeCity(city);
  const normalizedState = normalizeCity(state);
  return {
    city: normalizedCity,
    key: `${normalizedCity}-${normalizedState || "custom"}`,
    searchText: normalizeSearch(`${normalizedCity} ${normalizedState}`),
    state: normalizedState,
  };
}

function parseCityDirectory(text) {
  const options = [];
  let currentState = "";

  text
    .split("\n")
    .map(normalizeCity)
    .filter(Boolean)
    .forEach((line) => {
      if (INDIA_STATE_NAMES.has(line)) {
        currentState = line;
        return;
      }

      options.push(makeCityOption(line, currentState));
    });

  return options;
}

function prioritizeSelectedCity(options, selectedCity) {
  const selected = normalizeSearch(selectedCity);
  if (!selected) return options;

  const matches = [];
  const rest = [];
  options.forEach((option) => {
    if (normalizeSearch(option.city) === selected) matches.push(option);
    else rest.push(option);
  });

  return [...matches, ...rest];
}

export {
  DEFAULT_CITY,
  INDIA_CITY_OPTIONS,
  SEARCHABLE_CITY_OPTIONS,
  buildCityOptions,
  readPreferredCity,
  sortCities,
  subscribePreferredCity,
  writePreferredCity,
};
