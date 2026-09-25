/** A plain page for the sign-in window when it cannot go back to the extension. */
export const messagePage = (title: string, text: string) =>
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><body style="font:16px/1.5 system-ui,sans-serif;max-width:420px;margin:15vh auto;padding:0 24px;color:#1c1d22"><h1 style="font-size:20px">${title}</h1><p>${text}</p></body>`
