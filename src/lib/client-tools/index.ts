import { registry } from "./registry";
import {
  jiraGetIssueTool,
  jiraSearchIssuesTool,
  jiraCreateIssueTool,
  jiraUpdateIssueTool,
  jiraAddCommentTool,
  jiraListProjectsTool,
  jiraAssignIssueTool,
} from "./providers/jira";
import {
  confluenceSearchTool,
  confluenceGetPageTool,
  confluenceCreatePageTool,
  confluenceUpdatePageTool,
  confluenceListSpacesTool,
} from "./providers/confluence";
import {
  gitlabListMRsTool,
  gitlabGetFileTool,
  gitlabCreateMRTool,
  gitlabGetIssueTool,
  gitlabCreateIssueTool,
  gitlabListBranchesTool,
  gitlabCreateBranchTool,
  gitlabGetCommitTool,
} from "./providers/gitlab";
import { genericHTTPTool } from "./providers/generic";

// Register all client-side tools
registry.registerTool(genericHTTPTool);

registry.registerTool(jiraGetIssueTool);
registry.registerTool(jiraSearchIssuesTool);
registry.registerTool(jiraCreateIssueTool);
registry.registerTool(jiraUpdateIssueTool);
registry.registerTool(jiraAddCommentTool);
registry.registerTool(jiraListProjectsTool);
registry.registerTool(jiraAssignIssueTool);

registry.registerTool(confluenceSearchTool);
registry.registerTool(confluenceGetPageTool);
registry.registerTool(confluenceCreatePageTool);
registry.registerTool(confluenceUpdatePageTool);
registry.registerTool(confluenceListSpacesTool);

registry.registerTool(gitlabListMRsTool);
registry.registerTool(gitlabGetFileTool);
registry.registerTool(gitlabCreateMRTool);
registry.registerTool(gitlabGetIssueTool);
registry.registerTool(gitlabCreateIssueTool);
registry.registerTool(gitlabListBranchesTool);
registry.registerTool(gitlabCreateBranchTool);
registry.registerTool(gitlabGetCommitTool);

export * from "./types";
export * from "./registry";
export * from "./providers/jira";
export * from "./providers/confluence";
export * from "./providers/gitlab";
export * from "./providers/generic";
