import { getImage } from 'astro:assets'
import logoShot from '../../../../docs/promo/02-logo.jpg'

/** The film's poster: its logo shot as a WebP with a fingerprinted name (cached for good). */
export const poster = await getImage({ src: logoShot, format: 'webp' })
