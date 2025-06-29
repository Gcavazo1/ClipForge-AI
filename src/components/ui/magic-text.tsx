import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface MagicTextProps {
  children: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
  starCount?: number;
  animationDuration?: number;
}

const MagicText: React.FC<MagicTextProps> = ({
  children,
  className = '',
  as: Component = 'h1',
  starCount = 3,
  animationDuration = 1000,
}) => {
  const magicRef = useRef<HTMLElement>(null);

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
      timeouts.push(
        setTimeout(() => {
          animate(star);
          intervals.push(setInterval(() => animate(star), interval));
        }, index++ * (interval / 3))
      );
    });

    return () => {
      timeouts.forEach(clearTimeout);
      intervals.forEach(clearInterval);
    };
  }, [animationDuration]);

  const StarIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2L14.09 8.26L20 9L15 14.74L16.18 21.02L12 17.77L7.82 21.02L9 14.74L4 9L9.91 8.26L12 2Z"
        fill="currentColor"
      />
    </svg>
  );

  return (
    <Component
      ref={magicRef}
      className={cn(
        'magic-text-container relative font-medium',
        className
      )}
    >
      <span className="magic relative inline-block">
        {Array.from({ length: starCount }).map((_, i) => (
          <span key={i} className="magic-star absolute block">
            <StarIcon />
          </span>
        ))}
        <span className="magic-text relative z-10">{children}</span>
      </span>
    </Component>
  );
};

export default MagicText;