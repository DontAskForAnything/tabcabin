declare module 'gifenc' {
  type Palette = number[][]
  type Format = 'rgb565' | 'rgb444' | 'rgba4444'
  const gifenc: {
    quantize(
      rgba: Uint8Array | Uint8ClampedArray,
      maxColors: number,
      options?: { format?: Format },
    ): Palette
    applyPalette(
      rgba: Uint8Array | Uint8ClampedArray,
      palette: Palette,
      format?: Format,
    ): Uint8Array
    GIFEncoder(): {
      writeFrame(
        index: Uint8Array,
        width: number,
        height: number,
        options?: { palette?: Palette; delay?: number; repeat?: number },
      ): void
      finish(): void
      bytes(): Uint8Array
    }
  }
  export default gifenc
}
