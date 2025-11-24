// src/index.ts
export * from "psycho-symbolic-integration";
var examples = [
  {
    name: "audience",
    title: "Audience Analysis",
    description: "Real-time sentiment extraction, psychographic segmentation, persona generation",
    features: [
      "Sentiment analysis (0.4ms per review)",
      "Psychographic segmentation",
      "Engagement prediction",
      "Synthetic persona generation",
      "Content optimization recommendations"
    ],
    useCases: [
      "Content creators",
      "Event organizers",
      "Product teams",
      "Marketing teams"
    ]
  },
  {
    name: "voter",
    title: "Voter Sentiment",
    description: "Political preference mapping, swing voter identification, issue analysis",
    features: [
      "Political sentiment extraction",
      "Issue preference mapping",
      "Swing voter identification",
      "Synthetic voter personas",
      "Campaign message optimization"
    ],
    useCases: [
      "Political campaigns",
      "Poll analysis",
      "Issue advocacy",
      "Grassroots organizing"
    ]
  },
  {
    name: "marketing",
    title: "Marketing Optimization",
    description: "Campaign targeting, A/B testing, ROI prediction, customer segmentation",
    features: [
      "A/B test ad copy sentiment",
      "Customer preference extraction",
      "Psychographic segmentation",
      "Synthetic customer personas",
      "ROI prediction & budget allocation"
    ],
    useCases: [
      "Digital marketing",
      "Ad copy optimization",
      "Customer segmentation",
      "Budget allocation"
    ]
  },
  {
    name: "financial",
    title: "Financial Sentiment",
    description: "Market analysis, investor psychology, Fear & Greed Index, risk assessment",
    features: [
      "Market news sentiment",
      "Investor risk profiling",
      "Fear & Greed Index",
      "Synthetic investor personas",
      "Portfolio psychology"
    ],
    useCases: [
      "Trading psychology",
      "Investment strategy",
      "Risk assessment",
      "Market sentiment tracking"
    ]
  },
  {
    name: "medical",
    title: "Medical Patient Analysis",
    description: "Patient emotional states, compliance prediction, psychosocial assessment",
    features: [
      "Patient sentiment analysis",
      "Psychosocial risk assessment",
      "Compliance prediction",
      "Synthetic patient personas",
      "Intervention recommendations"
    ],
    useCases: [
      "Patient care optimization",
      "Compliance improvement",
      "Psychosocial support",
      "Clinical research"
    ],
    warning: "For educational/research purposes only - NOT for clinical decisions"
  },
  {
    name: "psychological",
    title: "Psychological Profiling",
    description: "Personality archetypes, cognitive biases, attachment styles, decision patterns",
    features: [
      "Personality archetype detection",
      "Cognitive bias identification",
      "Decision-making patterns",
      "Attachment style profiling",
      "Shadow aspects & blind spots"
    ],
    useCases: [
      "Team dynamics",
      "Leadership development",
      "Conflict resolution",
      "Personal coaching"
    ]
  }
];
function getExample(name) {
  return examples.find((e) => e.name === name);
}
function listExamples() {
  return examples.map((e) => ({
    name: e.name,
    title: e.title,
    description: e.description
  }));
}
export {
  examples,
  getExample,
  listExamples
};
