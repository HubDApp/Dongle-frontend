"use client";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black pt-32 pb-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Terms of Service</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="prose prose-invert max-w-none space-y-8 text-zinc-900 dark:text-zinc-100">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Agreement to Terms</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              By accessing and using Dongle (Service), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Use License</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              Permission is granted to temporarily download one copy of the materials (information or software) on Dongle for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-600 dark:text-zinc-400">
              <li>Modifying or copying the materials</li>
              <li>Using the materials for any commercial purpose or for any public display</li>
              <li>Attempting to decompile or reverse engineer any software contained on the Service</li>
              <li>Removing any copyright or other proprietary notations from the materials</li>
              <li>Transferring the materials to another person or mirroring the materials on any other server</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Disclaimer</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              The materials on Dongle are provided on an as is basis. Dongle makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Limitations</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              In no event shall Dongle or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on the Service, even if Dongle or an authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Accuracy of Materials</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              The materials appearing on Dongle could include technical, typographical, or photographic errors. Dongle does not warrant that any of the materials on the Service are accurate, complete, or current. Dongle may make changes to the materials contained on the Service at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Links</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Dongle has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Dongle of the site. Use of any such linked website is at the user&apos;s own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Modifications</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              Dongle may revise these terms of service for the Service at any time without notice. By using the Service, you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Governing Law</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which Dongle operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">User Responsibilities</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">
              By using Dongle, you agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-zinc-600 dark:text-zinc-400">
              <li>Maintain the confidentiality of your wallet credentials</li>
              <li>Not submit illegal or harmful content</li>
              <li>Not engage in harassment, abuse, or discrimination</li>
              <li>Comply with all applicable laws and regulations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Contact</h2>
            <p className="text-zinc-600 dark:text-zinc-400">
              If you have questions about these Terms of Service, please contact us through our GitHub repository or community channels.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
