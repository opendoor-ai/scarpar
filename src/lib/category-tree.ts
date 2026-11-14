// 카테고리 계층(1차·2차…) 도우미. categories.parent_id 로 연결된 트리를 다룹니다.

export interface CategoryNode {
  id: string
  parent_id: string | null
}

/** 자기 자신 + 모든 하위 카테고리 id. 1차를 고르면 2차 상품까지 함께 보이게 할 때 씁니다. */
export function categoryWithDescendants<T extends CategoryNode>(rows: T[], rootId: string): string[] {
  const childrenOf = new Map<string, string[]>()
  for (const r of rows) {
    if (!r.parent_id) continue
    const list = childrenOf.get(r.parent_id) ?? []
    list.push(r.id)
    childrenOf.set(r.parent_id, list)
  }
  const result: string[] = []
  const seen = new Set<string>()
  const stack = [rootId]
  while (stack.length > 0) {
    const id = stack.pop() as string
    if (seen.has(id)) continue // 잘못 연결된 순환 방지
    seen.add(id)
    result.push(id)
    stack.push(...(childrenOf.get(id) ?? []))
  }
  return result
}

/** 맨 위(1차) 카테고리 id — 2차를 골랐을 때 그 부모 1차를 찾는 데 씁니다. */
export function rootCategoryId<T extends CategoryNode>(rows: T[], id: string): string {
  const byId = new Map(rows.map((r) => [r.id, r]))
  let current = byId.get(id)
  let guard = 0
  while (current?.parent_id && byId.has(current.parent_id) && guard < 10) {
    current = byId.get(current.parent_id)
    guard++
  }
  return current?.id ?? id
}
