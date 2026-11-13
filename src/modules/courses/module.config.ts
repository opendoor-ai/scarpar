import type { ModuleDef } from '@/modules/types'

export const config: ModuleDef = {
  key: 'courses',
  name: '강의',
  description: '온라인 강의, 수업, 수강생 관리',
  nav: [{ label: '강의', href: '/admin/courses', icon: 'GraduationCap' }],
  dashboardWidgets: ['enrollments-recent'],
}
