/**
 * NASA Space Apps rule: images made with an AI tool must carry a visible
 * watermark. Every AI-generated picture in the game (the chapter and ending
 * artwork) must show the "AI-generated image" label next to it.
 */
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { ReactElement } from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameOver } from '../features/mission/GameOver';
import { MissionComplete } from '../features/mission/MissionComplete';
import { ChapterIntroModal } from '../features/storyline/ChapterIntroModal';
import { CHAPTER_INTRODUCTIONS } from '../features/storyline/chapterIntroductions';
import { freshGame } from './helpers';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  document.body.style.overflow = '';
});

function render(element: ReactElement): void {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root?.render(element));
}

/** The AI label must sit in the same box as the picture, so it can never be cropped away from it. */
function expectLabelBesideImage(): void {
  const image = document.body.querySelector<HTMLImageElement>('[role="dialog"] img');
  expect(image).not.toBeNull();
  const label = image?.parentElement?.querySelector('[data-testid="ai-image-badge"]');
  expect(label?.textContent).toBe('AI-generated image');
  expect(image?.parentElement?.className).toContain('relative');
}

describe('AI image labels', () => {
  it.each(CHAPTER_INTRODUCTIONS.map((chapter) => [chapter.chapterNumber, chapter] as const))(
    'chapter %i artwork shows the label',
    (_number, chapter) => {
      render(<ChapterIntroModal chapter={chapter} onContinue={() => {}} />);
      expect(document.body.querySelector('img')?.getAttribute('src')).toBe(
        `/chapters/chapter-${chapter.chapterNumber}.png`,
      );
      expectLabelBesideImage();
    },
  );

  it('the mission-complete artwork shows the label', () => {
    const base = freshGame();
    render(
      <MissionComplete
        state={{ ...base, day: 30, mission: { ...base.mission, status: 'completed' } }}
        onViewDebrief={vi.fn()}
        onNewRun={vi.fn()}
      />,
    );
    expectLabelBesideImage();
  });

  it('the mission-failed artwork shows the label', () => {
    const base = freshGame();
    render(
      <GameOver
        state={{ ...base, day: 9, mission: { ...base.mission, status: 'failed' } }}
        onRestartSame={vi.fn()}
        onNewRun={vi.fn()}
        onViewDebrief={vi.fn()}
      />,
    );
    expectLabelBesideImage();
  });
});

describe('AI artwork cannot be added without a label', () => {
  /** Source files that display a picture from the AI-art folders. */
  function sourceFilesShowingAiArt(dir: string, found: string[] = []): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'tests') continue;
        sourceFilesShowingAiArt(full, found);
      } else if (/\.tsx$/.test(entry.name)) {
        const text = fs.readFileSync(full, 'utf8');
        if (/\/(chapters|endings)\//.test(text)) found.push(full);
      }
    }
    return found;
  }

  it('every component that shows chapter or ending art also renders the AI label', () => {
    const files = sourceFilesShowingAiArt(path.resolve(__dirname, '..'));
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const file of files) {
      expect(fs.readFileSync(file, 'utf8'), path.basename(file)).toContain('<AiImageBadge />');
    }
  });
});

describe('NASA branding', () => {
  it('the background picture has had the NASA logo and caption cropped out', () => {
    // 1920x1080 original -> the top (logo, caption) and bottom (web address) bands removed.
    const file = fs.readFileSync(path.resolve(__dirname, '../../public/mars-bg.webp'));
    const chunk = file.toString('ascii', 12, 16);
    let height: number;
    if (chunk === 'VP8X') height = 1 + file.readUIntLE(27, 3); // extended header
    else if (chunk === 'VP8 ') height = file.readUInt16LE(28) & 0x3fff; // lossy frame header
    else throw new Error(`Unexpected WebP chunk "${chunk}"`);
    expect(height).toBeLessThan(1080);
    expect(height).toBeGreaterThan(600);
  });
});
