import { Diagnostics, throwIfAny } from './diagnostics.ts';

/** Swatch name -> Tailwind classes and `$swatch` tokens. */
export type Swatches = Record<string, string[]>;
/** Component type -> its swatches. */
export type Styles = Record<string, Swatches>;

type Element = {
  type: string;
  props?: Record<string, unknown>;
  children?: string[];
  style?: string[];
};

type PageMetadata = {
  title?: { default?: string };
  description?: string;
};

export type Page = {
  name: string;
  root: string;
  elements: Record<string, Element>;
  metadata?: PageMetadata;
  styles: Styles;
};

export type PropType = string | string[];

export type CatalogEntry = {
  name: string;
  importPath: string;
  acceptsChildren: boolean;
  schema: Record<string, { type: PropType }>;
  /** Context names this component provides to its descendants. */
  providesContext: string[];
  /** Context name some ancestor must provide for this component to render. */
  requiresContext?: string;
};

export type ComponentCatalog = Record<string, CatalogEntry>;

const PAGE_FIELDS = ['name', 'root', 'elements', 'metadata', 'styles'];
const ELEMENT_FIELDS = ['type', 'props', 'children', 'style'];

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

/** Own-property lookup, so a key such as `constructor` never resolves to a prototype member. */
export function own<T>(record: Record<string, T>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? record[key] : undefined;
}

export function parsePage(source: string): Page {
  const file = 'page.json';
  const value = parseJson(file, source);
  if (!isRecord(value)) {
    throw Diagnostics.one(`${file}: expected an object`);
  }

  const errors: string[] = [];
  rejectUnknownFields(file, value, PAGE_FIELDS, errors);

  const name = expectString(value, 'name', file, errors) ?? '';
  const root = expectString(value, 'root', file, errors) ?? '';

  const elements: Record<string, Element> = {};
  if (!isRecord(value.elements)) {
    errors.push(`${file}: "elements" must be an object`);
  } else {
    for (const [id, raw] of Object.entries(value.elements)) {
      const element = parseElement(`${file}: element "${id}"`, raw, errors);
      if (element) {
        elements[id] = element;
      }
    }
  }

  const page: Page = {
    name,
    root,
    elements,
    styles: parseStyles(file, value.styles, errors),
  };
  if (value.metadata !== undefined) {
    page.metadata = parseMetadata(file, value.metadata, errors);
  }

  throwIfAny(errors);
  return page;
}

export function parseCatalog(source: string): ComponentCatalog {
  const file = 'components/catalog.json';
  const value = parseJson(file, source);
  if (!isRecord(value)) {
    throw Diagnostics.one(`${file}: expected an object`);
  }

  const errors: string[] = [];
  const catalog: ComponentCatalog = {};
  for (const [key, raw] of Object.entries(value)) {
    const entry = parseCatalogEntry(`${file}: "${key}"`, raw, errors);
    if (entry) {
      catalog[key] = entry;
    }
  }

  throwIfAny(errors);
  return catalog;
}

export function pageFunctionName(name: string): string {
  const pascal = name
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word.length > 0)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join('');

  if (!/^[A-Za-z]/.test(pascal)) {
    throw Diagnostics.one(`page name "${name}" cannot become a React component name`);
  }
  return pascal.endsWith('Page') ? pascal : `${pascal}Page`;
}

function parseElement(where: string, raw: unknown, errors: string[]): Element | undefined {
  if (!isRecord(raw)) {
    errors.push(`${where} must be an object`);
    return undefined;
  }
  rejectUnknownFields(where, raw, ELEMENT_FIELDS, errors);

  const type = expectString(raw, 'type', where, errors);
  if (type === undefined) {
    return undefined;
  }

  const element: Element = { type };
  if (raw.props !== undefined) {
    if (isRecord(raw.props)) {
      element.props = raw.props;
    } else {
      errors.push(`${where}: "props" must be an object`);
    }
  }
  if (raw.children !== undefined) {
    if (isStringArray(raw.children)) {
      element.children = raw.children;
    } else {
      errors.push(`${where}: "children" must be a list of element ids`);
    }
  }
  if (raw.style !== undefined) {
    if (isStringArray(raw.style)) {
      element.style = raw.style;
    } else {
      errors.push(`${where}: "style" must be a list of strings`);
    }
  }
  return element;
}

function parseMetadata(file: string, raw: unknown, errors: string[]): PageMetadata {
  const where = `${file}: "metadata"`;
  if (!isRecord(raw)) {
    errors.push(`${where} must be an object`);
    return {};
  }
  rejectUnknownFields(where, raw, ['title', 'description'], errors);

  const metadata: PageMetadata = {};
  if (raw.title !== undefined) {
    if (isRecord(raw.title)) {
      rejectUnknownFields(`${where}.title`, raw.title, ['default'], errors);
      const title = expectOptionalString(raw.title, 'default', `${where}.title`, errors);
      metadata.title = title === undefined ? {} : { default: title };
    } else {
      errors.push(`${where}.title must be an object`);
    }
  }
  const description = expectOptionalString(raw, 'description', where, errors);
  if (description !== undefined) {
    metadata.description = description;
  }
  return metadata;
}

function parseStyles(file: string, raw: unknown, errors: string[]): Styles {
  if (raw === undefined) {
    return {};
  }
  if (!isRecord(raw)) {
    errors.push(`${file}: "styles" must map component types to swatches`);
    return {};
  }

  const styles: Styles = {};
  for (const [component, swatches] of Object.entries(raw)) {
    if (!isRecord(swatches)) {
      errors.push(`${file}: styles.${component} must map swatch names to class lists`);
      continue;
    }
    styles[component] = {};
    for (const [name, tokens] of Object.entries(swatches)) {
      if (isStringArray(tokens)) {
        styles[component][name] = tokens;
      } else {
        errors.push(`${file}: styles.${component}.${name} must be a list of strings`);
      }
    }
  }
  return styles;
}

function parseCatalogEntry(where: string, raw: unknown, errors: string[]): CatalogEntry | undefined {
  if (!isRecord(raw)) {
    errors.push(`${where} must be an object`);
    return undefined;
  }

  const name = expectString(raw, 'name', where, errors);
  const importPath = expectString(raw, 'importPath', where, errors);
  if (raw.acceptsChildren !== undefined && typeof raw.acceptsChildren !== 'boolean') {
    errors.push(`${where}: "acceptsChildren" must be a boolean`);
  }
  expectOptionalString(raw, 'guideline', where, errors);
  const requiresContext = expectOptionalString(raw, 'requiresContext', where, errors);

  let providesContext: string[] = [];
  if (typeof raw.providesContext === 'string') {
    providesContext = [raw.providesContext];
  } else if (isStringArray(raw.providesContext)) {
    providesContext = raw.providesContext;
  } else if (raw.providesContext !== undefined) {
    errors.push(`${where}: "providesContext" must be a context name or a list of them`);
  }

  const schema: CatalogEntry['schema'] = {};
  if (raw.schema !== undefined && !isRecord(raw.schema)) {
    errors.push(`${where}: "schema" must be an object`);
  } else {
    for (const [prop, field] of Object.entries(raw.schema ?? {})) {
      if (isRecord(field) && (typeof field.type === 'string' || isStringArray(field.type))) {
        schema[prop] = { type: field.type };
      } else {
        errors.push(`${where}: prop "${prop}" must declare a type, a type name or a list of options`);
      }
    }
  }

  if (name === undefined || importPath === undefined) {
    return undefined;
  }
  const entry: CatalogEntry = {
    name,
    importPath,
    acceptsChildren: raw.acceptsChildren === true,
    schema,
    providesContext,
  };
  if (requiresContext !== undefined) {
    entry.requiresContext = requiresContext;
  }
  return entry;
}

function parseJson(file: string, source: string): unknown {
  try {
    return JSON.parse(source);
  } catch (error) {
    throw Diagnostics.one(`${file}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function rejectUnknownFields(where: string, value: Json, known: string[], errors: string[]): void {
  for (const key of Object.keys(value)) {
    if (!known.includes(key)) {
      errors.push(`${where}: unknown field "${key}"`);
    }
  }
}

function expectString(value: Json, key: string, where: string, errors: string[]): string | undefined {
  if (typeof value[key] === 'string') {
    return value[key];
  }
  errors.push(`${where}: "${key}" must be a string`);
  return undefined;
}

function expectOptionalString(value: Json, key: string, where: string, errors: string[]): string | undefined {
  if (value[key] === undefined) {
    return undefined;
  }
  return expectString(value, key, where, errors);
}
