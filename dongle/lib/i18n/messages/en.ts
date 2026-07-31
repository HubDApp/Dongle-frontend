/**
 * English (en) messages
 * This is the default/source locale for the application
 */

export const en = {
  common: {
    loading: "Loading...",
    error: "Error",
    success: "Success",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    submit: "Submit",
    close: "Close",
    back: "Back",
    next: "Next",
    search: "Search",
    filter: "Filter",
    sort: "Sort",
    clear: "Clear",
    clearAll: "Clear all",
    tryAgain: "Try again",
    learnMore: "Learn More",
    viewAll: "View all",
    loadMore: "Load More",
    home: "Home",
  },

  nav: {
    discover: "Discover",
    reviews: "Reviews",
    verify: "Verify",
    submitProject: "Submit Project",
    profile: "Profile",
    admin: "Admin",
    documentation: "Documentation",
    openMenu: "Open menu",
    closeMenu: "Close menu",
  },

  wallet: {
    connect: "Connect Wallet",
    connecting: "Connecting...",
    disconnect: "Disconnect",
    connected: "Connected",
    wrongNetwork: "Wrong network detected.",
    networkMismatch: "Your Freighter wallet is currently on {currentNetwork}. This app requires {expectedNetwork}. Open Freighter, go to Settings → Network, and switch to {expectedNetwork} before submitting any transactions.",
    expectedNetwork: "Expected: {network}",
  },

  hero: {
    badge: "Now live on Stellar Testnet",
    title: "The Trust Layer",
    titleHighlight: "for Web3 Apps",
    subtitle: "Dongle is the decentralized app store that brings transparency to dApps on Stellar. Discover, review, and verify protocols with on-chain trust.",
    exploreApps: "Explore Apps",
    poweredBy: "POWERED BY",
    verifiedOnChain: "Verified On-Chain",
    status: "Status",
    reviewsCount: "{count} Reviews",
  },

  features: {
    sectionTitle: "Why Dongle?",
    sectionSubtitle: "We're building the infrastructure for a more trustworthy decentralized ecosystem.",
    onChainVerification: {
      title: "On-Chain Verification",
      description: "Every app listing and review is stored directly on the Stellar blockchain, ensuring data integrity and censorship resistance.",
    },
    communityReviews: {
      title: "Community Reviews",
      description: "Real users provide verified feedback. Reviewers earn reputation based on the accuracy and depth of their contributions.",
    },
    developerFocused: {
      title: "Developer Focused",
      description: "Simple integration for developers to list their Stellar dApps and reach a community that values trust and transparency.",
    },
  },

  cta: {
    title: "Ready to list your application?",
    subtitle: "Join the growing ecosystem of transparent dApps on Stellar. Get verified and build trust with your users today.",
  },

  discover: {
    title: "DISCOVER",
    subtitle: "Explore the ecosystem of decentralized applications, infrastructure, and tools built on Stellar and Soroban.",
    searchPlaceholder: "Search projects by name or description...",
    filterByTags: "Filter by Tags",
    addTagsPlaceholder: "Add tags to filter...",
    allStatus: "All Status",
    verified: "Verified",
    pending: "Pending",
    unverified: "Unverified",
    rejected: "Rejected",
    highestRated: "Highest Rated",
    mostPopular: "Most Popular",
    newest: "Newest",
    noProjectsFound: "No projects found",
    noProjectsDescription: "Try adjusting your search or filters to find what you're looking for.",
    clearFilters: "Clear Filters",
    loadingProjects: "Loading projects...",
    loadMoreProjects: "Load More Projects",
  },

  projectCard: {
    reviews: "{count} reviews",
    addedAt: "Added {date}",
    saveProject: "Save {name}",
    removeFromSaved: "Remove {name} from saved projects",
    addToComparison: "Add {name} to comparison",
    removeFromComparison: "Remove {name} from comparison",
    maxProjectsReached: "Cannot add {name}: maximum 4 projects",
  },

  projectForm: {
    title: {
      create: "Submit New Project",
      edit: "Edit Project",
    },
    basicInfo: "Basic Information",
    projectName: "Project Name",
    projectNamePlaceholder: "My Awesome DApp",
    description: "Description",
    descriptionPlaceholder: "Tell us about your project...",
    category: "Primary Category",
    tags: "Tags",
    tagsPlaceholder: "Add relevant tags...",
    websiteUrl: "Website URL",
    websiteUrlPlaceholder: "https://...",
    githubUrl: "GitHub URL (Optional)",
    githubUrlPlaceholder: "https://github.com/...",
    logoUrl: "Logo URL (Optional)",
    logoUrlPlaceholder: "https://...",
    docsUrl: "Documentation URL (Optional)",
    docsUrlPlaceholder: "https://docs...",
    auditReportUrl: "Audit Report URL (Optional)",
    bugBountyUrl: "Bug Bounty URL (Optional)",
    submitButton: {
      create: "Submit Registration",
      edit: "Update Project",
      processing: "Processing Transaction...",
    },
    disclaimer: {
      create: "By submitting, you agree to have your project details stored on the Stellar network. A small transaction fee will be required for on-chain registration.",
      edit: "By updating, you agree to have your project details updated on the Stellar network.",
    },
    duplicateWarning: {
      title: "Possible Duplicate Detected",
      description: "We found existing projects that look very similar to yours:",
      confirmLabel: "Continue Anyway",
    },
    discardDraft: {
      title: "Discard Draft",
      description: "Are you sure you want to discard this draft? All unsaved changes will be lost.",
      confirmLabel: "Discard Draft",
      cancelLabel: "Keep Draft",
    },
  },

  reviews: {
    title: "YOUR REVIEWS",
    subtitle: "See what the community is saying about Stellar dApps.",
    addReview: "Add Review",
    editReview: "Edit Review",
    yourReviews: "Your Reviews",
    noReviews: "No reviews yet. Start reviewing projects!",
    rating: "Rating",
    comment: "Comment",
    commentPlaceholder: "Share your experience with this project...",
    minChars: "Min: {count} chars",
    postReview: "Post Review",
    updateReview: "Update Review",
    rateStars: "Rate {count} star{plural}",
    devOnlyBadge: "DEV-ONLY",
  },

  verification: {
    title: "Verification Status",
    searchPlaceholder: "Enter Project ID to check status",
    statuses: {
      none: {
        title: "Not Found",
        description: "No verification request found for this project.",
      },
      pending: {
        title: "Pending Review",
        description: "The verification request is currently being reviewed by the community.",
      },
      verified: {
        title: "Verified",
        description: "This project has been verified and is considered trustworthy.",
      },
      rejected: {
        title: "Rejected",
        description: "The verification request for this project was rejected.",
      },
    },
    projectId: "ID: {id}",
  },

  profile: {
    title: "YOUR PROFILE",
    subtitle: "Manage your account and view your activity on Dongle.",
    accountSummary: "Account Summary",
    walletAddress: "Wallet Address",
    network: "Network",
    networkInfo: "Connected to {network}",
    networkDisclaimer: "Dongle requires Stellar {expectedNetwork} (Soroban testnet). Before signing, confirm Freighter is on this network via Settings → Network. Wrong-network transactions are blocked automatically.",
    balances: "Balances",
    activityStats: "Activity Stats",
    avgRating: "Avg Rating",
    submitted: "Submitted",
    quickActions: "Quick Actions",
    browseProjects: "Browse Projects",
    viewAllReviews: "View All Reviews",
    savedProjects: "Saved Projects",
    noSavedProjects: "No saved projects yet. Bookmark projects to revisit them later.",
    submittedProjects: "Submitted Projects",
    noSubmittedProjects: "No submitted projects yet.",
    submitFirstProject: "Submit Your First Project",
    submittedAt: "Submitted {date}",
    rejectionReason: "Rejection Reason:",
    clearHistory: "Clear viewing history",
    clearHistoryConfirm: "This will permanently remove your recently viewed projects. This action cannot be undone.",
    clearHistoryButton: "Clear History",
    discoverProjects: "Discover Projects",
  },

  comparison: {
    title: "Compare Projects",
    count: "Compare Projects ({current}/{max})",
    compareNow: "Compare Now",
    selectAtLeast: "Select at least 2 projects to compare",
  },

  transaction: {
    phases: {
      preparing: "Preparing",
      signing: "Awaiting signature",
      submitting: "Submitting",
      confirming: "Confirming",
    },
    status: {
      idle: "Ready",
      inProgress: "Transaction in progress",
      success: "Transaction complete",
      failure: "Transaction failed",
    },
    retry: "Retry transaction",
  },

  errors: {
    somethingWrong: "Something went wrong",
    somethingWrongIn: "Something went wrong in {section}",
    unexpectedError: "An unexpected error occurred. You can try again or go back home.",
    pageNotFound: "Page Not Found",
    pageNotFoundDescription: "The page you're looking for doesn't exist or has been moved.",
  },

  footer: {
    tagline: "The decentralized app store for Stellar. Discovery, reviews, and verification powered by on-chain transparency.",
    platform: "Platform",
    resources: "Resources",
    github: "GitHub",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    copyright: "© {year} Dongle Protocol. All rights reserved.",
  },

  meta: {
    title: "Dongle - Your Onchain App Store",
    description: "The decentralized app store for Stellar. Discovery, reviews, and verification powered by on-chain transparency.",
  },

  legal: {
    lastUpdated: "Last updated: {date}",
  },
} as const;

export type Messages = typeof en;
