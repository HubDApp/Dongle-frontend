/**
 * @module services/data-access
 *
 * Public surface of the data-access layer.
 *
 * - Interfaces:   IProjectRepository, IReviewRepository, IUpdateRepository
 * - Mock impls:   MockProjectRepository, MockReviewRepository, MockUpdateRepository
 * - Registry:     registry (singleton DataAccessRegistry)
 * - Migration:    stamp, migrateRecord, migrateRecordArray, CURRENT_SCHEMA_VERSION
 */

export type { IProjectRepository } from "./IProjectRepository";
export type { IReviewRepository } from "./IReviewRepository";
export type { IUpdateRepository } from "./IUpdateRepository";
export { MockProjectRepository } from "./MockProjectRepository";
export { MockReviewRepository } from "./MockReviewRepository";
export { MockUpdateRepository } from "./MockUpdateRepository";
export { registry } from "./registry";
export {
  CURRENT_SCHEMA_VERSION,
  stamp,
  migrateRecord,
  migrateRecordArray,
} from "./migration";
export type { VersionedRecord, MigrationResult } from "./migration";
