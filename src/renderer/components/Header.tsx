import React from 'react'
import { Check, CircleHelp, LogOut, Monitor, Moon, Sun, Palette, Settings } from 'lucide-react'
import nelsLogo from '@/assets/nels-logo.png'
import { useTheme, type Theme } from '../contexts/ThemeContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface HeaderProps {
  name: string
  onLogout(): void
  onOpenSettings(): void
  onOpenHowItWorks(): void
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

const themeOptions: { value: Theme; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function Header({ name, onLogout, onOpenSettings, onOpenHowItWorks }: HeaderProps) {
  const { theme, setTheme } = useTheme()

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-5">
      <img
        src={nelsLogo}
        alt="NeLS"
        className="h-7 w-auto select-none"
        draggable={false}
      />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenHowItWorks}
          title="How it works"
          aria-label="How it works"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <CircleHelp className="h-4 w-4" aria-hidden />
        </Button>

        <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs font-medium">{initials(name)}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col">
              <span className="text-sm font-medium">{name}</span>
              <span className="text-xs text-muted-foreground">Signed in</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onOpenSettings} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" aria-hidden />
            Settings
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette className="mr-2 h-4 w-4" aria-hidden />
              Appearance
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {themeOptions.map(({ value, label, icon: Icon }) => (
                  <DropdownMenuItem
                    key={value}
                    onClick={() => setTheme(value)}
                    className="cursor-pointer"
                  >
                    <Icon className="mr-2 h-4 w-4" aria-hidden />
                    <span className="flex-1">{label}</span>
                    {theme === value && <Check className="h-4 w-4 text-muted-foreground" aria-hidden />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onLogout} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" aria-hidden />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  )
}
