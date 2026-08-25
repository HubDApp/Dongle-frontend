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

export type { IProjectRepository } from "./IProjectRepository.service";
export type { IReviewRepository } from "./IReviewRepository.service";
export type { IUpdateRepository } from "./IUpdateRepository.service";
export { MockProjectRepository } from "./MockProjectRepository.service";
export { MockReviewRepository } from "./MockReviewRepository.service";
export { MockUpdateRepository } from "./MockUpdateRepository.service";
export { registry } from "./registry.service";
export {
  CURRENT_SCHEMA_VERSION,
  stamp,
  migrateRecord,
  migrateRecordArray,
} from "./migration.service";
export type { VersionedRecord, MigrationResult } from "./migration.service";
