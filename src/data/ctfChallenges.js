export const ctfChallenges = [
  {
    id: 1,
    title: "Hidden in Plain Sight",
    description:
      "A suspicious packet capture contains a secret message. Analyze the PCAP file and extract the hidden flag.",
    shortDescription: "Analyze PCAP file",
    category: "Network Analysis",
    difficulty: "Easy",
    points: 100,
    solved: true,
    solves: 4,
    flag: "pcap_master_2024",
    hint: "Follow the HTTP traffic and inspect any unusual request parameters.",
    files: [
      { name: "challenge_brief.pdf", size: "248 KB" },
      { name: "capture.pcap", size: "1.2 MB" },
      { name: "notes.txt", size: "612 B" },
    ],
  },
  {
    id: 2,
    title: "Firewall Bypass",
    description:
      "Find a way to bypass the misconfigured firewall rules and access the restricted endpoint.",
    shortDescription: "Bypass firewall rules",
    category: "Network Security",
    difficulty: "Medium",
    points: 250,
    solved: false,
    solves: 1,
    flag: "firewall_bypass_2024",
    hint: "Look for trusted headers and paths that the firewall treats differently.",
    files: [
      { name: "firewall-rules.txt", size: "9 KB" },
      { name: "target-notes.md", size: "2 KB" },
    ],
  },
];

export const getCTFChallengeById = (ctfId) =>
  ctfChallenges.find((challenge) => String(challenge.id) === String(ctfId));

export const formatCTFFlag = (flag = "") =>
  flag.trim().startsWith("flag{") ? flag.trim() : `flag{${flag.trim()}}`;
