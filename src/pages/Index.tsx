import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import WiggleArrow from "@/components/WiggleArrow";
import AnalyzerSection from "@/components/AnalyzerSection";
import TeamSection from "@/components/TeamSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <WiggleArrow />
      <AnalyzerSection />
      <TeamSection />
      <Footer />
    </div>
  );
};

export default Index;
