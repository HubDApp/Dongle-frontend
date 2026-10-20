import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import FeaturedProjects from "@/components/landing/FeaturedProjects";
import FeaturedLists from "@/components/lists/FeaturedLists";
import CTA from "@/components/landing/CTA";

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <FeaturedProjects />
      <FeaturedLists />
      <CTA />
    </>
  );
}
