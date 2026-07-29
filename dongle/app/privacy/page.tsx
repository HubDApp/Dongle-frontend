"use client";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black pt-32 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Privacy Policy</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="prose prose-invert max-w-none space-y-8 text-zinc-900 dark:text-zinc-100">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Introduction</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Dongle Protocol (we, us, our, or Company) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and otherwise process information in connection with our website and services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Information We Collect</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">We collect information you provide directly to us, such as:</p>
            <ul className="list-disc list-inside space-y-2 text-zinc-600 dark:text-zinc-400">
              <li>Wallet addresses for authentication</li>
              <li>Profile information when you create an account</li>
              <li>Application submissions and reviews</li>
              <li>Communication data when you contact us</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Blockchain Data</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Dongle operates on the Stellar blockchain. Data related to applications, reviews, and verification is stored on-chain and is inherently public. Your wallet address and associated on-chain transactions are transparent and visible to all blockchain participants.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">How We Use Information</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-2 text-zinc-600 dark:text-zinc-400">
              <li>Provide and maintain our services</li>
              <li>Process transactions and verify identities</li>
              <li>Improve and personalize user experience</li>
              <li>Communicate about updates and changes</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Data Security</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the internet is 100 percent secure. We cannot guarantee absolute security of your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Third-Party Services</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Our service may integrate with third-party services, including blockchain networks and wallet providers. We are not responsible for their privacy practices. Please review their privacy policies separately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              We may update this Privacy Policy from time to time. We will notify you of any changes by updating the Last updated date above. Your continued use of Dongle constitutes your acceptance of the updated Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              If you have questions about this Privacy Policy, please contact us through our GitHub repository or community channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
