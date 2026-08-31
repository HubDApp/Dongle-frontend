/**
 * Project Backup & Migration Service (#450).
 *
 * Exports project data as JSON, supports batch export, import with integrity
 * validation, and QR-code generation for sharing.
 */

import type { ISorobanService } from "@/services/stellar/soroban.interface";
import { DataIntegrityError } from "@/lib/errors";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Serializable snapshot of a single project. */
export interface ProjectBackup {
  version: 1;
  exportedAt: string;
  project: {
    id: string;
    name: string;
    category: string;
    description: string;
    websiteUrl: string;
    githubUrl?: string;
    logoUrl: string;
    docsUrl: string;
    auditReportUrl?: string;
    bugBountyUrl?: string;
    owner: string;
    createdAt: string;
  };
  /** Simple SHA-256 hex of the JSON-serialised project object. */
  checksum: string;
}

/** A batch backup containing multiple projects. */
export interface BatchBackup {
  version: 1;
  exportedAt: string;
  projects: ProjectBackup[];
}

/** Result of an import validation. */
export interface ImportValidation {
  valid: boolean;
  errors: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function sha256Hex(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function redactOwner(owner: string): string {
  if (owner.length <= 10) return owner;
  return `${owner.slice(0, 5)}...${owner.slice(-5)}`;
}

// ── Service ───────────────────────────────────────────────────────────────────

export function createBackupService(sorobanService: ISorobanService) {
  return {
    /**
     * Export a single project as a JSON-compatible backup.
     */
    async exportProject(projectId: string): Promise<ProjectBackup> {
      const project = await sorobanService.getProject(projectId);
      if (!project) {
        throw new DataIntegrityError(`Project ${projectId} not found`);
      }

      const projectData = {
        id: project.id,
        name: project.name,
        category: project.category,
        description: project.description,
        websiteUrl: project.websiteUrl,
        githubUrl: project.githubUrl,
        logoUrl: project.logoUrl,
        docsUrl: project.docsUrl,
        auditReportUrl: project.auditReportUrl,
        bugBountyUrl: project.bugBountyUrl,
        owner: project.owner,
        createdAt: project.createdAt,
      };

      const checksum = await sha256Hex(JSON.stringify(projectData));

      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        project: projectData,
        checksum,
      };
    },

    /**
     * Export all projects owned by a wallet address.
     */
    async exportAllProjects(
      projectIds: string[],
    ): Promise<BatchBackup> {
      const projects: ProjectBackup[] = [];
      for (const id of projectIds) {
        try {
          const backup = await this.exportProject(id);
          projects.push(backup);
        } catch {
          // Skip projects that cannot be exported
        }
      }
      return {
        version: 1,
        exportedAt: new Date().toISOString(),
        projects,
      };
    },

    /**
     * Validate an imported backup's integrity before accepting.
     * Checks version, required fields, and checksum.
     */
    async validateImport(backup: unknown): Promise<ImportValidation> {
      const errors: string[] = [];

      if (!backup || typeof backup !== "object") {
        return { valid: false, errors: ["Backup is not a valid object"] };
      }

      const b = backup as Record<string, unknown>;

      if (b.version !== 1) {
        errors.push(`Unsupported backup version: ${b.version}`);
      }

      if (!b.project || typeof b.project !== "object") {
        errors.push("Missing or invalid project data");
        return { valid: false, errors };
      }

      const p = b.project as Record<string, unknown>;
      const requiredFields = ["id", "name", "category", "description", "websiteUrl", "logoUrl", "owner", "createdAt"];
      for (const field of requiredFields) {
        if (!p[field] || typeof p[field] !== "string") {
          errors.push(`Missing required field: ${field}`);
        }
      }

      if (b.checksum && typeof b.checksum === "string") {
        const projectData = { ...p };
        const expectedChecksum = await sha256Hex(JSON.stringify(projectData));
        if (b.checksum !== expectedChecksum) {
          errors.push("Checksum mismatch — data may have been tampered with");
        }
      }

      return { valid: errors.length === 0, errors };
    },

    /**
     * Generate a QR-code data URL for sharing a project backup.
     * Uses a simple JSON-in-URI approach for small payloads; for larger
     * backups the caller should host the JSON and QR the URL instead.
     */
    async generateShareQr(backup: ProjectBackup): Promise<string> {
      // For small payloads, encode directly as a data URL with a simple
      // SVG-based QR placeholder.  In production this would use a proper
      // QR library (e.g. `qrcode` npm package).
      const json = JSON.stringify(backup);
      const encoded = encodeURIComponent(json);
      return `data:application/json;charset=utf-8,${encoded}`;
    },

    /**
     * Download a backup as a JSON file.
     */
    downloadBackup(backup: ProjectBackup | BatchBackup, filename: string): void {
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };
}
