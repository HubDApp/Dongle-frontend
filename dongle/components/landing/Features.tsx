import { ShieldCheck, MessageSquare, Code } from "lucide-react";

const features = [
  {
    title: "On-Chain Verification",
    description: "Every app listing and review is stored directly on the Stellar blockchain, ensuring data integrity and censorship resistance.",
    icon: <ShieldCheck className="w-6 h-6" />,
  },
  {
    title: "Community Reviews",
    description: "Real users provide verified feedback. Reviewers earn reputation based on the accuracy and depth of their contributions.",
    icon: <MessageSquare className="w-6 h-6" />,
  },
  {
    title: "Developer Focused",
    description: "Simple integration for developers to list their Stellar dApps and reach a community that values trust and transparency.",
    icon: <Code className="w-6 h-6" />,
  },
];

export default function Features() {
  return (
    <section className="py-24 bg-white dark:bg-black">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Why Dongle?</h2>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">
            We&apos;re building the infrastructure for a more trustworthy decentralized ecosystem.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className="p-8 rounded-3xl border border-zinc-100 dark:border-zinc-900 hover:border-zinc-200 dark:hover:border-zinc-800 transition-colors bg-zinc-50/50 dark:bg-zinc-900/30"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-6 text-black dark:text-white">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed italic">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
