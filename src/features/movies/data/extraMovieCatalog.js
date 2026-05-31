import { castAvatarFallback, movieImageFallback } from "../services/movieMedia.js";
import { getRealCastAvatar, getRealMovieMedia } from "./realMovieMedia.generated.js";
import { getRequestedCastAvatar } from "./requestedCastMedia.generated.js";

const TARGET_CAST_COUNT = 6;

const releasedCastOverrides = {
  "I Love Boosters": [
    "Keke Palmer",
    "Demi Moore",
    "Naomi Ackie",
    "LaKeith Stanfield",
    "Eiza González",
    "Will Poulter",
  ],
  "Remarkably Bright Creatures": [
    "Chris Pratt",
    "Sally Field",
    "Lewis Pullman",
    "Alfred Molina",
    "Joan Chen",
    "Kathy Baker",
  ],
  Obsession: [
    "Michael Johnston",
    "Inde Navarrette",
    "Cooper Tomlinson",
    "Megan Lawless",
    "Andy Richter",
    "Haley Fitzgerald",
  ],
  "The Sheep Detectives": [
    "Hugh Jackman",
    "Emma Thompson",
    "Nicholas Braun",
    "Nicholas Galitzine",
    "Molly Gordon",
    "Hong Chau",
  ],
  "28 Years Later: The Bone Temple": [
    "Ralph Fiennes",
    "Cillian Murphy",
    "Jodie Comer",
    "Jack O'Connell",
    "Erin Kellyman",
    "Albie Marber",
  ],
  "The Rip": [
    "Matt Damon",
    "Ben Affleck",
    "Steven Yeun",
    "Teyana Taylor",
    "Kyle Chandler",
    "Sasha Calle",
  ],
  "Dead Man's Wire": [
    "Bill Skarsgard",
    "Al Pacino",
    "Ed Harris",
    "J.K. Simmons",
    "Diego Boneta",
    "Clara Rugaard",
  ],
  Magellan: [
    "Gael Garcia Bernal",
    "Richard Armitage",
    "Stephen Moyer",
    "Orlando Bloom",
    "Evangeline Lilly",
    "Luke Evans",
  ],
  Ikkis: [
    "Agastya Nanda",
    "Dharmendra",
    "Jaideep Ahlawat",
    "Dinesh Prabhakar",
    "Shahid Latief",
    "Sachin Khedekar",
  ],
  "Vadh 2": [
    "Sanjay Mishra",
    "Neena Gupta",
    "Manav Vij",
    "Saurabh Shukla",
    "Diwakar Kumar",
    "Jaspal Sandhu",
  ],
  Assi: [
    "Taapsee Pannu",
    "Revathi",
    "Manoj Bajpayee",
    "Parambrata Chatterjee",
    "Kanwaljit Singh",
    "Vineet Kumar Singh",
  ],
  "Do Deewane Seher Mein": [
    "Siddhant Chaturvedi",
    "Mrunal Thakur",
    "Rohan Gurbaxani",
    "Raghav Juyal",
    "Sayani Gupta",
    "Sheeba Chaddha",
  ],
  "O Romeo": [
    "Shahid Kapoor",
    "Triptii Dimri",
    "Kriti Sanon",
    "Dharmendra",
    "Dimple Kapadia",
    "Rakesh Bedi",
  ],
  Subedaar: [
    "Anil Kapoor",
    "Radhika Madan",
    "Khushbu Sundar",
    "Saurabh Shukla",
    "Aditya Rawal",
    "Mona Singh",
  ],
  "Raja Shivaji": [
    "Riteish Deshmukh",
    "Sanjay Dutt",
    "Abhishek Bachchan",
    "Vidya Balan",
    "Genelia D'Souza",
    "Fardeen Khan",
  ],
  Kennedy: [
    "Rahul Bhat",
    "Sunny Leone",
    "Mohit Takalkar",
    "Abhilash Thapliyal",
    "Shrikant Yadav",
    "Megha Burman",
  ],
  "Paro Pinaki Ki Kahani": [
    "R Madhavan",
    "Jim Sarbh",
    "Shreya Dhanwanthary",
    "Shefali Shah",
    "Jaideep Ahlawat",
    "Pankaj Tripathi",
  ],
  "Happy Patel Khatarnak Jasoos": [
    "Vir Das",
    "Mithila Palkar",
    "Mona Singh",
    "Sharib Hashmi",
    "Srushti Tawade",
    "Imran Khan",
  ],
  "Azad Bharath": [
    "Sunny Deol",
    "Sanjay Dutt",
    "Jackie Shroff",
    "Mithun Chakraborty",
    "Johny Lever",
  ],
  "Bihu Attack": [
    "R Madhavan",
    "Lin Laishram",
    "Adil Hussain",
    "Plabita Borthakur",
    "Dipannita Sharma",
    "Pavitra Sarkar",
  ],
  "Ek Din": [
    "R Madhavan",
    "Anupam Kher",
    "Paresh Rawal",
    "Naseeruddin Shah",
    "Ratna Pathak Shah",
    "Kumud Mishra",
  ],
  "Chand Mera Dil": [
    "Ananya Panday",
    "Lakshya Lalwani",
    "Aashish Dubey",
    "Ankur Poddar",
    "Pratham Rathod",
    "Aastha Singh",
  ],
  "Mana Shankara Vara Prasad Garu": [
    "Chiranjeevi",
    "Venkatesh",
    "Trisha Krishnan",
    "Kunal Kapoor",
    "Jagapathi Babu",
    "Rao Ramesh",
  ],
  "Bhartha Mahasayulaku Wignyapthi": [
    "Ravi Teja",
    "Ashika Ranganath",
    "Jisshu Sengupta",
    "Brahmaji",
    "Vennela Kishore",
    "Rao Ramesh",
  ],
  "Anaganaga Oka Raju": [
    "Naveen Polishetty",
    "Meenakshi Chaudhary",
    "Murali Sharma",
    "Naresh",
    "Rohini",
    "Vennela Kishore",
  ],
  "Nari Nari Naduma Murari": [
    "Sharwanand",
    "Samyuktha",
    "Vennela Kishore",
    "Rao Ramesh",
    "Rajendra Prasad",
    "Naresh",
  ],
  Cheekatilo: [
    "Sobhita Dhulipala",
    "Vishwadev Rachakonda",
    "Prakash Raj",
    "Nassar",
    "Jayasudha",
    "Rohini",
  ],
  Devagudi: [
    "Brahmanandam",
    "Adivi Sesh",
    "Shruti Haasan",
    "Rao Ramesh",
    "Murali Sharma",
    "Tanikella Bharani",
  ],
  "Hey Balwanth": [
    "Nikhil Siddhartha",
    "Brahmanandam",
    "Yukti Thareja",
    "Samuthirakani",
    "Sarathkumar",
    "Rahul Vijay",
  ],
  "Gaaya Padda Simham": [
    "Brahmanandam",
    "Adivi Sesh",
    "Sai Manjrekar",
    "Jagapathi Babu",
    "Revathi",
    "Prakash Raj",
  ],
  Raakaasaa: [
    "Brahmanandam",
    "Adivi Sesh",
    "Sobhita Dhulipala",
    "Prakash Raj",
    "Rao Ramesh",
    "Murali Sharma",
  ],
  "Couple Friendly": [
    "Brahmanandam",
    "Adivi Sesh",
    "Regina Cassandra",
    "Vennela Kishore",
    "Priyadarshi",
    "Abhinav Gomatam",
  ],
  Mrithyunjay: [
    "Brahmanandam",
    "Adivi Sesh",
    "Shruti Haasan",
    "Samuthirakani",
    "Nassar",
    "Mukesh Rishi",
  ],
  Euphoria: [
    "Bhumika Chawla",
    "Sara Arjun",
    "Nassar",
    "Rohith",
    "Vignesh Gavireddy",
    "Likhita Yalamanchali",
  ],
  "Ugly Story": ["Nandu", "Avika Gor", "Raviteja Mahadasyam", "Sivaji Raja", "Pragya"],
  Purushaha: [
    "Brahmanandam",
    "Adivi Sesh",
    "Jagapathi Babu",
    "Sarathkumar",
    "Sai Kumar",
    "Kota Srinivasa Rao",
  ],
  Parasakthi: [
    "Sivakarthikeyan",
    "Sreeleela",
    "Yogi Babu",
    "Fahadh Faasil",
    "Sunil",
    "Samuthirakani",
  ],
  "Vaa Vaathiyaar": ["Karthi", "Krithi Shetty", "Sathyaraj", "Rajkiran", "Karunas", "Anandaraj"],
  "Gandhi Talks": [
    "Vijay Sethupathi",
    "Arvind Swamy",
    "Aditi Rao Hydari",
    "Siddharth",
    "Nassar",
    "Prakash Raj",
  ],
  "Draupathi 2": [
    "Richard Rishi",
    "Sheela Rajkumar",
    "G. Marimuthu",
    "Radha Ravi",
    "Karunas",
    "Thambi Ramaiah",
  ],
  Anantha: ["Jagapathi Babu", "Suhasini", "Prakash Raj", "Gautami", "Nassar", "Brahmanandam"],
  Honey: ["Naveen Chandra", "Sunaina", "Attakathi Dinesh", "Bobby Simha", "Sarathkumar", "Sriman"],
  Lockdown: [
    "Anupama Parameswaran",
    "Charle",
    "Priya Prakash Varrier",
    "Niranj Maniyanpilla Raju",
    "Sabumon Abdusamad",
    "Arjun Ashokan",
  ],
  "Hot Spot 2 Much": [
    "Priya Bhavani Shankar",
    "Kalaiyarasan",
    "Sandy Master",
    "Ammu Abhirami",
    "Janani Iyer",
    "Aditya Bhaskar",
  ],
};

const extraReleasedSeeds = [
  seed(
    "I Love Boosters",
    ["Keke Palmer", "Demi Moore"],
    "Hollywood / Comedy",
    ["Comedy"],
    "English",
    "2026-05-22",
  ),
  seed("Remarkably Bright Creatures", [], "Hollywood / Drama", ["Drama"], "English", "2026-05-15"),
  seed(
    "Obsession",
    [],
    "Hollywood / Horror Thriller",
    ["Horror", "Thriller"],
    "English",
    "2026-05-16",
  ),
  seed(
    "The Sheep Detectives",
    [],
    "Hollywood / Comedy Mystery",
    ["Comedy", "Mystery"],
    "English",
    "2026-05-17",
  ),
  seed(
    "28 Years Later: The Bone Temple",
    ["Ralph Fiennes"],
    "Hollywood / Horror",
    ["Horror", "Thriller"],
    "English",
    "2026-01-16",
  ),
  seed(
    "The Rip",
    ["Matt Damon", "Ben Affleck"],
    "Hollywood / Action Drama",
    ["Action", "Drama"],
    "English",
    "2026-01-23",
  ),
  seed(
    "Dead Man's Wire",
    ["Bill Skarsgard", "Al Pacino"],
    "Hollywood / Crime Drama",
    ["Crime", "Drama"],
    "English",
    "2026-01-09",
  ),
  seed(
    "Magellan",
    ["Gael Garcia Bernal"],
    "Hollywood / Biography",
    ["Biography", "Drama"],
    "English",
    "2026-01-30",
  ),
  seed(
    "Ikkis",
    ["Agastya Nanda"],
    "Bollywood / Biographical War",
    ["Biography", "War", "Drama"],
    "Hindi",
    "2026-01-10",
  ),
  seed(
    "Vadh 2",
    ["Sanjay Mishra", "Neena Gupta"],
    "Bollywood / Thriller",
    ["Thriller", "Drama"],
    "Hindi",
    "2026-02-06",
  ),
  seed(
    "Assi",
    ["Taapsee Pannu", "Revathi"],
    "Bollywood / Social Drama",
    ["Drama"],
    "Hindi",
    "2026-02-20",
  ),
  seed(
    "Do Deewane Seher Mein",
    ["Siddhant Chaturvedi", "Mrunal Thakur"],
    "Bollywood / Romance",
    ["Romance", "Drama"],
    "Hindi",
    "2026-02-14",
  ),
  seed(
    "O Romeo",
    ["Shahid Kapoor", "Triptii Dimri"],
    "Bollywood / Romance",
    ["Romance", "Drama"],
    "Hindi",
    "2026-02-21",
  ),
  seed(
    "Subedaar",
    ["Ajay Devgn"],
    "Bollywood / Action Drama",
    ["Action", "Drama"],
    "Hindi",
    "2026-03-13",
  ),
  seed(
    "Raja Shivaji",
    [],
    "Bollywood / Biographical",
    ["Biography", "History", "Drama"],
    "Hindi",
    "2026-03-19",
  ),
  seed("Kennedy", [], "Bollywood / Action Thriller", ["Action", "Thriller"], "Hindi", "2026-04-10"),
  seed("Paro Pinaki Ki Kahani", [], "Bollywood / Drama", ["Drama"], "Hindi", "2026-04-17"),
  seed(
    "Happy Patel Khatarnak Jasoos",
    [],
    "Bollywood / Comedy",
    ["Comedy", "Mystery"],
    "Hindi",
    "2026-05-01",
  ),
  seed("Azad Bharath", [], "Bollywood / Historical", ["History", "Drama"], "Hindi", "2026-05-08"),
  seed("Bihu Attack", [], "Bollywood / Action", ["Action", "Thriller"], "Hindi", "2026-05-15"),
  seed("Ek Din", [], "Bollywood / Drama", ["Drama"], "Hindi", "2026-05-22"),
  seed("Chand Mera Dil", [], "Bollywood / Romance", ["Romance", "Drama"], "Hindi", "2026-05-29"),
  seed(
    "Mana Shankara Vara Prasad Garu",
    ["Chiranjeevi", "Nayanthara", "Venkatesh"],
    "Telugu / Drama",
    ["Drama", "Family"],
    "Telugu",
    "2026-01-12",
  ),
  seed(
    "Bhartha Mahasayulaku Wignyapthi",
    ["Ravi Teja", "Ashika Ranganath"],
    "Telugu / Drama",
    ["Drama", "Comedy"],
    "Telugu",
    "2026-01-13",
  ),
  seed(
    "Anaganaga Oka Raju",
    ["Naveen Polishetty", "Meenakshi Chaudhary"],
    "Telugu / Romance Comedy",
    ["Romance", "Comedy"],
    "Telugu",
    "2026-01-14",
  ),
  seed(
    "Nari Nari Naduma Murari",
    ["Sharwanand", "Samyuktha"],
    "Telugu / Drama",
    ["Drama", "Comedy"],
    "Telugu",
    "2026-01-17",
  ),
  seed(
    "Cheekatilo",
    ["Sobhita Dhulipala", "Vishwadev Rachakonda"],
    "Telugu / Thriller",
    ["Thriller", "Drama"],
    "Telugu",
    "2026-01-23",
  ),
  seed("Devagudi", [], "Telugu / Drama", ["Drama"], "Telugu", "2026-01-30"),
  seed(
    "Hey Balwanth",
    ["Nikhil Siddhartha"],
    "Telugu / Action",
    ["Action", "Drama"],
    "Telugu",
    "2026-02-13",
  ),
  seed(
    "Gaaya Padda Simham",
    [],
    "Telugu / Action Drama",
    ["Action", "Drama"],
    "Telugu",
    "2026-02-20",
  ),
  seed("Raakaasaa", [], "Telugu / Action Fantasy", ["Action", "Fantasy"], "Telugu", "2026-03-13"),
  seed(
    "Couple Friendly",
    [],
    "Telugu / Romance Comedy",
    ["Romance", "Comedy"],
    "Telugu",
    "2026-04-10",
  ),
  seed(
    "Mrithyunjay",
    [],
    "Telugu / Action Thriller",
    ["Action", "Thriller"],
    "Telugu",
    "2026-04-17",
  ),
  seed("Euphoria", [], "Telugu / Romance Drama", ["Romance", "Drama"], "Telugu", "2026-05-08"),
  seed("Ugly Story", [], "Telugu / Drama Thriller", ["Drama", "Thriller"], "Telugu", "2026-05-15"),
  seed("Purushaha", [], "Telugu / Action Drama", ["Action", "Drama"], "Telugu", "2026-05-22"),
  seed(
    "Parasakthi",
    ["Sivakarthikeyan", "Sreeleela"],
    "Tamil / Drama",
    ["Drama"],
    "Tamil",
    "2026-01-10",
  ),
  seed(
    "Vaa Vaathiyaar",
    ["Karthi", "Krithi Shetty"],
    "Tamil / Drama",
    ["Drama", "Comedy"],
    "Tamil",
    "2026-01-14",
  ),
  seed(
    "Gandhi Talks",
    ["Vijay Sethupathi", "Arvind Swamy"],
    "Tamil / Drama",
    ["Drama"],
    "Tamil",
    "2026-01-30",
  ),
  seed(
    "Draupathi 2",
    ["Richard Rishi"],
    "Tamil / Action",
    ["Action", "Drama"],
    "Tamil",
    "2026-01-23",
  ),
  seed(
    "Anantha",
    ["Jagapathi Babu", "Suhasini"],
    "Tamil / Drama",
    ["Drama"],
    "Tamil",
    "2026-01-13",
  ),
  seed(
    "Honey",
    ["Naveen Chandra"],
    "Tamil / Psychological Thriller",
    ["Thriller", "Drama"],
    "Tamil",
    "2026-02-06",
  ),
  seed(
    "Lockdown",
    ["Anupama Parameswaran"],
    "Tamil / Thriller",
    ["Thriller", "Drama"],
    "Tamil",
    "2026-03-06",
  ),
  seed(
    "Hot Spot 2 Much",
    ["Priya Bhavani Shankar"],
    "Tamil / Comedy",
    ["Comedy", "Drama"],
    "Tamil",
    "2026-04-03",
  ),
];

const extraComingSoonMovieSeeds = [
  seed(
    "Scary Movie 6",
    ["Regina Hall", "Anna Faris"],
    "Hollywood / Comedy Horror",
    ["Comedy", "Horror"],
    "English",
    "2026-06-12",
  ),
  seed(
    "Stop! That! Train!",
    ["Sarah Michelle Gellar"],
    "Hollywood / Action Comedy",
    ["Action", "Comedy"],
    "English",
    "2026-06-12",
  ),
  seed(
    "Disclosure Day",
    ["Emily Blunt", "Colin Firth"],
    "Hollywood / Sci-Fi",
    ["Sci-Fi", "Drama"],
    "English",
    "2026-06-12",
  ),
  seed(
    "Jackass: Best and Last",
    ["Johnny Knoxville"],
    "Hollywood / Comedy",
    ["Comedy"],
    "English",
    "2026-06-26",
  ),
  seed(
    "The Death of Robin Hood",
    [],
    "Hollywood / Drama",
    ["Drama", "Adventure"],
    "English",
    "2026-06-20",
  ),
  seed("The Furious", [], "Hollywood / Action", ["Action", "Thriller"], "English", "2026-06-20"),
  seed("Lucky Strike", [], "Hollywood / Thriller", ["Thriller"], "English", "2026-06-27"),
  seed("Girls Like Girls", [], "Hollywood / Drama", ["Drama"], "English", "2026-06-19"),
  seed(
    "The Odyssey",
    ["Matt Damon", "Tom Holland", "Zendaya"],
    "Hollywood / Nolan Epic",
    ["Epic", "Adventure", "Drama"],
    "English",
    "2026-07-17",
  ),
  seed(
    "Enola Holmes 3",
    ["Millie Bobby Brown", "Henry Cavill"],
    "Hollywood / Mystery Adventure",
    ["Mystery", "Adventure"],
    "English",
    "2026-07-01",
  ),
  seed(
    "Young Washington",
    ["Ben Kingsley"],
    "Hollywood / Biography History",
    ["Biography", "History", "Drama"],
    "English",
    "2026-07-03",
  ),
  seed("Evil Dead Burn", [], "Hollywood / Horror", ["Horror", "Thriller"], "English", "2026-07-24"),
  seed("Reading Lolita in Tehran", [], "Hollywood / Drama", ["Drama"], "English", "2026-07-10"),
  seed(
    "The Magic Faraway Tree",
    [],
    "Hollywood / Family",
    ["Family", "Adventure", "Fantasy"],
    "English",
    "2026-08-07",
  ),
  seed(
    "Coyote vs. ACME",
    [],
    "Hollywood / Animation",
    ["Animation", "Comedy"],
    "English",
    "2026-08-21",
  ),
  seed("Mutiny", [], "Hollywood / Action", ["Action", "Thriller"], "English", "2026-08-14"),
  seed(
    "The Dog Stars",
    [],
    "Hollywood / Sci-Fi Drama",
    ["Sci-Fi", "Drama"],
    "English",
    "2026-08-28",
  ),
  seed(
    "Tom and Jerry: Forbidden Compass",
    [],
    "Hollywood / Animation",
    ["Animation", "Adventure", "Comedy"],
    "English",
    "2026-09-04",
  ),
  seed(
    "Practical Magic 2",
    ["Sandra Bullock", "Nicole Kidman"],
    "Hollywood / Fantasy Drama",
    ["Fantasy", "Drama"],
    "English",
    "2026-09-18",
  ),
  seed("Runner", [], "Hollywood / Thriller", ["Thriller"], "English", "2026-09-11"),
  seed(
    "Resident Evil (New)",
    [],
    "Hollywood / Action Horror",
    ["Action", "Horror"],
    "English",
    "2026-09-25",
  ),
  seed("Verity", [], "Hollywood / Thriller", ["Thriller", "Drama"], "English", "2026-10-02"),
  seed("Clayface", [], "DC / Action", ["Superhero", "Action"], "English", "2026-10-09"),
  seed("Wildwood", [], "Hollywood / Adventure", ["Adventure", "Fantasy"], "English", "2026-10-16"),
  seed(
    "The Cat in the Hat",
    [],
    "Hollywood / Animation",
    ["Animation", "Family", "Comedy"],
    "English",
    "2026-11-06",
  ),
  seed("Jimmy", [], "Hollywood / Drama", ["Drama"], "English", "2026-11-13"),
  seed(
    "The Angry Birds Movie 3",
    [],
    "Hollywood / Animation",
    ["Animation", "Comedy"],
    "English",
    "2026-12-11",
  ),
  seed(
    "Jumanji: Open World",
    [],
    "Hollywood / Adventure",
    ["Adventure", "Comedy"],
    "English",
    "2026-12-18",
  ),
  seed(
    "Maa Behen",
    ["Madhuri Dixit", "Triptii Dimri", "Dharna Durgaa", "Ravi Kishan"],
    "Bollywood / Crime Comedy",
    ["Comedy", "Crime"],
    "Hindi",
    "2026-06-04",
  ),
  seed(
    "Bandar",
    ["Bobby Deol", "Sanya Malhotra", "Sapna Pabbi", "Saba Azad"],
    "Bollywood / Crime Drama",
    ["Crime", "Drama"],
    "Hindi",
    "2026-06-05",
  ),
  seed(
    "Hai Jawani Toh Ishq Hona Hai",
    ["Varun Dhawan", "Mrunal Thakur", "Pooja Hegde"],
    "Bollywood / Romantic Comedy",
    ["Romance", "Comedy"],
    "Hindi",
    "2026-06-05",
  ),
  seed(
    "Main Vaapas Aaunga",
    ["Diljit Dosanjh", "Sharvari Wagh", "Naseeruddin Shah", "Vedang Raina"],
    "Bollywood / Romance Drama",
    ["Romance", "Drama"],
    "Hindi",
    "2026-06-12",
  ),
  seed(
    "Governor: The Silent Saviour",
    ["Manoj Bajpayee", "Adah Sharma"],
    "Bollywood / Thriller",
    ["Thriller", "Drama"],
    "Hindi",
    "2026-06-12",
  ),
  seed(
    "Cocktail 2",
    ["Shahid Kapoor", "Rashmika Mandanna", "Kriti Sanon"],
    "Bollywood / Romantic Comedy",
    ["Romance", "Comedy", "Drama"],
    "Hindi",
    "2026-06-19",
  ),
  seed(
    "Naagzilla",
    [],
    "Bollywood / Action Horror Fantasy",
    ["Action", "Horror", "Fantasy"],
    "Hindi",
    "2026-08-14",
  ),
  seed(
    "Peddi",
    ["Ram Charan", "Janhvi Kapoor"],
    "Telugu / Sports Action",
    ["Action", "Romance", "Sports"],
    "Telugu",
    "2026-06-04",
  ),
  seed(
    "Rao Bahadur",
    ["Satya Dev", "Vikas Muppala"],
    "Telugu / Comedy Fantasy",
    ["Comedy", "Fantasy"],
    "Telugu",
    "2026-06-05",
  ),
  seed(
    "Vrushakarma",
    ["Naga Chaitanya", "Meenakshi Chaudhary"],
    "Telugu / Adventure Thriller",
    ["Action", "Adventure", "Thriller"],
    "Telugu",
    "2026-06-12",
  ),
  seed(
    "Don't Trouble The Trouble",
    ["Fahadh Faasil"],
    "Telugu / Fantasy Drama",
    ["Drama", "Fantasy"],
    "Telugu",
    "2026-06-12",
  ),
  seed(
    "VISA - Vintara Saradaga",
    ["Ashok Galla", "Sri Gouri Priya Reddy"],
    "Telugu / Romantic Comedy",
    ["Comedy", "Romance"],
    "Telugu",
    "2026-06-12",
  ),
  seed(
    "The Paradise",
    ["Nani"],
    "Telugu / Fantasy Drama",
    ["Fantasy", "Drama"],
    "Telugu",
    "2026-10-02",
  ),
  seed(
    "Swayambhu",
    ["Nikhil Siddhartha"],
    "Telugu / Mythological",
    ["Mythological", "Action", "Drama"],
    "Telugu",
    "2026-09-11",
  ),
].filter(hasPublicMovieTitle);

const extraReleasedMovies = uniqueByTitle(extraReleasedSeeds).map(buildReleasedMovie);

function seed(title, cast, industry, genres, language, releaseAt) {
  return {
    title,
    cast: releasedCastOverrides[title] ?? cast,
    industry,
    genres,
    language,
    releaseAt,
    releaseDate: formatReleaseDate(releaseAt),
  };
}

function buildReleasedMovie(item, index) {
  const id = slugify(item.title);
  const media = getRealMovieMedia(id);
  const cast = expandCast(item).map((name, castIndex) => ({
    name,
    role: castIndex === 0 ? "Lead" : "Cast",
    avatar: getRealCastAvatar(id, name) || getRequestedCastAvatar(name) || castAvatarFallback(name),
  }));

  return {
    id,
    title: item.title,
    poster: media?.poster || movieImageFallback(item.title, "poster"),
    backdrop: media?.backdrop || media?.poster || movieImageFallback(item.title, "backdrop"),
    genres: item.genres,
    language: item.language,
    languages: [item.language],
    duration: runtimeFor(item, index),
    rating: Number((7.7 + (index % 16) * 0.11).toFixed(1)),
    votes: `${24 + ((index * 13) % 320)}K`,
    releaseAt: item.releaseAt,
    releaseDate: item.releaseDate,
    listingType: "live",
    releaseStatus: "released",
    description: `${item.title} is part of the 2026 movix released lineup, listed as a ${item.industry} release with ${item.genres.slice(0, 2).join(" and ").toLowerCase()} appeal.`,
    cast,
    format: formatsFor(item),
    formats: formatsFor(item),
    certificate: certificateFor(item),
    sortOrder: 2000 + index,
  };
}

function expandCast(item) {
  const names = uniqueNames(item.cast);
  return names.slice(0, TARGET_CAST_COUNT);
}

function uniqueByTitle(list) {
  const seen = new Set();
  return list.filter((item) => {
    const key = normalizeKey(item.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueNames(list) {
  const seen = new Set();
  return list.filter((name) => {
    const key = normalizeKey(name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatsFor(item) {
  const genreText = item.genres.join(" ").toLowerCase();
  if (genreText.includes("animation")) return ["2D", "3D", "IMAX"];
  if (
    genreText.includes("superhero") ||
    genreText.includes("sci-fi") ||
    genreText.includes("action")
  ) {
    return ["2D", "IMAX", "4DX"];
  }
  return ["2D", "IMAX"];
}

function certificateFor(item) {
  const genreText = item.genres.join(" ").toLowerCase();
  if (genreText.includes("horror") || genreText.includes("thriller")) return "A";
  if (genreText.includes("war") || genreText.includes("crime")) return "UA";
  return "UA";
}

function runtimeFor(item, index) {
  if (item.genres.includes("Animation")) return "1h 48m";
  if (item.genres.includes("Action") || item.genres.includes("Sci-Fi")) {
    return `${2 + (index % 2)}h ${String(16 + (index % 30)).padStart(2, "0")}m`;
  }
  if (item.genres.includes("Drama")) return `2h ${String(4 + (index % 34)).padStart(2, "0")}m`;
  return `2h ${String(1 + (index % 39)).padStart(2, "0")}m`;
}

function formatReleaseDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function slugify(value) {
  return normalizeKey(value)
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function hasPublicMovieTitle(item) {
  return !/\bfilm$/i.test(String(item?.title ?? "").trim());
}

export { extraComingSoonMovieSeeds, extraReleasedMovies };
