"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Plug,
  Target,
  FolderOpen,
  Clock,
  Settings,
  Network,
  Wrench,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Connections",
    url: "/connections",
    icon: Plug,
  },
  {
    title: "Matching",
    url: "/matching",
    icon: Target,
  },
  {
    title: "Paths",
    url: "/paths",
    icon: FolderOpen,
  },
  {
    title: "Scheduling",
    url: "/scheduling",
    icon: Clock,
  },
  {
    title: "Behavior",
    url: "/behavior",
    icon: Settings,
  },
  {
    title: "Network",
    url: "/network",
    icon: Network,
  },
  {
    title: "Advanced",
    url: "/advanced",
    icon: Wrench,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Target className="h-4 w-4" />
          </div>
          <span className="font-semibold">CrossSeed UI</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
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
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <p className="text-xs text-muted-foreground">
          CrossSeed UI v1.0.0
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
