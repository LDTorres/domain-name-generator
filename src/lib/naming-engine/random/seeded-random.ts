function xmur3(value: string): () => number {
  let hash = 1779033703 ^ value.length;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    return (hash ^= hash >>> 16) >>> 0;
  };
}

export class SeededRandom {
  private state: number;

  constructor(seed: string) {
    this.state = xmur3(seed)();
  }

  next(): number {
    this.state += 0x6d2b79f5;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  integer(maxExclusive: number): number {
    if (maxExclusive <= 0) return 0;
    return Math.floor(this.next() * maxExclusive);
  }

  pick<T>(items: readonly T[]): T {
    const item = items[this.integer(items.length)];
    if (item === undefined) throw new Error("Cannot pick from an empty collection.");
    return item;
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }

  shuffle<T>(items: readonly T[]): T[] {
    const output = [...items];
    for (let index = output.length - 1; index > 0; index -= 1) {
      const replacement = this.integer(index + 1);
      [output[index], output[replacement]] = [output[replacement]!, output[index]!];
    }
    return output;
  }
}
