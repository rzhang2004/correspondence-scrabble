import { Resend } from "resend"

let resend: Resend | null = null

function getResend(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY)
  return resend
}

const from = () => process.env.RESEND_FROM ?? "Scrabble <noreply@example.com>"
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export async function sendTurnNotification({
  toEmail,
  toName,
  opponentName,
  gameId,
}: {
  toEmail: string
  toName: string
  opponentName: string
  gameId: string
}) {
  if (!process.env.RESEND_API_KEY) return

  await getResend().emails.send({
    from: from(),
    to: toEmail,
    subject: `It's your turn against ${opponentName}!`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#166534">Your Scrabble turn</h2>
        <p>Hi ${toName},</p>
        <p><strong>${opponentName}</strong> just played their turn. It's your move!</p>
        <a href="${appUrl()}/games/${gameId}"
           style="display:inline-block;background:#166534;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
          Play your turn
        </a>
        <p style="color:#6b7280;font-size:14px">
          Correspondence Scrabble &mdash; play at your own pace
        </p>
      </div>
    `,
  })
}

export async function sendGameInvite({
  toEmail,
  toName,
  fromName,
  inviteId,
}: {
  toEmail: string
  toName: string
  fromName: string
  inviteId: string
}) {
  if (!process.env.RESEND_API_KEY) return

  await getResend().emails.send({
    from: from(),
    to: toEmail,
    subject: `${fromName} challenged you to Scrabble!`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#166534">Scrabble challenge!</h2>
        <p>Hi ${toName},</p>
        <p><strong>${fromName}</strong> wants to play Scrabble with you.</p>
        <a href="${appUrl()}/invites/${inviteId}"
           style="display:inline-block;background:#166534;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
          Accept the challenge
        </a>
      </div>
    `,
  })
}
