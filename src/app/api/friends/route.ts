import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

// GET /api/friends — list friends and pending requests
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = session.user.id

  const [accepted, pendingReceived, pendingSent] = await Promise.all([
    prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: { id: true, username: true, image: true } },
        addressee: { select: { id: true, username: true, image: true } },
      },
    }),
    prisma.friendship.findMany({
      where: { addresseeId: userId, status: "PENDING" },
      include: {
        requester: { select: { id: true, username: true, image: true } },
      },
    }),
    prisma.friendship.findMany({
      where: { requesterId: userId, status: "PENDING" },
      include: {
        addressee: { select: { id: true, username: true, image: true } },
      },
    }),
  ])

  const friends = accepted.map((f) =>
    f.requesterId === userId ? f.addressee : f.requester
  )

  return NextResponse.json({
    friends,
    pendingReceived: pendingReceived.map((f) => ({ ...f.requester, friendshipId: f.id })),
    pendingSent: pendingSent.map((f) => ({ ...f.addressee, friendshipId: f.id })),
  })
}

// POST /api/friends — send friend request by username
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { username } = await req.json()
  if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 })

  const userId = session.user.id

  const target = await prisma.user.findUnique({ where: { username } })
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })
  if (target.id === userId) return NextResponse.json({ error: "Cannot friend yourself" }, { status: 400 })

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: userId, addresseeId: target.id },
        { requesterId: target.id, addresseeId: userId },
      ],
    },
  })
  if (existing) return NextResponse.json({ error: "Request already exists" }, { status: 409 })

  const friendship = await prisma.friendship.create({
    data: { requesterId: userId, addresseeId: target.id },
  })

  return NextResponse.json(friendship, { status: 201 })
}
