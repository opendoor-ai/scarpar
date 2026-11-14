import { redirect } from "next/navigation";

// 사이트 첫 화면 → 통합 제품 검색 (관리자는 /admin)
export default function Home() {
  redirect("/products");
}
