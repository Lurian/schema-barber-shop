import { Diagnostics, throwIfAny } from './diagnostics.ts';
import { type CatalogEntry, type ComponentCatalog, own, type Page, type PropType, pageFunctionName } from './schema.ts';
import { swatchProblems, swatchReference } from './styles.ts';

export function validate(page: Page, catalog: ComponentCatalog): void {
  const errors: string[] = [];

  try {
    pageFunctionName(page.name);
  } catch (error) {
    if (!(error instanceof Diagnostics)) throw error;
    errors.push(...error.messages);
  }

  if (Object.keys(page.elements).length === 0) {
    errors.push('page has no elements');
  }

  if (page.root === '') {
    errors.push('root is empty');
  } else if (!own(page.elements, page.root)) {
    errors.push(`root "${page.root}" does not match an element`);
  }

  validateCatalog(catalog, errors);
  validateStyles(page, catalog, errors);
  validateTree(page, catalog, errors);

  throwIfAny(errors);
}

function validateCatalog(catalog: ComponentCatalog, errors: string[]): void {
  for (const [key, entry] of Object.entries(catalog)) {
    if (entry.name !== key) {
      errors.push(`catalog key "${key}" declares name "${entry.name}"`);
    }
    if (!isIdentifier(entry.name)) {
      errors.push(`catalog component "${entry.name}" is not a JavaScript identifier`);
    }
    if (entry.importPath === '') {
      errors.push(`catalog component "${key}" is missing importPath`);
    }
    for (const [prop, field] of Object.entries(entry.schema)) {
      if (!isIdentifier(prop)) {
        errors.push(`catalog "${key}" prop "${prop}" is not a JavaScript identifier`);
      }
      const problem = unsupportedPropType(field.type);
      if (problem) {
        errors.push(`catalog "${key}" prop "${prop}": ${problem}`);
      }
    }
  }
}

function unsupportedPropType(type: PropType): string | undefined {
  if (Array.isArray(type)) {
    return type.length === 0 ? 'enum has no options' : undefined;
  }
  switch (type) {
    case 'string':
    case 'number':
    case 'boolean':
      return undefined;
    case 'object':
    case 'array':
      return 'object and array props are not emitted by this compiler';
    default:
      return `unsupported prop type "${type}"`;
  }
}

function validateStyles(page: Page, catalog: ComponentCatalog, errors: string[]): void {
  for (const [component, swatches] of Object.entries(page.styles)) {
    if (!own(catalog, component)) {
      errors.push(`styles.${component} styles a component that is not in the catalog`);
    }
    errors.push(...swatchProblems(component, swatches));
  }
}

function validateTree(page: Page, catalog: ComponentCatalog, errors: string[]): void {
  const listedBy = new Map<string, string>();

  for (const [id, element] of Object.entries(page.elements)) {
    const children = element.children ?? [];
    for (const child of children) {
      if (!own(page.elements, child)) {
        errors.push(`element "${id}" lists missing child "${child}"`);
        continue;
      }
      const first = listedBy.get(child);
      if (first !== undefined) {
        errors.push(`element "${child}" is listed more than once (by "${first}" and "${id}")`);
      } else {
        listedBy.set(child, id);
      }
    }

    for (const token of element.style ?? []) {
      const swatch = swatchReference(token);
      if (token.trim() === '') {
        errors.push(`element "${id}" has an empty style token`);
      } else if (swatch !== undefined && own(own(page.styles, element.type) ?? {}, swatch) === undefined) {
        errors.push(`element "${id}" references "$${swatch}", which styles.${element.type} does not define`);
      }
    }

    const entry = own(catalog, element.type);
    if (!entry) {
      errors.push(`element "${id}" has unknown type "${element.type}"`);
      continue;
    }

    if (children.length > 0 && !entry.acceptsChildren) {
      errors.push(`element "${id}" type "${entry.name}" does not accept children`);
    }

    validateProps(id, element.props, entry, errors);
  }

  if (own(page.elements, page.root)) {
    const before = errors.length;
    reportCycles(page, errors);
    reportUnreachable(page, errors);
    if (errors.length === before) {
      reportMissingContexts(page, catalog, errors);
    }
  }
}

function validateProps(
  id: string,
  props: Record<string, unknown> | undefined,
  entry: CatalogEntry,
  errors: string[],
): void {
  for (const [key, value] of Object.entries(props ?? {})) {
    if (key === 'className') {
      errors.push(`element "${id}" sets className; put Tailwind classes in the style array`);
      continue;
    }

    const field = own(entry.schema, key);
    if (!field) {
      errors.push(`element "${id}" prop "${key}" is not in the ${entry.name} schema`);
      continue;
    }

    if (Array.isArray(field.type)) {
      if (typeof value !== 'string') {
        errors.push(`element "${id}" prop "${key}" must be a string`);
      } else if (!field.type.includes(value)) {
        errors.push(`element "${id}" prop "${key}" must be one of ${field.type.join(', ')}, got "${value}"`);
      }
    } else if (['string', 'number', 'boolean'].includes(field.type) && typeof value !== field.type) {
      errors.push(`element "${id}" prop "${key}" must be a ${field.type}`);
    }
  }
}

/**
 * Every `requiresContext` must be satisfied by a `providesContext` on some ancestor. Runs only on a
 * tree already known to be acyclic and fully reachable.
 */
function reportMissingContexts(page: Page, catalog: ComponentCatalog, errors: string[]): void {
  const providers = new Map<string, string[]>();
  for (const entry of Object.values(catalog)) {
    for (const context of entry.providesContext) {
      providers.set(context, [...(providers.get(context) ?? []), entry.name]);
    }
  }

  const provided: string[] = [];

  function walk(id: string): void {
    const element = own(page.elements, id);
    const entry = element && own(catalog, element.type);
    if (!element || !entry) {
      return;
    }

    const required = entry.requiresContext;
    if (required !== undefined && !provided.includes(required)) {
      const candidates = providers.get(required);
      const hint = candidates
        ? `Components that provide "${required}": ${candidates.join(', ')}.`
        : `No component in the catalog provides "${required}".`;
      errors.push(
        `element "${id}" (${entry.name}) requires context "${required}" but no ancestor provides it. ${hint}`,
      );
    }

    provided.push(...entry.providesContext);
    for (const child of element.children ?? []) {
      walk(child);
    }
    provided.length -= entry.providesContext.length;
  }

  walk(page.root);
}

function reportCycles(page: Page, errors: string[]): void {
  const state = new Map<string, 'visiting' | 'done'>();

  function visit(id: string, path: string[]): void {
    const current = state.get(id);
    if (current === 'visiting') {
      errors.push(`cycle in elements: ${[...path, id].join(' -> ')}`);
      return;
    }
    if (current === 'done') {
      return;
    }

    state.set(id, 'visiting');
    for (const child of own(page.elements, id)?.children ?? []) {
      if (own(page.elements, child)) {
        visit(child, [...path, id]);
      }
    }
    state.set(id, 'done');
  }

  for (const id of Object.keys(page.elements)) {
    visit(id, []);
  }
}

function reportUnreachable(page: Page, errors: string[]): void {
  const seen = new Set<string>();
  const pending = [page.root];
  while (pending.length > 0) {
    const id = pending.pop() as string;
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    for (const child of own(page.elements, id)?.children ?? []) {
      if (own(page.elements, child)) {
        pending.push(child);
      }
    }
  }

  for (const id of Object.keys(page.elements)) {
    if (!seen.has(id)) {
      errors.push(`element "${id}" is not reachable from root "${page.root}"`);
    }
  }
}

function isIdentifier(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}
