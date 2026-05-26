const images = {
  stadium:
    "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1400&q=80",
  football:
    "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1400&q=80",
  tennis:
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1400&q=80",
};

const sectionCatalog = {
  sports: {
    eyebrow: "Matches and fan parks",
    title: "Sports tickets and live screenings",
    subtitle: "Football, cricket, tennis and kabaddi experiences with clear pricing.",
    heroImage: images.stadium,
    searchPlaceholder: "Search teams or sport",
    filters: ["All", "Cricket", "Football", "Kabaddi", "Tennis"],
    stats: [
      { value: "6", label: "Sports listings" },
      { value: "Live", label: "Inventory" },
      { value: "QR", label: "Entry ready" },
    ],
    items: [
      item({
        title: "India vs Australia Fan Park",
        category: "Cricket",
        venue: "M. Chinnaswamy Stadium Fan Zone",
        city: "Bengaluru",
        date: "Sun, 14 Jun",
        time: "5:00 PM",
        price: 599,
        rating: 4.8,
        image: images.stadium,
        badge: "Big screen",
        description:
          "Cricket screening listing with food counters, large LED screens and family zones.",
      }),
      item({
        title: "Mumbai Cricket Club Screening",
        category: "Cricket",
        venue: "Wankhede Stadium Fan Deck",
        city: "Mumbai",
        date: "Sat, 20 Jun",
        time: "6:30 PM",
        price: 699,
        rating: 4.6,
        image: images.stadium,
        badge: "Fan deck",
        description: "Premium cricket watch-party listing with tiered seating and mobile entry.",
      }),
      item({
        title: "Bengaluru FC Home Stand",
        category: "Football",
        venue: "Sree Kanteerava Stadium",
        city: "Bengaluru",
        date: "Wed, 24 Jun",
        time: "7:30 PM",
        price: 799,
        rating: 4.7,
        image: images.football,
        badge: "Home stand",
        description:
          "Football matchday listing with east stand, west stand and family block pricing.",
      }),
      item({
        title: "ISL Final Fan Screening",
        category: "Football",
        venue: "Jawaharlal Nehru Stadium",
        city: "Delhi",
        date: "Sun, 28 Jun",
        time: "7:00 PM",
        price: 499,
        rating: 4.5,
        image: images.football,
        badge: "Final night",
        description:
          "Football fan-screening listing with club zones, food courts and digital tickets.",
      }),
      item({
        title: "Pro Kabaddi League Night",
        category: "Kabaddi",
        venue: "Sree Kanteerava Indoor Stadium",
        city: "Bengaluru",
        date: "Fri, 03 Jul",
        time: "8:00 PM",
        price: 499,
        rating: 4.5,
        image: images.stadium,
        badge: "Family",
        description:
          "Indoor kabaddi night listing with team blocks, family seating and QR ticketing.",
      }),
      item({
        title: "KSLTA Tennis Open",
        category: "Tennis",
        venue: "KSLTA Tennis Stadium",
        city: "Bengaluru",
        date: "Sat, 04 Jul",
        time: "4:00 PM",
        price: 699,
        rating: 4.4,
        image: images.tennis,
        badge: "Finals",
        description:
          "Tennis court-side listing with day-pass access, reserved seating and mobile tickets.",
      }),
    ],
  },
};

function item(input) {
  return {
    id: input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    description:
      input.description ??
      `${input.title} at ${input.venue}. Verified listing with digital entry support.`,
    ...input,
  };
}

export { sectionCatalog };
