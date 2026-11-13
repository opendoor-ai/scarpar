'use client'

import * as React from 'react'
import Link from 'next/link'
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react'

import { cn } from '@/lib/utils'
import { setActiveOrg } from '@/lib/actions/set-org'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface SwitcherOrg {
  id: string
  name: string
}

interface OrgSwitcherProps {
  orgs: SwitcherOrg[]
  activeOrgId: string
  activeOrgName: string
  collapsed?: boolean
}

export function OrgSwitcher({ orgs, activeOrgId, activeOrgName, collapsed = false }: OrgSwitcherProps) {
  const [isPending, startTransition] = React.useTransition()

  function handleSelect(orgId: string) {
    if (orgId === activeOrgId || isPending) return
    startTransition(() => {
      // setActiveOrg redirects to /admin on success — nothing to await here.
      void setActiveOrg(orgId)
    })
  }

  const monogram = activeOrgName.trim().slice(0, 2).toUpperCase() || 'SC'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-sidebar-accent disabled:opacity-60',
          collapsed && 'justify-center px-0',
        )}
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-semibold text-primary-foreground">
          {monogram}
        </span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-[13px] font-medium text-sidebar-foreground">
              {activeOrgName}
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel className="text-2xs font-medium tracking-wide text-muted-foreground uppercase">
          조직(공급사)
        </DropdownMenuLabel>
        {orgs.map((org) => (
          <DropdownMenuItem key={org.id} onSelect={() => handleSelect(org.id)} className="gap-2">
            <Building2 className="size-4" />
            <span className="flex-1 truncate">{org.name}</span>
            {org.id === activeOrgId && <Check className="size-4 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding" className="gap-2">
            <Plus className="size-4" />
            새 조직 만들기
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
