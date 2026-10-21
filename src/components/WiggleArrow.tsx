const WiggleArrow = () => {
  return (
    <div className="flex justify-center -mt-8 -mb-4 relative z-10 pointer-events-none">
      <svg
        width="60"
        height="80"
        viewBox="0 0 60 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-bounce text-primary opacity-60"
      >
        <path
          d="M30 5 C20 20, 40 30, 25 45 C15 55, 40 55, 30 65"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="4 4"
          fill="none"
        />
        <path
          d="M22 58 L30 72 L38 58"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  );
};

export default WiggleArrow;
