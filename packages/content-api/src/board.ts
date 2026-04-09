import type { BoardMember } from './types.js'

export function sortBoard(members: BoardMember[]): BoardMember[] {
  return [...members].sort((a, b) => a.order - b.order)
}
