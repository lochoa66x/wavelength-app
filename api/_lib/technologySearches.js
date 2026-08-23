const CORE_TECHNOLOGY_SEARCHES = [
  { category: "tech", label: "SAP enterprise applications", keywords: "SAP S/4HANA FICO ABAP consultant" },
  { category: "tech", label: "software languages", keywords: "Java Python C++ C# .NET developer" },
];

const ROTATING_TECHNOLOGY_SEARCHES = [
  { category: "tech", label: "modern web development", keywords: "React Node.js JavaScript TypeScript full stack" },
  { category: "tech", label: "data engineering", keywords: "Python SQL data engineer machine learning" },
  { category: "tech", label: "cloud and security", keywords: "cloud DevOps cybersecurity infrastructure" },
  { category: "business", label: "SaaS business roles", keywords: "SaaS product sales customer success" },
];

function utcDayNumber(now) {
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86_400_000);
}

export function selectDailyTechnologySearches(now = new Date()) {
  const offset = utcDayNumber(now) % ROTATING_TECHNOLOGY_SEARCHES.length;
  const rotating = [
    ROTATING_TECHNOLOGY_SEARCHES[offset],
    ROTATING_TECHNOLOGY_SEARCHES[(offset + 1) % ROTATING_TECHNOLOGY_SEARCHES.length],
  ];

  return [...CORE_TECHNOLOGY_SEARCHES, ...rotating].map((search) => ({ ...search }));
}
