import Navbar from "./Navbar";
import Footer from "./Footer";
import NetworkMismatchBanner from "./NetworkMismatchBanner";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export default function LayoutWrapper({ children }: LayoutWrapperProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <NetworkMismatchBanner />
      <main className="grow pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}
