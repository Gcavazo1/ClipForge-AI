import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../lib/utils';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = 'top',
  align = 'center',
  className = '',
}) => {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            className={cn(
              'z-50 overflow-hidden rounded-md bg-background-light px-3 py-1.5',
              'text-xs font-medium text-foreground shadow-md animate-in fade-in-0',
              'duration-200 data-[side=bottom]:slide-in-from-top-1',
              'data-[side=top]:slide-in-from-bottom-1',
              'data-[side=left]:slide-in-from-right-1',
              'data-[side=right]:slide-in-from-left-1',
              className
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-background-light" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
};