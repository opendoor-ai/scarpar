import type { DeliveryCourier } from '@/types/db'
import { ConfigRequiredError } from './types'
import type { CourierAdapter } from './types'
import { manualAdapter } from './manual'

export * from './types'

const ADAPTERS: Partial<Record<DeliveryCourier, CourierAdapter>> = {
  manual: manualAdapter,
}

/**
 * 택배사 연동. 지금은 모든 택배사를 직접 입력(송장번호 수기 입력) 방식으로 처리해요.
 * 자동 연동이 없는 택배사는 같은 오류 형식으로 안내합니다.
 */
export function getAdapter(courier: DeliveryCourier): CourierAdapter {
  const adapter = ADAPTERS[courier]
  if (!adapter) {
    throw new ConfigRequiredError(`${courier} isn't supported yet — use manual tracking instead`)
  }
  return adapter
}
