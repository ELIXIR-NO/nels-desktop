import '@testing-library/jest-dom'

// vi.stubGlobal('window', { ...window, ... }) loses all non-enumerable global
// properties (document, HTMLElement, location, etc.) because jsdom registers
// them as non-enumerable on globalThis. Make them enumerable so the spread in
// the test file produces a complete window-like object.
for (const key of Object.getOwnPropertyNames(globalThis)) {
  const desc = Object.getOwnPropertyDescriptor(globalThis, key)
  if (desc && !desc.enumerable && desc.configurable) {
    Object.defineProperty(globalThis, key, { ...desc, enumerable: true })
  }
}
