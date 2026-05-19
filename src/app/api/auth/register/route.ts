import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/db"

const schema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, underscores"),
  email: z.string().email(),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, email, password } = schema.parse(body)

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    })
    if (existing?.email === email) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 })
    }
    if (existing?.username === username) {
      return NextResponse.json({ error: "Username already taken" }, { status: 409 })
    }

    const hash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({
      data: { username, email, password: hash, name: username },
    })

    return NextResponse.json({ id: user.id, username: user.username }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      const issue = err.issues?.[0]
      return NextResponse.json({ error: issue?.message ?? err.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Registration failed" }, { status: 500 })
  }
}
