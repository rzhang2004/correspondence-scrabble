"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

interface FriendUser {
  id: string
  username: string
  image?: string
  friendshipId?: string
}

interface FriendsData {
  friends: FriendUser[]
  pendingReceived: FriendUser[]
  pendingSent: FriendUser[]
}

export default function FriendsPage() {
  const router = useRouter()
  const [data, setData] = useState<FriendsData>({ friends: [], pendingReceived: [], pendingSent: [] })
  const [search, setSearch] = useState("")
  const [searchError, setSearchError] = useState("")
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch("/api/friends")
    if (res.ok) setData(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  async function sendRequest() {
    if (!search.trim()) return
    setLoading(true)
    setSearchError("")
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: search.trim() }),
    })
    const json = await res.json()
    if (!res.ok) {
      setSearchError(json.error)
    } else {
      setSearch("")
      load()
    }
    setLoading(false)
  }

  async function respondToRequest(friendshipId: string, action: "accept" | "reject") {
    await fetch(`/api/friends/${friendshipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    })
    load()
  }

  async function removeFriend(friendshipId: string) {
    await fetch(`/api/friends/${friendshipId}`, { method: "DELETE" })
    load()
  }

  async function challengeFriend(friendId: string) {
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opponentId: friendId }),
    })
    if (res.ok) {
      const game = await res.json()
      router.push(`/games/${game.id}`)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-stone-800">Friends</h1>

      {/* Add friend */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-stone-700">Add a friend</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendRequest()}
            placeholder="Username"
            className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={sendRequest}
            disabled={loading || !search.trim()}
            className="bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
        {searchError && <p className="text-red-600 text-sm">{searchError}</p>}
      </div>

      {/* Pending received */}
      {data.pendingReceived.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
            Requests received ({data.pendingReceived.length})
          </h2>
          <div className="space-y-2">
            {data.pendingReceived.map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <span className="font-medium text-stone-700">{u.username}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => respondToRequest(u.friendshipId!, "accept")}
                    className="bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respondToRequest(u.friendshipId!, "reject")}
                    className="bg-stone-200 text-stone-600 text-xs px-3 py-1.5 rounded-lg hover:bg-stone-300 transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pending sent */}
      {data.pendingSent.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
            Requests sent
          </h2>
          <div className="space-y-2">
            {data.pendingSent.map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-white border border-stone-200 rounded-xl px-4 py-3">
                <span className="font-medium text-stone-600">{u.username}</span>
                <span className="text-xs text-stone-400">Pending…</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Friends list */}
      <section>
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">
          Friends ({data.friends.length})
        </h2>
        {data.friends.length === 0 ? (
          <p className="text-stone-400 text-sm">No friends yet. Add some above!</p>
        ) : (
          <div className="space-y-2">
            {data.friends.map((u) => (
              <div key={u.id} className="flex items-center justify-between bg-white border border-stone-200 rounded-xl px-4 py-3">
                <span className="font-medium text-stone-700">{u.username}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => challengeFriend(u.id)}
                    className="bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
                  >
                    Challenge
                  </button>
                  <button
                    onClick={() => removeFriend(u.friendshipId!)}
                    className="text-stone-400 hover:text-red-500 text-xs px-2 py-1.5 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
