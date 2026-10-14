import { own, type Styles, type Swatches } from './schema.ts';

/** The swatch every element of a component type receives, before its own `style` array. */
const BASE = 'base';

export function swatchReference(token: string): string | undefined {
  return token.startsWith('$') ? token.slice(1) : undefined;
}

/**
 * The element's className: the type's `base` swatch, then its `style` array, with every `$swatch`
 * token expanded in place from the same type's swatches. `undefined` when no class applies.
 */
export function resolveClassName(styles: Styles, componentType: string, style?: string[]): string | undefined {
  const swatches = own(styles, componentType) ?? {};
  const classes = [
    ...expandSwatch(BASE, swatches, new Set()),
    ...(style ?? []).flatMap((token) => expandToken(token, swatches, new Set())),
  ];
  return classes.length > 0 ? classes.join(' ') : undefined;
}

/** A cycle expands to nothing here; `swatchProblems` reports it before emission. */
function expandSwatch(name: string, swatches: Swatches, seen: Set<string>): string[] {
  const tokens = own(swatches, name);
  if (!tokens || seen.has(name)) {
    return [];
  }
  const next = new Set(seen).add(name);
  return tokens.flatMap((token) => expandToken(token, swatches, next));
}

function expandToken(token: string, swatches: Swatches, seen: Set<string>): string[] {
  const reference = swatchReference(token);
  return reference === undefined ? [token] : expandSwatch(reference, swatches, seen);
}

/** Every problem in a type's swatches: empty names and tokens, dangling `$` references, and cycles. */
export function swatchProblems(component: string, swatches: Swatches): string[] {
  const problems: string[] = [];

  for (const [name, tokens] of Object.entries(swatches)) {
    if (name.trim() === '') {
      problems.push(`styles.${component} has a swatch with an empty name`);
    }
    for (const token of tokens) {
      const reference = swatchReference(token);
      if (token.trim() === '') {
        problems.push(`styles.${component}.${name} has an empty token`);
      } else if (reference !== undefined && own(swatches, reference) === undefined) {
        problems.push(`styles.${component}.${name} references "$${reference}", which ${component} does not define`);
      }
    }
    const cycle = findCycle(swatches, name, []);
    if (cycle) {
      problems.push(`styles.${component} has a swatch cycle: ${cycle}`);
    }
  }

  return problems;
}

function findCycle(swatches: Swatches, name: string, path: string[]): string | undefined {
  const start = path.indexOf(name);
  if (start !== -1) {
    return [...path.slice(start), name].join(' -> ');
  }
  const tokens = own(swatches, name);
  if (!tokens) {
    return undefined;
  }
  for (const token of tokens) {
    const reference = swatchReference(token);
    const cycle = reference === undefined ? undefined : findCycle(swatches, reference, [...path, name]);
    if (cycle) {
      return cycle;
    }
  }
  return undefined;
}
