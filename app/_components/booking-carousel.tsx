"use client";

import { useRef } from "react";

interface BookingCarouselProps {
  children: React.ReactNode;
}

const BookingCarousel = ({ children }: BookingCarouselProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const container = containerRef.current;
    if (!container) return;

    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;

    if (Math.abs(deltaX) < Math.abs(deltaY)) return;
    if (Math.abs(deltaX) < 30) return;

    const cardWidth = container.offsetWidth;
    const currentIndex = Math.round(container.scrollLeft / cardWidth);
    const nextIndex = deltaX > 0 ? currentIndex + 1 : currentIndex - 1;

    container.scrollTo({ left: nextIndex * cardWidth, behavior: "smooth" });
  };

  return (
    <div
      ref={containerRef}
      className="grid grid-flow-col [grid-auto-columns:100%] overflow-x-scroll snap-x snap-mandatory [&::-webkit-scrollbar]:hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};

export default BookingCarousel;
