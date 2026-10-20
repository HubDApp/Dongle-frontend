import { Project } from "./project";

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  timestamp: string; // ISO string
  updatedBy: string; // wallet address
  action: "create" | "update" | "restore";
  changes: FieldChange[];
  snapshot: Partial<Project>;
}
