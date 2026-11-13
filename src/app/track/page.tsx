import { t } from "@/lib/i18n"
import { TrackSearchForm } from "@/modules/delivery/components/track-search-form"

export const dynamic = "force-dynamic"

export default function TrackPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold">{t("track_order")}</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          배송 번호나 송장 번호를 입력하면 배송 상태를 볼 수 있습니다.
        </p>
      </div>
      <TrackSearchForm />
    </main>
  )
}
