/** Every problem found in one pass, reported together so a page can be fixed in one edit. */
export class Diagnostics extends Error {
  readonly messages: string[];

  constructor(messages: string[]) {
    super(messages.join('\n'));
    this.name = 'Diagnostics';
    this.messages = messages;
  }

  static one(message: string): Diagnostics {
    return new Diagnostics([message]);
  }
}

export function throwIfAny(messages: string[]): void {
  if (messages.length > 0) {
    throw new Diagnostics(messages);
  }
}
