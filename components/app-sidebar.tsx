"use client"

import {
  Building2,
  Home,
  FileText,
  Users,
  UserCircle,
  DollarSign,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  TrendingUp,
  Settings,
  UserPlus,
  CalendarClock,
  Bell,
  Upload,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useUser } from "@/hooks/use-user"
import { RoleBadge } from "@/components/role-badge"
import { useAgency } from "@/hooks/use-agency"

const mainMenuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "agente", "contador"],
  },
  {
    title: "Contratos",
    url: "/contratos",
    icon: FileText,
    roles: ["admin", "agente", "contador"],
    highlight: true,
  },
  {
    title: "Aumentos",
    url: "/aumentos",
    icon: CalendarClock,
    roles: ["admin", "agente", "contador"],
    highlight: true,
  },
]

const entitiesMenuItems = [
  {
    title: "Propiedades",
    url: "/propiedades",
    icon: Home,
    roles: ["admin", "agente", "contador"],
  },
  {
    title: "Arrendatarios",
    url: "/arrendatarios",
    icon: Users,
    roles: ["admin", "agente", "contador"],
  },
  {
    title: "Arrendadores",
    url: "/arrendadores",
    icon: UserCircle,
    roles: ["admin", "agente", "contador"],
  },
  {
    title: "Garantes",
    url: "/garantes",
    icon: ShieldCheck,
    roles: ["admin", "agente", "contador"],
  },
]

const financeMenuItems = [
  {
    title: "Cuotas y Pagos",
    url: "/pagos",
    icon: DollarSign,
    roles: ["admin", "agente", "contador"],
  },
  {
    title: "Índices",
    url: "/indices",
    icon: TrendingUp,
    roles: ["admin", "agente"],
  },
  {
    title: "Alertas",
    url: "/alertas",
    icon: Bell,
    roles: ["admin", "agente", "contador"],
  },
]

const adminMenuItems = [
  {
    title: "Usuarios",
    url: "/usuarios",
    icon: Users,
    roles: ["admin"],
  },
  {
    title: "Agentes",
    url: "/agentes",
    icon: UserPlus,
    roles: ["admin"],
  },
  {
    title: "Importar CSV",
    url: "/importar",
    icon: Upload,
    roles: ["admin"],
  },
  {
    title: "Configuración",
    url: "/configuracion",
    icon: Settings,
    roles: ["admin"],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useUser()
  const { agency } = useAgency()
  const supabase = createBrowserClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const filterByRole = (items: typeof mainMenuItems) =>
    items.filter((item) => !profile || item.roles.includes(profile.role))

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold truncate max-w-36">{agency?.name || "Mi Inmobiliaria"}</span>
            <span className="text-xs text-muted-foreground">Gestión de Contratos</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(mainMenuItems).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url || pathname.startsWith(item.url + "/")}
                    className={item.highlight ? "font-semibold" : ""}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Entidades</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(entitiesMenuItems).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url || pathname.startsWith(item.url + "/")}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Finanzas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByRole(financeMenuItems).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url || pathname.startsWith(item.url + "/")}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filterByRole(adminMenuItems).length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Administración</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filterByRole(adminMenuItems).map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url || pathname.startsWith(item.url + "/")}
                      >
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        {profile && (
          <div className="border-t px-4 py-3">
            <div className="mb-2 space-y-1">
              <p className="text-sm font-medium truncate">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
              <RoleBadge role={profile.role} />
            </div>
          </div>
        )}
        <div className="p-4">
          <Button onClick={handleLogout} variant="outline" className="w-full bg-transparent" size="sm">
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
