const REVIEW_TAGS = [
  ["#GreatActing", 2881],
  ["#Wellmade", 2313],
  ["#SuperDirection", 2107],
  ["#AwesomeStory", 1841],
  ["#Rocking", 1546],
  ["#Blockbuster", 1540],
  ["#WowMusic", 1168],
  ["#Unbelievable", 759],
  ["#Inspiring", 680],
  ["#OneTimeWatch", 504],
];

const REVIEW_TEMPLATES = [
  {
    name: "Hanzala",
    rating: 10,
    tags: [
      "#SuperDirection",
      "#GreatActing",
      "#WowMusic",
      "#AwesomeStory",
      "#Blockbuster",
      "#Rocking",
      "#Unbelievable",
    ],
    text: "Ayushman, wamiqa, rakul and Sara chemistry ek sth maza hi aagya dekh kr. Romance bhi acha h sbke sth. Movie to badiya h hi aur comedy too.",
    helpfulCount: 795,
  },
  {
    name: "Manish",
    rating: 10,
    tags: [],
    text: "The film never takes itself seriously for a single moment and that consistency of tone is what makes it work from start to finish.",
    helpfulCount: 343,
  },
  {
    name: "Pranav",
    rating: 10,
    tags: [],
    text: "Ketan Sodha's background score keeps the comic energy moving even in scenes that could have gone flat. Good comedy scoring is invisible when it works.",
    helpfulCount: 199,
  },
  {
    name: "Priyesh",
    rating: 8,
    tags: ["#GreatActing", "#WowMusic", "#AwesomeStory", "#Rocking", "#Wellmade"],
    text: "A attention grabbing movie throughout. Superb acting by Ayushmann and Sara as well as other actresses.",
    helpfulCount: 193,
  },
  {
    name: "Harish",
    rating: 10,
    tags: [],
    text: "Sara Ali Khan is looser and funnier here than I've seen her before. She seems genuinely comfortable in the chaos and it shows.",
    helpfulCount: 188,
  },
];

function buildSeedReviews(movieIds = []) {
  return movieIds.flatMap((movieId) =>
    REVIEW_TEMPLATES.map((template) => {
      const userKey = slugify(template.name);
      return {
        movieId,
        userId: `seed-${movieId}-${userKey}`,
        userEmail: `${userKey}@demo.movix.local`,
        userName: template.name,
        rating: template.rating,
        tags: template.tags,
        text: template.text,
        helpfulCount: template.helpfulCount,
        verifiedBooking: true,
        status: "published",
        source: "seed",
      };
    }),
  );
}

function slugify(value) {
  return String(value || "reviewer")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export { REVIEW_TAGS, REVIEW_TEMPLATES, buildSeedReviews };
