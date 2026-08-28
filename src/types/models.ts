/**
 * Game Models and TV UI Types
 */

import { StreamQualityConfig } from './protocol';

export type GameCategory =
  | 'All'
  | 'Action'
  | 'Battle Royale'
  | 'Adventure'
  | 'Sandboxes'
  | 'Racing'
  | 'Sports';

export interface ControllerMapping {
  profileName: string;
  supportsTouchOverlay: boolean;
  supportsBluetoothGamepad: boolean;
  supportsMotionSteering?: boolean;
  buttonHints: {
    aButton?: string;
    bButton?: string;
    xButton?: string;
    yButton?: string;
    triggers?: string;
    dpad?: string;
  };
}

export interface GameMetadata {
  id: string;
  title: string;
  category: GameCategory;
  packageName: string;
  developer: string;
  tagline: string;
  description: string;
  heroImage: string;
  coverImage: string;
  logoBadge?: string;
  rating: string;
  releaseYear: number;
  tags: string[];
  minAndroidVersion: number;
  minRamGb: number;
  orientation: 'landscape' | 'portrait';
  controllerMapping: ControllerMapping;
  recommendedQuality: StreamQualityConfig;
  playStoreUrl: string;
  isInstalledOnPhone?: boolean;
  playTimeMinutes?: number;
  lastPlayed?: string;
  customLaunchUri?: string;
}

export type TvFocusZone =
  | 'HEADER'
  | 'HERO_BANNER'
  | 'CATEGORY_TABS'
  | 'GAME_GRID_MAIN'
  | 'GAME_GRID_RECENT'
  | 'MODAL_LAUNCH'
  | 'MODAL_PAIRING'
  | 'STREAM_HUD'
  | 'DEV_DRAWER';

export interface TvRemoteKeyAction {
  code: string;
  label: string;
  color?: 'red' | 'green' | 'yellow' | 'blue' | 'default';
  description: string;
}
