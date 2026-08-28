/**
 * GameHub-TV Horizontal Game Row
 * Carousel row with D-pad focus tracking and smooth horizontal auto-scrolling
 */

import React, { useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { GameMetadata } from '../types/models';
import { GameCard } from './GameCard';

interface GameRowProps {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  games: GameMetadata[];
  focusedIndex: number | null; // index of focused card in this row, or null if row not active
  onSelectGame: (game: GameMetadata) => void;
  onInspectGame: (game: GameMetadata) => void;
}

export const GameRow: React.FC<GameRowProps> = ({
  id,
  title,
  subtitle,
  badge,
  games,
  focusedIndex,
  onSelectGame,
  onInspectGame,
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Scroll active card smoothly into view when focusedIndex changes
  useEffect(() => {
    if (focusedIndex !== null && cardRefs.current[focusedIndex]) {
      const cardEl = cardRefs.current[focusedIndex];
      cardEl?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [focusedIndex]);

  return (
    <div id={id} className="w-full py-4 select-none">
      {/* Row Header */}
      <div className="flex items-end justify-between px-2 mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight text-white">
              {title}
            </h2>
            {badge && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-neutral-400 font-medium mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-1 text-xs text-neutral-500">
          <span>{games.length} Games</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>

      {/* Horizontal Cards Scroller */}
      <div
        ref={rowRef}
        className="flex items-center gap-5 overflow-x-auto overflow-y-visible px-2 py-4 no-scrollbar scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {games.map((game, idx) => (
          <div
            key={game.id}
            ref={(el) => {
              cardRefs.current[idx] = el;
            }}
          >
            <GameCard
              game={game}
              isFocused={focusedIndex === idx}
              onSelect={onSelectGame}
              onInspect={onInspectGame}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
