export const NAVIGATION_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/about-me", label: "About Me" },
  { href: "/overview", label: "Overview" },
  {
    href: "/fighter-jets",
    label: "Fighter Jets",
    assets: ["/Models/jet-test-transformed.glb"],
    environmentPreset: "apartment",
  },
  {
    href: "/radar-display",
    label: "Radar Display",
    assets: ["/Models/rmu-transformed.glb"],
  },
  {
    href: "/build-integration",
    label: "Build Integration",
    assets: ["/Models/senior-transformed.glb"],
  },
  {
    href: "/satellite",
    label: "Satellite Systems",
    assets: ["/Models/orbital-space-satellite-transformed.glb"],
  },
  {
    href: "/diy-pcb-etcher",
    label: "DIY PCB Etcher",
    assets: ["/Models/pcb-shaker-v2.glb"],
  },
  {
    href: "/skate-analysis",
    label: "Skate Analysis",
    assets: [
      "/Models/skate.glb",
      "/Models/skate-shoe.glb",
      "/Models/boardGraphics.jpg",
    ],
  },
  {
    href: "/car-project",
    label: "Car Project",
    assets: ["/Models/caritems-carousel.glb"],
  },
  {
    href: "/photo-vortex",
    label: "Photo Vortex",
    assets: ["/Models/polaroid-layout-transformed.glb"],
  },
  { href: "/recognition", label: "Recognition" },
  {
    href: "/workspace",
    label: "Workspace",
    assets: ["/Models/workdesk-window-transformed.glb"],
  },
  {
    href: "/hobbies",
    label: "Hobbies",
    assets: ["/Models/macbook-transformed.glb"],
  },
  { href: "/journey", label: "Journey" },
  { href: "/contact", label: "Contact" },
] as const;

export function getNavigationIndex(pathname: string) {
  return NAVIGATION_ITEMS.findIndex((item) => item.href === pathname);
}

export function getSceneAssets(pathname: string): readonly string[] {
  const item = NAVIGATION_ITEMS.find((route) => route.href === pathname);
  return item && "assets" in item ? item.assets : [];
}

export function getEnvironmentPreset(pathname: string) {
  const item = NAVIGATION_ITEMS.find((route) => route.href === pathname);
  return item && "environmentPreset" in item
    ? item.environmentPreset
    : undefined;
}
