'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

import { cn } from '@/lib/utils'
import { getIcon } from '@/lib/icon-map'
import { MODULES } from '@/modules/registry'
import type { NavItem } from '@/lib/modules'
import { OrgSwitcher } from '@/components/admin/org-switcher'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface SidebarOrg {
  id: string
  name: string
}

interface SidebarProps {
  org: SidebarOrg
  orgs: SidebarOrg[]
  nav: { main: NavItem[]; core: NavItem[] }
  collapsed?: boolean
  onNavigate?: () => void
  onToggleCollapse?: () => void
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

interface NavGroupData {
  key: string
  label: string
  items: NavItem[]
}

/** Groups the flat main-nav list by moduleKey, preserving first-seen (= MODULE_LIST canonical) order. */
function groupMainNav(main: NavItem[]): NavGroupData[] {
  const groups: NavGroupData[] = []
  const indexByKey = new Map<string, number>()

  for (const item of main) {
    const key = item.moduleKey ?? item.href
    let index = indexByKey.get(key)
    if (index === undefined) {
      index = groups.length
      indexByKey.set(key, index)
      groups.push({
        key,
        label: item.moduleKey ? MODULES[item.moduleKey].name : item.label,
        items: [],
      })
    }
    groups[index].items.push(item)
  }

  return groups
}

export function Sidebar({ org, orgs, nav, collapsed = false, onNavigate, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()

  const dashboard = nav.core.find((item) => item.href === '/admin')
  const bottomCore = nav.core.filter((item) => item.href !== '/admin')
  const groups = React.useMemo(() => groupMainNav(nav.main), [nav.main])

  return (
    <div className="flex h-full w-full min-w-0 flex-col bg-sidebar">
      <div
        className={cn(
          'flex h-12 shrink-0 items-center border-b border-sidebar-border px-4',
          collapsed && 'justify-center px-0',
        )}
      >
        {collapsed ? (
          <span className="flex size-7 items-center justify-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground">
            S
          </span>
        ) : (
          <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground">
            Scarpar
          </span>
        )}
      </div>

      <div className="border-b border-sidebar-border p-2">
        <OrgSwitcher orgs={orgs} activeOrgId={org.id} activeOrgName={org.name} collapsed={collapsed} />
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {dashboard && (
          <NavLink
            item={dashboard}
            active={isActive(pathname, dashboard.href)}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        )}

        <div className="mt-4 flex flex-col gap-0.5">
          {groups.map((group) =>
            group.items.length > 1 ? (
              <NavGroup
                key={group.key}
                label={group.label}
                items={group.items}
                pathname={pathname}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ) : (
              <NavLink
                key={group.items[0].href}
                item={group.items[0]}
                active={isActive(pathname, group.items[0].href)}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ),
          )}
        </div>

        <div className="mt-4 flex flex-col gap-0.5 border-t border-sidebar-border pt-3">
          {bottomCore.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </nav>

      {onToggleCollapse && (
        <div className="border-t border-sidebar-border p-2">
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed && <span>메뉴 접기</span>}
          </button>
        </div>
      )}
    </div>
  )
}

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
  indent,
}: {
  item: NavItem
  active: boolean
  collapsed?: boolean
  onNavigate?: () => void
  indent?: boolean
}) {
  const Icon = getIcon(item.icon)

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground',
        collapsed && 'justify-center px-0',
        indent && !collapsed && 'pl-8',
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}

function NavGroup({
  label,
  items,
  pathname,
  collapsed,
  onNavigate,
}: {
  label: string
  items: NavItem[]
  pathname: string
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const hasActiveChild = items.some((item) => isActive(pathname, item.href))
  const [open, setOpen] = React.useState(true)

  if (collapsed) {
    return (
      <>
        {items.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            collapsed
            onNavigate={onNavigate}
          />
        ))}
      </>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase transition-colors hover:text-sidebar-foreground',
          hasActiveChild && 'text-sidebar-foreground',
        )}
      >
        {label}
        <ChevronDown className={cn('size-3.5 transition-transform', !open && '-rotate-90')} />
      </button>
      {open && (
        <div className="flex flex-col gap-0.5">
          {items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(pathname, item.href)}
              collapsed={false}
              onNavigate={onNavigate}
              indent
            />
          ))}
        </div>
      )}
    </div>
  )
}
