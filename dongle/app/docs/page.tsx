"use client";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black pt-32 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight mb-8">Documentation</h1>
        
        <div className="prose prose-invert max-w-none space-y-8 text-zinc-900 dark:text-zinc-100">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Getting Started with Dongle</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Dongle is a decentralized app store for Stellar, powered by on-chain transparency and community verification.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Key Features</h2>
            <ul className="list-disc list-inside space-y-2 text-zinc-600 dark:text-zinc-400">
              <li>Discover verified Stellar applications</li>
              <li>Submit your own applications for listing</li>
              <li>Review and rate applications in the community</li>
              <li>On-chain verification for developer identity</li>
              <li>Transparent, decentralized governance</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">For Developers</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              If you&apos;re building on Stellar, you can submit your application to Dongle to reach our community of users and developers.
            </p>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              To submit your app, connect your wallet and navigate to the <strong>Submit Project</strong> section. Provide details about your application, verify your identity on-chain, and our community will review your submission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Community Verification</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Our verification system allows community members to validate applications and developers. This creates a transparent, trustworthy ecosystem where users can make informed decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Support and Questions</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              For additional support, visit our GitHub repository or check the community channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
