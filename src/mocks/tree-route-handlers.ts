import { GET as listTrees, POST as createTree } from "@/app/api/trees/route";
import { DELETE as deleteTree, GET as getTree, PATCH as updateTree } from "@/app/api/trees/[id]/route";
import { GET as listTreeSurveys, POST as createTreeSurvey } from "@/app/api/trees/[id]/surveys/route";
import { GET as getTreeSurvey } from "@/app/api/trees/[id]/surveys/[surveyId]/route";
import { GET as listTreeInterventions, POST as createTreeIntervention } from "@/app/api/tree-interventions/route";
import { GET as getTreeIntervention } from "@/app/api/tree-interventions/[id]/route";
import { POST as submitTreeIntervention } from "@/app/api/tree-interventions/[id]/submit-for-authorization/route";
import { POST as authorizeTreeIntervention } from "@/app/api/tree-interventions/[id]/authorize/route";
import { POST as rejectTreeIntervention } from "@/app/api/tree-interventions/[id]/reject/route";
import { POST as assignTreeInterventionService } from "@/app/api/tree-interventions/[id]/assign-service/route";
import { GET as listGreenSpaces, POST as createGreenSpace } from "@/app/api/green-spaces/route";
import { DELETE as deleteGreenSpace, GET as getGreenSpace, PATCH as updateGreenSpace } from "@/app/api/green-spaces/[id]/route";
import { GET as listGreenPoints, POST as createGreenPoint } from "@/app/api/green-points/route";
import { DELETE as deleteGreenPoint, GET as getGreenPoint, PATCH as updateGreenPoint } from "@/app/api/green-points/[id]/route";

import { routeHandlers } from "./route-handlers";

const byTreeId = { id: "treeId" };
const byInterventionId = { id: "interventionId" };
const byGreenSpaceId = { id: "greenSpaceId" };
const byGreenPointId = { id: "greenPointId" };

/** Office reads and actions run as `officeCookie`; registering a tree survey is a Field crew action and runs as `crewCookie`. */
export function treeRouteHandlers(officeCookie: string, crewCookie: string) {
  return [
    ...routeHandlers(officeCookie, [
      { method: "get", path: "*/api/trees", route: listTrees },
      { method: "get", path: "*/api/trees/:treeId", route: getTree, params: byTreeId },
      { method: "post", path: "*/api/trees", route: createTree },
      { method: "patch", path: "*/api/trees/:treeId", route: updateTree, params: byTreeId },
      { method: "delete", path: "*/api/trees/:treeId", route: deleteTree, params: byTreeId },
      { method: "get", path: "*/api/trees/:treeId/surveys", route: listTreeSurveys, params: byTreeId },
      { method: "get", path: "*/api/trees/:treeId/surveys/:surveyId", route: getTreeSurvey, params: { id: "treeId", surveyId: "surveyId" } },
      { method: "get", path: "*/api/tree-interventions", route: listTreeInterventions },
      { method: "get", path: "*/api/tree-interventions/:interventionId", route: getTreeIntervention, params: byInterventionId },
      { method: "post", path: "*/api/tree-interventions", route: createTreeIntervention },
      { method: "post", path: "*/api/tree-interventions/:interventionId/submit-for-authorization", route: submitTreeIntervention, params: byInterventionId },
      { method: "post", path: "*/api/tree-interventions/:interventionId/authorize", route: authorizeTreeIntervention, params: byInterventionId },
      { method: "post", path: "*/api/tree-interventions/:interventionId/reject", route: rejectTreeIntervention, params: byInterventionId },
      { method: "post", path: "*/api/tree-interventions/:interventionId/assign-service", route: assignTreeInterventionService, params: byInterventionId },
      { method: "get", path: "*/api/green-spaces", route: listGreenSpaces },
      { method: "get", path: "*/api/green-spaces/:greenSpaceId", route: getGreenSpace, params: byGreenSpaceId },
      { method: "post", path: "*/api/green-spaces", route: createGreenSpace },
      { method: "patch", path: "*/api/green-spaces/:greenSpaceId", route: updateGreenSpace, params: byGreenSpaceId },
      { method: "delete", path: "*/api/green-spaces/:greenSpaceId", route: deleteGreenSpace, params: byGreenSpaceId },
      { method: "get", path: "*/api/green-points", route: listGreenPoints },
      { method: "get", path: "*/api/green-points/:greenPointId", route: getGreenPoint, params: byGreenPointId },
      { method: "post", path: "*/api/green-points", route: createGreenPoint },
      { method: "patch", path: "*/api/green-points/:greenPointId", route: updateGreenPoint, params: byGreenPointId },
      { method: "delete", path: "*/api/green-points/:greenPointId", route: deleteGreenPoint, params: byGreenPointId },
    ]),
    ...routeHandlers(crewCookie, [
      { method: "post", path: "*/api/trees/:treeId/surveys", route: createTreeSurvey, params: byTreeId },
    ]),
  ];
}
