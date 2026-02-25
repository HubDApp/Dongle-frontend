import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium mb-6 animate-fade-in">
            <span className="flex h-2 w-2 rounded-full bg-blue-500"></span>
            Now live on Stellar Testnet
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight">
            The Trust Layer for <br />
            <span className="text-zinc-500">Decentralized Apps</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Dongle is the decentralized app store that brings transparency to dApps on Stellar. Discover, review, and verify protocols with on-chain trust.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              href="/discover" 
              className="w-full sm:w-auto px-8 py-4 bg-black dark:bg-white text-white dark:text-black font-semibold rounded-full hover:scale-105 transition-transform shadow-xl"
            >
              Explore Apps
            </Link>
            <Link 
              href="/docs" 
              className="w-full sm:w-auto px-8 py-4 bg-transparent border border-zinc-200 dark:border-zinc-800 font-semibold rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              Documentation
            </Link>
          </div>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 opacity-20 dark:opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[60%] bg-blue-500 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[60%] bg-purple-500 blur-[120px] rounded-full"></div>
      </div>
    </section>
  );
}
