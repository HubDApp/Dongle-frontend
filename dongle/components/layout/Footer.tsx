import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="text-xl font-bold tracking-tighter mb-4 block">
              DONGLE
            </Link>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-sm text-sm">
              The decentralized app store for Stellar. Discovery, reviews, and verification powered by on-chain transparency.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li><Link href="/discover" className="hover:text-black dark:hover:text-white">Discover</Link></li>
              <li><Link href="/reviews" className="hover:text-black dark:hover:text-white">Reviews</Link></li>
              <li><Link href="/verify" className="hover:text-black dark:hover:text-white">Verification</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-4">Developers</h4>
            <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li><Link href="/docs" className="hover:text-black dark:hover:text-white">Documentation</Link></li>
              <li><Link href="/listing" className="hover:text-black dark:hover:text-white">Submit App</Link></li>
              <li><Link href="https://github.com" className="hover:text-black dark:hover:text-white">GitHub</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-zinc-200 dark:border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            © {new Date().getFullYear()} Dongle Protocol. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-zinc-500 dark:text-zinc-400">
            <Link href="/privacy" className="hover:text-black dark:hover:text-white">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-black dark:hover:text-white">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
