import Link from "next/link";

const projects = [
  {
    name: "Soroban Swap",
    category: "DeFi / DEX",
    description: "Next-generation automated market maker on Soroban.",
    rating: 4.8,
    reviews: 124,
  },
  {
    name: "Stellar Guardians",
    category: "Gaming / NFT",
    description: "A decentralized strategy game with on-chain assets.",
    rating: 4.5,
    reviews: 89,
  },
  {
    name: "Anchor Connect",
    category: "Infrastructure",
    description: "Seamless on/off ramp protocol for Stellar anchors.",
    rating: 4.9,
    reviews: 210,
  },
];

export default function FeaturedProjects() {
  return (
    <section className="py-24 bg-zinc-50 dark:bg-zinc-950">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <h2 className="text-3xl font-bold mb-4">Featured Projects</h2>
            <p className="text-zinc-500 dark:text-zinc-400">
              Discover the most trusted and highly-rated dApps on Stellar.
            </p>
          </div>
          <Link 
            href="/discover" 
            className="text-sm font-semibold flex items-center gap-2 hover:gap-3 transition-all underline underline-offset-4"
          >
            View all projects
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {projects.map((project, idx) => (
            <div 
              key={idx}
              className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 hover:shadow-xl transition-all"
            >
              <div className="w-full aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-2xl mb-6 overflow-hidden relative">
                <div className="absolute inset-0 flex items-center justify-center text-zinc-300 dark:text-zinc-700 font-bold text-lg">
                  {project.name[0]}
                </div>
              </div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                  {project.category}
                </span>
                <div className="flex items-center gap-1 text-sm font-bold">
                  <svg className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {project.rating}
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-blue-500 transition-colors">
                {project.name}
              </h3>
              <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6 line-clamp-2">
                {project.description}
              </p>
              <div className="text-xs text-zinc-400 dark:text-zinc-500">
                {project.reviews} reviews
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
