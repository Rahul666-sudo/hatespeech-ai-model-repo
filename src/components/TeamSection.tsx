const team = [
  { name: "N Kiran", reg: "NCE25CS090" },
  { name: "Pavithra S", reg: "NCE25CS091" },
  { name: "Pranav P", reg: "NCE25CS092" },
  { name: "Rahul Sunny", reg: "NCE25CS093" },
];

const TeamSection = () => (
  <section id="team" className="py-20 px-4">
    <div className="container mx-auto max-w-5xl">
      <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
        Meet the <span className="text-gradient">Team</span>
      </h2>
      <p className="text-muted-foreground text-center mb-12">The people behind HateGuard AI</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {team.map((member) => (
          <div
            key={member.reg}
            className="flex flex-col items-center gap-2 p-6 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm"
          >
            <h3 className="font-semibold text-lg text-foreground">{member.name}</h3>
            <p className="text-sm text-muted-foreground">{member.reg}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TeamSection;
