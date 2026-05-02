export function DarkToLightTransition() {
  return (
    <section
      aria-hidden="true"
      className="h-[200px] md:h-[240px]"
      style={{
        background:
          "radial-gradient(ellipse 120% 100% at top, #050505 0%, transparent 60%), linear-gradient(to bottom, #050505 0%, #fafaf9 100%)",
      }}
    />
  );
}
