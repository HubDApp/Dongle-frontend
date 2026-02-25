import Link from "next/link";
import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background Mesh/Grid */}
      <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 dark:bg-blue-500/5 border border-blue-500/20 dark:border-blue-500/10 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-6 animate-fade-in shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
              Now live on Stellar Testnet
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
              The Trust Layer <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
                for Web3 Apps
              </span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Dongle is the decentralized app store that brings transparency to dApps on Stellar. Discover, review, and verify protocols with on-chain trust.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link 
                href="/discover" 
                className="w-full sm:w-auto px-8 py-4 bg-black dark:bg-white text-white dark:text-black font-bold rounded-full hover:scale-105 transition-all shadow-xl shadow-blue-500/10 dark:shadow-none"
              >
                Explore Apps
              </Link>
              <Link 
                href="/docs" 
                className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 font-bold rounded-full hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
              >
                Documentation
              </Link>
            </div>
            
            <div className="mt-12 flex items-center justify-center lg:justify-start gap-8 opacity-50 grayscale hover:grayscale-0 transition-all">
               <div className="text-sm font-bold tracking-widest text-zinc-400">POWERED BY</div>
               <div className="font-black text-xl italic tracking-tighter">STELLAR</div>
               <div className="font-black text-xl italic tracking-tighter">SOROBAN</div>
            </div>
          </div>

          <div className="flex-1 relative w-full max-w-[500px] lg:max-w-none">
            <div className="relative z-10 animate-fade-up">
              <div className="relative rounded-[2.5rem] overflow-hidden border-8 border-zinc-900 dark:border-zinc-800 shadow-2xl">
                <Image 
                  src="/images/hero-app.png" 
                  alt="App Mockup" 
                  width={600} 
                  height={800} 
                  className="w-full h-auto object-cover"
                  priority
                />
              </div>
              
              {/* Floating element 1 */}
              <div className="absolute -top-6 -right-6 p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl hidden sm:block animate-bounce [animation-duration:3s]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</div>
                    <div className="text-sm font-bold">Verified On-Chain</div>
                  </div>
                </div>
              </div>

              {/* Floating element 2 */}
              <div className="absolute -bottom-6 -left-6 p-6 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl hidden sm:block animate-bounce [animation-duration:4s]">
                <div className="flex items-center gap-4">
                   <div className="flex -space-x-3">
                      {[1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-zinc-900 bg-zinc-200 dark:bg-zinc-800"></div>)}
                   </div>
                   <div className="text-sm font-bold">4.9/5 <span className="text-zinc-500 font-medium">(2k+ Reviews)</span></div>
                </div>
              </div>
            </div>

            {/* Glowing background behind image */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] -z-10 blur-[100px] opacity-30 dark:opacity-20">
               <div className="absolute inset-0 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Large blobs */}
      <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-blue-600/10 blur-[150px] -z-10"></div>
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-purple-600/10 blur-[150px] -z-10"></div>
    </section>
  );
}
