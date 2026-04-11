import { describe, it, expect } from 'vitest'
import { sortBoard } from './board.js'
import type { BoardMember } from './types.js'

function mkMember(over: Partial<BoardMember>): BoardMember {
  return {
    slug: over.slug ?? 'test',
    name: over.name ?? 'Test Member',
    role: over.role ?? 'Member',
    order: over.order ?? 99,
    ...over,
  }
}

describe('sortBoard', () => {
  it('sorts members by numeric order ascending', () => {
    const members = [
      mkMember({ slug: 'secretary', order: 3 }),
      mkMember({ slug: 'president', order: 1 }),
      mkMember({ slug: 'vp', order: 2 }),
    ]
    expect(sortBoard(members).map((m) => m.slug)).toEqual(['president', 'vp', 'secretary'])
  })

  it('puts unordered members (default 99) at the end', () => {
    const members = [mkMember({ slug: 'unset' }), mkMember({ slug: 'leader', order: 1 })]
    expect(sortBoard(members).map((m) => m.slug)).toEqual(['leader', 'unset'])
  })

  it('does not mutate the input', () => {
    const members = [mkMember({ slug: 'b', order: 2 }), mkMember({ slug: 'a', order: 1 })]
    sortBoard(members)
    expect(members[0].slug).toBe('b')
  })
})
