const mapProto = Map.prototype as Map<unknown, unknown> & {
  getOrInsert?: (key: unknown, defaultValue: unknown) => unknown
  getOrInsertComputed?: (key: unknown, callbackFn: (key: unknown) => unknown) => unknown
}

if (typeof mapProto.getOrInsert !== 'function') {
  Object.defineProperty(Map.prototype, 'getOrInsert', {
    value(this: Map<unknown, unknown>, key: unknown, defaultValue: unknown) {
      if (this.has(key)) {
        return this.get(key)
      }
      this.set(key, defaultValue)
      return defaultValue
    },
    writable: true,
    configurable: true
  })
}

if (typeof mapProto.getOrInsertComputed !== 'function') {
  Object.defineProperty(Map.prototype, 'getOrInsertComputed', {
    value(this: Map<unknown, unknown>, key: unknown, callbackFn: (key: unknown) => unknown) {
      if (this.has(key)) {
        return this.get(key)
      }
      const value = callbackFn(key)
      this.set(key, value)
      return value
    },
    writable: true,
    configurable: true
  })
}

const math = Math as typeof Math & { sumPrecise?: (values: Iterable<number>) => number }

if (typeof math.sumPrecise !== 'function') {
  math.sumPrecise = (numbers) => {
    let total = 0
    for (const value of numbers) {
      total += value
    }
    return total
  }
}
