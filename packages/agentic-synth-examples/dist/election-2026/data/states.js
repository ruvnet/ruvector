// src/election-2026/data/states.ts
var US_STATES = [
  // Class 2 Senate seats (up for election in 2026)
  { name: "Alabama", abbreviation: "AL", electoralVotes: 9, population: 5024279, region: "South", senateRace: false, governorRace: true },
  { name: "Alaska", abbreviation: "AK", electoralVotes: 3, population: 733391, region: "West", senateRace: true, governorRace: true },
  { name: "Arizona", abbreviation: "AZ", electoralVotes: 11, population: 7151502, region: "West", senateRace: false, governorRace: true },
  { name: "Arkansas", abbreviation: "AR", electoralVotes: 6, population: 3011524, region: "South", senateRace: true, governorRace: true },
  { name: "California", abbreviation: "CA", electoralVotes: 54, population: 39538223, region: "West", senateRace: false, governorRace: true },
  { name: "Colorado", abbreviation: "CO", electoralVotes: 10, population: 5773714, region: "West", senateRace: true, governorRace: true },
  { name: "Connecticut", abbreviation: "CT", electoralVotes: 7, population: 3605944, region: "Northeast", senateRace: false, governorRace: true },
  { name: "Delaware", abbreviation: "DE", electoralVotes: 3, population: 989948, region: "Northeast", senateRace: true, governorRace: false },
  { name: "Florida", abbreviation: "FL", electoralVotes: 30, population: 21538187, region: "South", senateRace: false, governorRace: true },
  { name: "Georgia", abbreviation: "GA", electoralVotes: 16, population: 10711908, region: "South", senateRace: true, governorRace: true },
  { name: "Hawaii", abbreviation: "HI", electoralVotes: 4, population: 1455271, region: "West", senateRace: false, governorRace: true },
  { name: "Idaho", abbreviation: "ID", electoralVotes: 4, population: 1839106, region: "West", senateRace: true, governorRace: true },
  { name: "Illinois", abbreviation: "IL", electoralVotes: 19, population: 12812508, region: "Midwest", senateRace: true, governorRace: true },
  { name: "Indiana", abbreviation: "IN", electoralVotes: 11, population: 6785528, region: "Midwest", senateRace: false, governorRace: false },
  { name: "Iowa", abbreviation: "IA", electoralVotes: 6, population: 3190369, region: "Midwest", senateRace: true, governorRace: true },
  { name: "Kansas", abbreviation: "KS", electoralVotes: 6, population: 2937880, region: "Midwest", senateRace: true, governorRace: true },
  { name: "Kentucky", abbreviation: "KY", electoralVotes: 8, population: 4505836, region: "South", senateRace: true, governorRace: false },
  { name: "Louisiana", abbreviation: "LA", electoralVotes: 8, population: 4657757, region: "South", senateRace: true, governorRace: false },
  { name: "Maine", abbreviation: "ME", electoralVotes: 4, population: 1362359, region: "Northeast", senateRace: true, governorRace: true },
  { name: "Maryland", abbreviation: "MD", electoralVotes: 10, population: 6177224, region: "Northeast", senateRace: false, governorRace: true },
  { name: "Massachusetts", abbreviation: "MA", electoralVotes: 11, population: 7029917, region: "Northeast", senateRace: true, governorRace: true },
  { name: "Michigan", abbreviation: "MI", electoralVotes: 15, population: 10077331, region: "Midwest", senateRace: true, governorRace: true },
  { name: "Minnesota", abbreviation: "MN", electoralVotes: 10, population: 5706494, region: "Midwest", senateRace: true, governorRace: true },
  { name: "Mississippi", abbreviation: "MS", electoralVotes: 6, population: 2961279, region: "South", senateRace: true, governorRace: false },
  { name: "Missouri", abbreviation: "MO", electoralVotes: 10, population: 6154913, region: "Midwest", senateRace: false, governorRace: false },
  { name: "Montana", abbreviation: "MT", electoralVotes: 4, population: 1084225, region: "West", senateRace: true, governorRace: true },
  { name: "Nebraska", abbreviation: "NE", electoralVotes: 5, population: 1961504, region: "Midwest", senateRace: true, governorRace: true },
  { name: "Nevada", abbreviation: "NV", electoralVotes: 6, population: 3104614, region: "West", senateRace: false, governorRace: true },
  { name: "New Hampshire", abbreviation: "NH", electoralVotes: 4, population: 1377529, region: "Northeast", senateRace: true, governorRace: true },
  { name: "New Jersey", abbreviation: "NJ", electoralVotes: 14, population: 9288994, region: "Northeast", senateRace: true, governorRace: false },
  { name: "New Mexico", abbreviation: "NM", electoralVotes: 5, population: 2117522, region: "West", senateRace: true, governorRace: true },
  { name: "New York", abbreviation: "NY", electoralVotes: 28, population: 20201249, region: "Northeast", senateRace: false, governorRace: true },
  { name: "North Carolina", abbreviation: "NC", electoralVotes: 16, population: 10439388, region: "South", senateRace: true, governorRace: true },
  { name: "North Dakota", abbreviation: "ND", electoralVotes: 3, population: 779094, region: "Midwest", senateRace: false, governorRace: true },
  { name: "Ohio", abbreviation: "OH", electoralVotes: 17, population: 11799448, region: "Midwest", senateRace: true, governorRace: true },
  { name: "Oklahoma", abbreviation: "OK", electoralVotes: 7, population: 3959353, region: "South", senateRace: true, governorRace: true },
  { name: "Oregon", abbreviation: "OR", electoralVotes: 8, population: 4237256, region: "West", senateRace: true, governorRace: true },
  { name: "Pennsylvania", abbreviation: "PA", electoralVotes: 19, population: 13002700, region: "Northeast", senateRace: false, governorRace: true },
  { name: "Rhode Island", abbreviation: "RI", electoralVotes: 4, population: 1097379, region: "Northeast", senateRace: true, governorRace: true },
  { name: "South Carolina", abbreviation: "SC", electoralVotes: 9, population: 5118425, region: "South", senateRace: true, governorRace: true },
  { name: "South Dakota", abbreviation: "SD", electoralVotes: 3, population: 886667, region: "Midwest", senateRace: true, governorRace: true },
  { name: "Tennessee", abbreviation: "TN", electoralVotes: 11, population: 6910840, region: "South", senateRace: true, governorRace: true },
  { name: "Texas", abbreviation: "TX", electoralVotes: 40, population: 29145505, region: "South", senateRace: true, governorRace: true },
  { name: "Utah", abbreviation: "UT", electoralVotes: 6, population: 3271616, region: "West", senateRace: false, governorRace: true },
  { name: "Vermont", abbreviation: "VT", electoralVotes: 3, population: 643077, region: "Northeast", senateRace: false, governorRace: true },
  { name: "Virginia", abbreviation: "VA", electoralVotes: 13, population: 8631393, region: "South", senateRace: true, governorRace: false },
  { name: "Washington", abbreviation: "WA", electoralVotes: 12, population: 7705281, region: "West", senateRace: false, governorRace: true },
  { name: "West Virginia", abbreviation: "WV", electoralVotes: 4, population: 1793716, region: "South", senateRace: true, governorRace: false },
  { name: "Wisconsin", abbreviation: "WI", electoralVotes: 10, population: 5893718, region: "Midwest", senateRace: false, governorRace: true },
  { name: "Wyoming", abbreviation: "WY", electoralVotes: 3, population: 576851, region: "West", senateRace: true, governorRace: true }
];
function getSenateRaceStates() {
  return US_STATES.filter((state) => state.senateRace);
}
function getGovernorRaceStates() {
  return US_STATES.filter((state) => state.governorRace);
}
function getCompetitiveStates() {
  const competitiveAbbrs = [
    "AZ",
    "GA",
    "MI",
    "NC",
    "NH",
    "NV",
    "OH",
    "PA",
    "WI",
    "MT",
    "ME",
    "TX"
  ];
  return US_STATES.filter((state) => competitiveAbbrs.includes(state.abbreviation));
}
function getStateByAbbr(abbr) {
  return US_STATES.find((state) => state.abbreviation === abbr);
}
function getStatesByRegion(region) {
  return US_STATES.filter((state) => state.region === region);
}
export {
  US_STATES,
  getCompetitiveStates,
  getGovernorRaceStates,
  getSenateRaceStates,
  getStateByAbbr,
  getStatesByRegion
};
//# sourceMappingURL=states.js.map