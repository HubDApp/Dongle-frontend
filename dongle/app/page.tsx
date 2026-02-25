import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import FeaturedProjects from "@/components/landing/FeaturedProjects";
import CTA from "@/components/landing/CTA";
import LayoutWrapper from "@/components/layout/LayoutWrapper";

export default function Home() {
  return (
    <LayoutWrapper>
      <Hero />
      <Features />
      <FeaturedProjects />
      <CTA />
    </LayoutWrapper>
  );
}
