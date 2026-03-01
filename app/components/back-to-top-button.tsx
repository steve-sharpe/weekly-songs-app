"use client";

export default function BackToTopButton() {
  return (
    <button
      type="button"
      className="floating-top-btn"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      aria-label="Back to top"
      title="Back to top"
    >
      ↑ Top
    </button>
  );
}
