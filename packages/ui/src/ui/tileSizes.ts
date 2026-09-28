/* Sizes shared by letter tiles and favicons. */

export type TileSize = 'xs' | 'sm' | 'md' | 'lg'

export const tileSizes: Record<TileSize, string> = {
  xs: 'size-6 rounded-md text-[11px]',
  sm: 'size-7 rounded-lg text-[12px]',
  md: 'size-9 rounded-[10px] text-[14px]',
  lg: 'size-10 rounded-[11px] text-[15px]',
}

export const tileImageSizes: Record<TileSize, string> = {
  xs: 'size-3.5',
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-[22px]',
}
