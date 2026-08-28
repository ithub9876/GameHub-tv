/**
 * GameHub-TV Category Filter Pills
 */

import React from 'react';
import { GameCategory } from '../types/models';
import { CATEGORIES } from '../services/gameCatalog';

interface CategoryFilterProps {
  selectedCategory: GameCategory;
  onSelectCategory: (cat: GameCategory) => void;
  isFocused?: boolean;
  focusedCategoryIndex?: number;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  isFocused = false,
  focusedCategoryIndex = 0,
}) => {
  return (
    <div className="w-full flex items-center gap-3 overflow-x-auto py-2 px-2 no-scrollbar">
      {CATEGORIES.map((cat, idx) => {
        const isSelected = selectedCategory === cat;
        const isButtonFocused = isFocused && focusedCategoryIndex === idx;

        return (
          <button
            key={cat}
            onClick={() => onSelectCategory(cat)}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer whitespace-nowrap border ${
              isButtonFocused
                ? 'bg-blue-600 text-white scale-105 ring-4 ring-blue-400/80 ring-offset-2 ring-offset-[#0a0b0e] border-blue-400 shadow-lg shadow-blue-600/40'
                : isSelected
                ? 'bg-blue-950/60 text-blue-300 border-blue-500/50 shadow-md'
                : 'bg-neutral-900/80 text-neutral-400 border-neutral-800 hover:text-neutral-200 hover:bg-neutral-800'
            }`}
          >
            {cat === 'All' ? '🎮 All Games' : cat}
          </button>
        );
      })}
    </div>
  );
};
