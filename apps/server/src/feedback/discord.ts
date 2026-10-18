export interface Feedback {
  text: string
  /** Where the sender wants an answer, when they gave one. */
  email?: string
  version: string
  language: string
}

/** Pine, as on the TabCabin logo. */
const PINE = 0x1f4a3a

/** The webhook message: the text as the body, the version and language in the footer. */
function discordMessage(feedback: Feedback, at: number) {
  return {
    username: 'TabCabin',
    // Someone could write @everyone into the form; Discord must not ping anybody for it.
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: 'Feedback',
        description: feedback.text,
        color: PINE,
        fields: feedback.email ? [{ name: 'Reply to', value: feedback.email }] : [],
        footer: { text: `TabCabin ${feedback.version} · ${feedback.language}` },
        timestamp: new Date(at).toISOString(),
      },
    ],
  }
}

/** Posts the feedback to the Discord webhook; resolves to whether Discord took it. */
export async function sendToDiscord(
  webhook: string,
  feedback: Feedback,
  at: number,
  fetcher: typeof fetch,
): Promise<boolean> {
  try {
    const res = await fetcher(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordMessage(feedback, at)),
      signal: AbortSignal.timeout(10_000),
    })
    return res.ok
  } catch {
    return false
  }
}
