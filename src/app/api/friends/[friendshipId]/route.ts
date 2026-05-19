import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/db"

// PATCH /api/friends/:id — accept or reject
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ friendshipId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { friendshipId } = await params
  const { action } = await req.json()

  if (action !== "accept" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } })
  if (!friendship) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (friendship.addresseeId !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const updated = await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: action === "accept" ? "ACCEPTED" : "REJECTED" },
  })

  return NextResponse.json(updated)
}

// DELETE /api/friends/:id — remove friend or cancel request
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ friendshipId: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { friendshipId } = await params

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } })
  if (!friendship) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const userId = session.user.id
  if (friendship.requesterId !== userId && friendship.addresseeId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  await prisma.friendship.delete({ where: { id: friendshipId } })
  return NextResponse.json({ ok: true })
}
