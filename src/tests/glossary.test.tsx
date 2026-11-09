import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import { GLOSSARY, splitGlossary } from '../features/glossary/glossary';
import { GlossaryText } from '../features/glossary/GlossaryText';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const words = (text: string) =>
  splitGlossary(text)
    .filter((p) => p.entry)
    .map((p) => p.text.toLowerCase());

describe('glossary', () => {
  it('has a definition for every entry and a unique id', () => {
    expect(new Set(GLOSSARY.map((g) => g.id)).size).toBe(GLOSSARY.length);
    for (const g of GLOSSARY) {
      expect(g.definition.length).toBeGreaterThan(15);
      expect(() => new RegExp(g.pattern, 'i')).not.toThrow();
    }
  });

  it('finds game vocabulary, including other forms of a word', () => {
    expect(words('Radiation exposure is high and life support is weak.')).toEqual([
      'radiation exposure',
      'life support',
    ]);
    expect(words('The water recycler and the filters are failing.')).toEqual(['recycler', 'filters']);
    expect(words('Wait for the resupply on Sol 15, then ration food.')).toEqual(['resupply', 'sol', 'ration']);
  });

  it('prefers the longer phrase over the word inside it', () => {
    const found = splitGlossary('radiation exposure').filter((p) => p.entry);
    expect(found).toHaveLength(1);
    expect(found[0]?.entry?.id).toBe('radiation-exposure');
  });

  it('marks each word only the first time it appears in a block of text', () => {
    expect(words('Radiation is rising. More radiation is coming. Radiation again.')).toEqual(['radiation']);
  });

  it('only matches whole words', () => {
    expect(words('The solitary console is a resolution.')).toEqual([]);
    expect(words('Rationale and operation')).toEqual([]);
  });

  it('keeps the original text exactly', () => {
    const text = 'Divert power to Shielding, then check the Habitat. Life-support is weak (and sol 3).';
    expect(splitGlossary(text).map((p) => p.text).join('')).toBe(text);
  });

  it('handles empty text and text with nothing to explain', () => {
    expect(splitGlossary('').map((p) => p.text).join('')).toBe('');
    expect(splitGlossary('Hello there').every((p) => !p.entry)).toBe(true);
  });
});

describe('GlossaryText', () => {
  let root: ReturnType<typeof createRoot> | undefined;
  let container: HTMLDivElement | undefined;
  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = undefined;
    document.body.querySelectorAll('[role="tooltip"]').forEach((n) => n.remove());
  });

  function mount(node: React.ReactElement): HTMLDivElement {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root?.render(node));
    return container;
  }

  it('shows the meaning when the word is hovered, and hides it again', () => {
    const view = mount(<p>Check the <GlossaryText>{'shielding and life support'}</GlossaryText> now.</p>);
    expect(view.textContent).toBe('Check the shielding and life support now.');
    expect(document.querySelector('[role="tooltip"]')).toBeNull();

    const triggers = Array.from(view.querySelectorAll<HTMLElement>('[class*="cursor-help"]'));
    expect(triggers.map((t) => t.textContent)).toEqual(['shielding', 'life support']);

    const outer = triggers[1]!.parentElement!;
    act(() => {
      outer.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    const tip = document.querySelector('[role="tooltip"]');
    expect(tip?.textContent).toContain('keep you alive');

    act(() => {
      outer.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    });
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('can be reached with the keyboard, except inside buttons', () => {
    const view = mount(
      <div>
        <GlossaryText>{'habitat'}</GlossaryText>
        <button>
          <GlossaryText focusable={false}>{'airlock'}</GlossaryText>
        </button>
      </div>
    );
    const [a, b] = Array.from(view.querySelectorAll<HTMLElement>('[class*="cursor-help"]'));
    expect(a?.getAttribute('tabindex')).toBe('0');
    expect(b?.hasAttribute('tabindex')).toBe(false);
  });

  it('renders text safely', () => {
    const view = mount(<p><GlossaryText>{'<img src=x onerror=alert(1)> radiation'}</GlossaryText></p>);
    expect(view.querySelector('img')).toBeNull();
    expect(view.textContent).toContain('<img src=x onerror=alert(1)>');
  });
});
