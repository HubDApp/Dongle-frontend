/**
 * DataAccessRegistry
 *
 * Central registry that wires concrete repository implementations to the
 * interfaces consumed by services and UI components.
 *
 * Default bindings use mock (in-memory / localStorage) implementations so
 * the app works out-of-the-box during local development and testing.
 *
 * Swap a real backend implementation by calling the corresponding setter
 * once at app initialisation (e.g. in a provider or app entry point):
 *
 *   import { registry } from "@/services/data-access/registry";
 *   import { ApiProjectRepository } from "@/services/data-access/ApiProjectRepository";
 *
 *   registry.setProjectRepository(new ApiProjectRepository());
 */

import { IProjectRepository } from "./IProjectRepository.service";
import { IReviewRepository } from "./IReviewRepository.service";
import { IUpdateRepository } from "./IUpdateRepository.service";
import { MockProjectRepository } from "./MockProjectRepository.service";
import { MockReviewRepository } from "./MockReviewRepository.service";
import { MockUpdateRepository } from "./MockUpdateRepository.service";

class DataAccessRegistry {
  private _projects: IProjectRepository = new MockProjectRepository();
  private _reviews: IReviewRepository = new MockReviewRepository();
  private _updates: IUpdateRepository = new MockUpdateRepository();

  // ── Getters ───────────────────────────────────────────────────────────────

  get projects(): IProjectRepository {
    return this._projects;
  }

  get reviews(): IReviewRepository {
    return this._reviews;
  }

  get updates(): IUpdateRepository {
    return this._updates;
  }

  // ── Setters (for production / test overrides) ─────────────────────────────

  setProjectRepository(repo: IProjectRepository): void {
    this._projects = repo;
  }

  setReviewRepository(repo: IReviewRepository): void {
    this._reviews = repo;
  }

  setUpdateRepository(repo: IUpdateRepository): void {
    this._updates = repo;
  }
}

/** Singleton registry — import this anywhere you need data access. */
export const registry = new DataAccessRegistry();
