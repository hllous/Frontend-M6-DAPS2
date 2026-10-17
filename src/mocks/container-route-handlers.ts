import { GET as listContainers, POST as createContainer } from "@/app/api/containers/route";
import { GET as getContainer, PATCH as updateContainer } from "@/app/api/containers/[id]/route";
import { POST as completeContainerRepair } from "@/app/api/containers/[id]/complete-repair/route";
import { POST as confirmContainerRelocation } from "@/app/api/containers/[id]/confirm-relocation/route";
import { POST as emptyContainer } from "@/app/api/containers/[id]/empty/route";
import { POST as relocateContainer } from "@/app/api/containers/[id]/relocate/route";
import { POST as removeContainer } from "@/app/api/containers/[id]/remove/route";
import { POST as reportContainerDamage } from "@/app/api/containers/[id]/report-damage/route";
import { POST as reportContainerOverflow } from "@/app/api/containers/[id]/report-overflow/route";
import { POST as startContainerRepair } from "@/app/api/containers/[id]/start-repair/route";
import { GET as listDisposalSites, POST as createDisposalSite } from "@/app/api/disposal-sites/route";
import {
  DELETE as deactivateDisposalSite,
  GET as getDisposalSite,
  PATCH as updateDisposalSite,
} from "@/app/api/disposal-sites/[id]/route";

import { routeHandlers } from "./route-handlers";

const byContainerId = { id: "containerId" };
const byDisposalSiteId = { id: "disposalSiteId" };

/** Catalog reads and Office actions run as `officeCookie`; reporting overflow or damage is a Field crew action and runs as `crewCookie`. */
export function containerRouteHandlers(officeCookie: string, crewCookie: string) {
  return [
    ...routeHandlers(officeCookie, [
      { method: "get", path: "*/api/containers", route: listContainers },
      { method: "get", path: "*/api/containers/:containerId", route: getContainer, params: byContainerId },
      { method: "post", path: "*/api/containers", route: createContainer },
      { method: "patch", path: "*/api/containers/:containerId", route: updateContainer, params: byContainerId },
      { method: "post", path: "*/api/containers/:containerId/start-repair", route: startContainerRepair, params: byContainerId },
      { method: "post", path: "*/api/containers/:containerId/complete-repair", route: completeContainerRepair, params: byContainerId },
      { method: "post", path: "*/api/containers/:containerId/remove", route: removeContainer, params: byContainerId },
      { method: "post", path: "*/api/containers/:containerId/empty", route: emptyContainer, params: byContainerId },
      { method: "post", path: "*/api/containers/:containerId/relocate", route: relocateContainer, params: byContainerId },
      { method: "post", path: "*/api/containers/:containerId/confirm-relocation", route: confirmContainerRelocation, params: byContainerId },
      { method: "get", path: "*/api/disposal-sites", route: listDisposalSites },
      { method: "get", path: "*/api/disposal-sites/:disposalSiteId", route: getDisposalSite, params: byDisposalSiteId },
      { method: "post", path: "*/api/disposal-sites", route: createDisposalSite },
      { method: "patch", path: "*/api/disposal-sites/:disposalSiteId", route: updateDisposalSite, params: byDisposalSiteId },
      { method: "delete", path: "*/api/disposal-sites/:disposalSiteId", route: deactivateDisposalSite, params: byDisposalSiteId },
    ]),
    ...routeHandlers(crewCookie, [
      { method: "post", path: "*/api/containers/:containerId/report-overflow", route: reportContainerOverflow, params: byContainerId },
      { method: "post", path: "*/api/containers/:containerId/report-damage", route: reportContainerDamage, params: byContainerId },
    ]),
  ];
}
