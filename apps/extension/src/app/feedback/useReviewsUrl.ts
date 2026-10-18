import { useEffect, useState } from 'react'
import { storeReviewsUrl } from '@/feedback/reviews'

/** The store's review page (undefined while loading, null for a copy not from the store). */
export function useReviewsUrl(): string | null | undefined {
  const [url, setUrl] = useState<string | null>()
  useEffect(() => {
    let cancelled = false
    void storeReviewsUrl().then((value) => !cancelled && setUrl(value))
    return () => {
      cancelled = true
    }
  }, [])
  return url
}
