import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface MagicTextProps {
  children: React.ReactNode;
  className?: string;
  sparkleCount?: number;
  animationDuration?: number;
}

const MagicText: React.FC<MagicTextProps> = ({ 
  children, 
  className = '',
  sparkleCount = 3,
  animationDuration = 1000
}) => {
  const magicRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!magicRef.current) return;

    const stars = magicRef.current.querySelectorAll('.magic-star');
    let index = 0;
    const interval = animationDuration;

    const rand = (min: number, max: number) =>
      Math.floor(Math.random() * (max - min + 1)) + min;

    const animate = (star: Element) => {
      const htmlStar = star as HTMLElement;
      htmlStar.style.setProperty("--star-left", `${rand(-10, 100)}%`);
      htmlStar.style.setProperty("--star-top", `${rand(-40, 80)}%`);

      htmlStar.style.animation = "none";
      htmlStar.offsetHeight; // Force reflow
      htmlStar.style.animation = "";
    };

    const timeouts: NodeJS.Timeout[] = [];
    const intervals: NodeJS.Timeout[] = [];

    stars.forEach((star) => {
      timeouts.push(setTimeout(() => {
        animate(star);
        intervals.push(setInterval(() => animate(star), interval));
      }, index++ * (interval / 3)));
    });

    return () => {
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, [animationDuration]);

  const renderStars = () => {
    return Array.from({ length: sparkleCount }, (_, i) => (
      <span key={i} className="magic-star">
        <svg viewBox="0 0 512 512">
          <path d="M512 255.1c0 11.34-7.406 20.86-18.44 23.64l-171.3 42.78l-42.78 171.1C276.7 504.6 267.2 512 255.9 512s-20.84-7.406-23.62-18.44l-42.66-171.2L18.47 279.6C7.406 276.8 0 267.3 0 255.1c0-11.34 7.406-20.83 18.44-23.61l171.2-42.78l42.78-171.1C235.2 7.406 244.7 0 256 0s20.84 7.406 23.62 18.44l42.78 171.2l171.2 42.78C504.6 235.2 512 244.6 512 255.1z" />
        </svg>
      </span>
    ));
  };

  return (
    <span 
      ref={magicRef}
      className={cn('magic', className)}
    >
      {renderStars()}
      <span className="magic-text">
        {children}
      </span>
    </span>
  );
};

export default MagicText;