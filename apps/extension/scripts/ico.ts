/** Packs PNG images into one .ico file, which every current browser and crawler reads. */
export const ico = (images: Array<[size: number, png: Buffer]>) => {
  const header = Buffer.alloc(6 + 16 * images.length)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)
  let offset = header.length
  images.forEach(([size, png], index) => {
    const entry = 6 + 16 * index
    header.writeUInt8(size, entry)
    header.writeUInt8(size, entry + 1)
    header.writeUInt16LE(1, entry + 4) // colour planes
    header.writeUInt16LE(32, entry + 6) // bits per pixel
    header.writeUInt32LE(png.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += png.length
  })
  return Buffer.concat([header, ...images.map(([, png]) => png)])
}
