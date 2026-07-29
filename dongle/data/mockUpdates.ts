import { ProjectUpdate, UPDATE_TYPES } from "@/types/update";

/**
 * Sample project updates for demonstration
 */
export const mockUpdates: ProjectUpdate[] = [
  // Soroban Swap updates (proj-0)
  {
    id: "update-1",
    projectId: "proj-0",
    type: UPDATE_TYPES.RELEASE,
    title: "Version 2.0 - Major Protocol Upgrade",
    content: "We're excited to announce Soroban Swap v2.0! This release includes:\n\n• Gas optimization - 40% reduction in transaction costs\n• New token pairs supported\n• Improved UI/UX with real-time price updates\n• Enhanced security features\n\nRead the full changelog in our documentation.",
    version: "v2.0.0",
    publishedAt: new Date("2024-03-15T10:00:00Z").toISOString(),
    authorAddress: "GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678900000ABCDEFGHIJKLMNOPQR",
  },
  {
    id: "update-2",
    projectId: "proj-0",
    type: UPDATE_TYPES.AUDIT,
    title: "Security Audit Completed by CertiK",
    content: "We're pleased to share that our smart contracts have been audited by CertiK, one of the leading blockchain security firms.\n\nKey findings:\n• No critical vulnerabilities found\n• 2 medium severity issues resolved\n• All recommendations implemented\n\nFull audit report available on our website.",
    publishedAt: new Date("2024-03-01T14:30:00Z").toISOString(),
    authorAddress: "GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678900000ABCDEFGHIJKLMNOPQR",
  },
  {
    id: "update-3",
    projectId: "proj-0",
    type: UPDATE_TYPES.MILESTONE,
    title: "$100M in Total Value Locked",
    content: "We've reached a major milestone - $100M in Total Value Locked! 🎉\n\nThank you to our amazing community for the continued support and trust. This is just the beginning of our journey to make DeFi more accessible on Stellar.\n\nWhat's next:\n• Cross-chain bridge integration\n• Governance token launch\n• Mobile app beta",
    publishedAt: new Date("2024-02-20T09:15:00Z").toISOString(),
    authorAddress: "GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678900000ABCDEFGHIJKLMNOPQR",
  },
  {
    id: "update-4",
    projectId: "proj-0",
    type: UPDATE_TYPES.ANNOUNCEMENT,
    title: "Partnership with Stellar Development Foundation",
    content: "We're thrilled to announce our strategic partnership with the Stellar Development Foundation!\n\nThis collaboration will help us:\n• Expand liquidity pools\n• Integrate with more Stellar ecosystem projects\n• Participate in the Soroban Builders Challenge\n\nMore details coming soon!",
    publishedAt: new Date("2024-02-10T16:45:00Z").toISOString(),
    authorAddress: "GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678900000ABCDEFGHIJKLMNOPQR",
  },

  // Stellar Guardians updates (proj-1)
  {
    id: "update-5",
    projectId: "proj-1",
    type: UPDATE_TYPES.RELEASE,
    title: "Season 2 Launch - New Heroes & Battle Modes",
    content: "Season 2 is here! Jump into the action with:\n\n• 5 new hero characters with unique abilities\n• Team battle mode (3v3)\n• Daily quests and rewards\n• New cosmetic items in the shop\n\nDownload the update now and start playing!",
    version: "v2.1.0",
    publishedAt: new Date("2024-03-10T12:00:00Z").toISOString(),
    authorAddress: "GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678900001ABCDEFGHIJKLMNOPQR",
  },
  {
    id: "update-6",
    projectId: "proj-1",
    type: UPDATE_TYPES.MILESTONE,
    title: "50,000 Active Players!",
    content: "We've hit 50,000 active players! Thank you to everyone who's joined our community.\n\nTo celebrate, we're hosting a special tournament this weekend with $10,000 in prizes. Register now in the game client.",
    publishedAt: new Date("2024-02-28T18:30:00Z").toISOString(),
    authorAddress: "GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678900001ABCDEFGHIJKLMNOPQR",
  },

  // Anchor Connect updates (proj-2)
  {
    id: "update-7",
    projectId: "proj-2",
    type: UPDATE_TYPES.RELEASE,
    title: "SDK v3.0 - TypeScript Support & New Features",
    content: "Anchor Connect SDK v3.0 is now available!\n\nNew features:\n• Full TypeScript support with type definitions\n• React hooks for easy integration\n• Improved error handling\n• WebSocket support for real-time updates\n• 99.9% uptime SLA\n\nMigration guide available in our docs.",
    version: "v3.0.0",
    publishedAt: new Date("2024-03-12T08:00:00Z").toISOString(),
    authorAddress: "GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678900002ABCDEFGHIJKLMNOPQR",
  },
  {
    id: "update-8",
    projectId: "proj-2",
    type: UPDATE_TYPES.ANNOUNCEMENT,
    title: "New Anchor Partnerships in APAC Region",
    content: "We're expanding to the Asia-Pacific region! We've partnered with 3 new regulated anchors in Singapore, South Korea, and Australia.\n\nThis means faster on/off ramps and lower fees for users in these markets.",
    publishedAt: new Date("2024-02-25T11:20:00Z").toISOString(),
    authorAddress: "GABCDEFGHIJKLMNOPQRSTUVWXYZ12345678900002ABCDEFGHIJKLMNOPQR",
  },
];

/**
 * Get updates for a specific project (for initial data)
 */
export function getInitialUpdates(projectId: string): ProjectUpdate[] {
  return mockUpdates.filter((u) => u.projectId === projectId);
}
