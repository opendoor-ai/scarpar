import Link from 'next/link'

// 없는 주소로 들어왔을 때 보여주는 화면 (404)
export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl font-bold text-muted-foreground">404</p>
      <h1 className="text-xl font-semibold">페이지를 찾을 수 없습니다</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        주소가 바뀌었거나 삭제된 페이지입니다. 상품이 판매 종료되었을 수도 있어요.
      </p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        처음으로 가기
      </Link>
    </main>
  )
}
