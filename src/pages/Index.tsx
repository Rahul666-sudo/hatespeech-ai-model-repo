import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AnalyzerSection from "@/components/AnalyzerSection";
import TeamSection from "@/components/TeamSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <AnalyzerSection />
        <TeamSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
