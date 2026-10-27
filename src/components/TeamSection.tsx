const team = [
  { name: "N Kiran", reg: "NCE25CS090" },
  { name: "Pavithra S", reg: "NCE25CS091" },
  { name: "Pranav P", reg: "NCE25CS092" },
  { name: "Rahul Sunny", reg: "NCE25CS093" },
];

const TeamSection = () => (
  <section id="team" className="scroll-mt-20 border-t border-border px-5 py-20 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">The people</p>
          <h2 className="display mt-4 text-4xl text-foreground sm:text-5xl">Meet the team</h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Four students building a safer way to talk online.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {team.map((member, index) => (
          <div key={member.reg} className="bg-background p-6 sm:p-7">
            <span className="font-mono text-[11px] text-muted-foreground">0{index + 1}</span>
            <h3 className="mt-8 font-heading text-lg font-semibold tracking-tight text-foreground">
              {member.name}
            </h3>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{member.reg}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TeamSection;
