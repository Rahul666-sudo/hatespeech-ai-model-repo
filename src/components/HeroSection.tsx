import { Shield, Zap, Brain } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="container mx-auto max-w-5xl relative z-10">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium text-primary tracking-wide uppercase">AI-Powered Detection</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-center leading-tight mb-6">
          Detect <span className="text-gradient">Hate Speech</span>
          <br />
          <span className="text-muted-foreground">Instantly with AI</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground text-center max-w-2xl mx-auto mb-12">
          Powered by advanced AI to classify text as hate speech, offensive language, or safe content in real-time.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { icon: Brain, title: "AI Classification", desc: "Advanced NLP-powered analysis\nAI model is created using Google Colab" },
            { icon: Zap, title: "Real-time", desc: "Instant results in milliseconds" },
            { icon: Shield, title: "3-Tier Detection", desc: "Hate, offensive, or clean" },
          ].map((item) => (
            <div key={item.title} className="flex flex-col items-center gap-3 p-6 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm text-center">
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
