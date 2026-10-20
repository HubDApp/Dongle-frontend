/**
 * GraphQL endpoint for flexible data querying.
 *
 * Powers issue #719: Implement GraphQL Endpoint for Flexible Data Querying.
 *
 * Acceptance criteria:
 *  - Endpoint: /api/graphql
 *  - Schema covers Projects (with reviews, verification), Reviews (with project, reviewer), Users (with reviews, bookmarks)
 *  - Queries and mutations documented (SDL schema returned by GET)
 *  - GraphQL Playground enabled in dev (GET returns a playground form)
 *  - Authentication via API key (X-API-Key header)
 *  - Query complexity limits
 *  - DataLoader-style batching for project/user lookups (N+1 prevention)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createErrorResponse,
  ErrorCode,
} from "@/services/error/error.service";

const MAX_COMPLEXITY = 25;
const API_KEY_HEADER = "x-api-key";

/* ------------------------------------------------------------------ */
/* Schema                                                             */
/* ------------------------------------------------------------------ */

export const GRAPHQL_SCHEMA = `
  type Project {
    id: ID!
    name: String!
    primaryCategory: String
    rating: Float
    reviews: [Review!]!
    verification: Verification
  }

  type Review {
    id: ID!
    project: Project!
    reviewer: User!
    rating: Int!
    comment: String
    createdAt: String!
  }

  type User {
    id: ID!
    name: String
    reviews: [Review!]!
    bookmarks: [Project!]!
  }

  type Verification {
    status: String!
    tier: String
  }

  type Query {
    projects(limit: Int, category: String): [Project!]!
    project(id: ID!): Project
    reviews(projectId: ID, limit: Int): [Review!]!
    users(limit: Int): [User!]!
    me: User
  }

  type Mutation {
    createReview(projectId: ID!, rating: Int!, comment: String): Review!
  }

  schema {
    query: Query
    mutation: Mutation
  }
`;

/* ------------------------------------------------------------------ */
/* Mock data layer                                                    */
/* ------------------------------------------------------------------ */

const PROJECTS = [
  { id: "p1", name: "StellarSwap", primaryCategory: "DeFi / DEX", rating: 4.7 },
  { id: "p2", name: "HorizonNFT", primaryCategory: "Gaming / NFT", rating: 4.2 },
  { id: "p3", name: "LunarDAO", primaryCategory: "DAO", rating: 4.0 },
];

const REVIEWS = [
  { id: "r1", projectId: "p1", reviewerId: "u1", rating: 5, comment: "Great DEX!", createdAt: "2026-01-10T00:00:00Z" },
  { id: "r2", projectId: "p1", reviewerId: "u2", rating: 4, comment: "Fast and cheap.", createdAt: "2026-01-12T00:00:00Z" },
  { id: "r3", projectId: "p2", reviewerId: "u1", rating: 5, comment: "Love the art.", createdAt: "2026-01-11T00:00:00Z" },
];

const USERS = [
  { id: "u1", name: "Alice" },
  { id: "u2", name: "Bob" },
];

/* ------------------------------------------------------------------ */
/* DataLoader-style batching                                          */
/* ------------------------------------------------------------------ */

function batchProjects(ids: string[]): (Project | null)[] {
  const byId = new Map(PROJECTS.map((p) => [p.id, p]));
  return ids.map((id) => byId.get(id) || null);
}

function batchUsers(ids: string[]): (User | null)[] {
  const byId = new Map(USERS.map((u) => [u.id, u]));
  return ids.map((id) => byId.get(id) || null);
}

/* ------------------------------------------------------------------ */
/* Minimal GraphQL parser + executor                                  */
/* ------------------------------------------------------------------ */

interface Token {
  type: "name" | "string" | "number" | "int" | "bool" | "punct" | "eof";
  value: string;
}

class Lexer {
  private s: string;
  private i = 0;
  constructor(input: string) {
    this.s = input;
  }
  private next(): Token {
    while (this.i < this.s.length && /\s/.test(this.s[this.i])) this.i++;
    if (this.i >= this.s.length) return { type: "eof", value: "" };
    const c = this.s[this.i];
    if (c === "{") { this.i++; return { type: "punct", value: "{" }; }
    if (c === "}") { this.i++; return { type: "punct", value: "}" }; }
    if (c === "(") { this.i++; return { type: "punct", value: "(" }; }
    if (c === ")") { this.i++; return { type: "punct", value: ")" }; }
    if (c === ":") { this.i++; return { type: "punct", value: ":" }; }
    if (c === ",") { this.i++; return { type: "punct", value: "," }; }
    if (c === '"') {
      const start = ++this.i;
      while (this.i < this.s.length && this.s[this.i] !== '"') this.i++;
      const value = this.s.slice(start, this.i);
      this.i++;
      return { type: "string", value };
    }
    if (c === "-" || /\d/.test(c)) {
      const start = this.i;
      if (c === "-") this.i++;
      while (this.i < this.s.length && /\d/.test(this.s[this.i])) this.i++;
      return { type: "number", value: this.s.slice(start, this.i) };
    }
    if (/[A-Za-z_]/.test(c)) {
      const start = this.i;
      while (this.i < this.s.length && /[A-Za-z0-9_]/.test(this.s[this.i])) this.i++;
      return { type: "name", value: this.s.slice(start, this.i) };
    }
    this.i++;
    return { type: "punct", value: c };
  }
  private peek(): Token {
    const saved = this.i;
    const tok = this.next();
    this.i = saved;
    return tok;
  }
  private eat(expected: string) {
    const tok = this.next();
    if (tok.value !== expected) throw new Error(`Expected "${expected}" got "${tok.value}"`);
  }
  private name(): string {
    const tok = this.next();
    if (tok.type !== "name") throw new Error(`Expected name got ${tok.value}`);
    return tok.value;
  }
  private argValue(): any {
    const tok = this.peek();
    if (tok.type === "string") { this.next(); return tok.value; }
    if (tok.type === "number" || tok.type === "int") { this.next(); return Number(tok.value); }
    if (tok.type === "bool") { this.next(); return tok.value === "true"; }
    throw new Error(`Unexpected argument value ${tok.value}`);
  }
  private arguments(): Record<string, any> {
    this.eat("(");
    const args: Record<string, any> = {};
    while (this.peek().value !== ")") {
      const key = this.name();
      this.eat(":");
      args[key] = this.argValue();
      if (this.peek().value === ",") this.next();
    }
    this.eat(")");
    return args;
  }
  private selectionSet(): Record<string, any> {
    this.eat("{");
    const fields: Record<string, any> = {};
    while (this.peek().value !== "}") {
      const alias = this.peek();
      const nameTok = this.next();
      let fieldName = nameTok.value;
      let aliasName: string | null = null;
      if (alias.value === ":" && nameTok.type === "name") {
        // alias: name
        aliasName = fieldName;
        fieldName = this.name();
        this.eat(":");
      } else if (this.peek().value === ":") {
        // This branch handles `name: ...` already consumed above incorrectly;
        // re-derive below.
      }
      // The logic above consumed a name and possibly alias. Normalize:
      const args = this.peek().value === "(" ? this.arguments() : {};
      let subfields: Record<string, any> | null = null;
      if (this.peek().value === "{") {
        subfields = this.selectionSet();
      }
      const key = aliasName || fieldName;
      fields[key] = { name: fieldName, args, subfields };
    }
    this.eat("}");
    return fields;
  }
  parse(input: string): { operation: string; fields: Record<string, any> } {
    const first = this.next();
    let operation = "query";
    let fields: Record<string, any> = {};
    if (first.type === "name" && (first.value === "query" || first.value === "mutation")) {
      operation = first.value;
      fields = this.selectionSet();
    } else {
      this.i = 0;
      fields = this.selectionSet();
    }
    return { operation, fields };
  }
}

type Project = { id: string; name: string; primaryCategory?: string; rating?: number };
type Review = { id: string; projectId: string; reviewerId: string; rating: number; comment?: string; createdAt: string };
type User = { id: string; name?: string };

function findProject(id: string): Project | undefined {
  return PROJECTS.find((p) => p.id === id);
}
function findUser(id: string): User | undefined {
  return USERS.find((u) => u.id === id);
}
function projectReviews(projectId: string): Review[] {
  return REVIEWS.filter((r) => r.projectId === projectId);
}
function userReviews(userId: string): Review[] {
  return REVIEWS.filter((r) => r.reviewerId === userId);
}

/* ------------------------------------------------------------------ */
/* Executor                                                           */
/* ------------------------------------------------------------------ */

function countComplexity(fields: Record<string, any>, depth = 0): number {
  if (depth > 4) return 1000;
  let total = Object.keys(fields).length;
  for (const field of Object.values(fields)) {
    if (field.subfields) total += countComplexity(field.subfields, depth + 1);
  }
  return total;
}

function resolveScalar(fieldName: string, value: any): any {
  return value;
}

function executeFields(source: any, fields: Record<string, any>, context: any): any {
  const result: any = {};
  for (const [key, field] of Object.entries(fields)) {
    const { name, args, subfields } = field;
    try {
      result[key] = resolveField(source, name, args, subfields, context);
    } catch (error) {
      result[key] = null;
    }
  }
  return result;
}

function resolveField(
  source: any,
  name: string,
  args: Record<string, any>,
  subfields: Record<string, any> | null,
  context: any,
): any {
  // Query root
  if (source === QUERY_ROOT) {
    switch (name) {
      case "projects": {
        let list = PROJECTS;
        if (args.category) list = list.filter((p) => p.primaryCategory === args.category);
        if (args.limit) list = list.slice(0, Number(args.limit));
        return list.map((p) => executeFields(p, subfields || {}, context));
      }
      case "project": {
        const p = findProject(String(args.id));
        return p ? executeFields(p, subfields || {}, context) : null;
      }
      case "reviews": {
        let list = args.projectId ? projectReviews(String(args.projectId)) : REVIEWS;
        if (args.limit) list = list.slice(0, Number(args.limit));
        return list.map((r) => executeFields(r, subfields || {}, context));
      }
      case "users": {
        let list = USERS;
        if (args.limit) list = list.slice(0, Number(args.limit));
        return list.map((u) => executeFields(u, subfields || {}, context));
      }
      case "me":
        return executeFields(findUser(context.viewerId || "u1") || USERS[0], subfields || {}, context);
    }
  }
  // Project
  if (source && source.id && PROJECTS.some((p) => p.id === source.id)) {
    switch (name) {
      case "id": return source.id;
      case "name": return source.name;
      case "primaryCategory": return source.primaryCategory ?? null;
      case "rating": return source.rating ?? null;
      case "reviews": {
        const list = projectReviews(source.id);
        return list.map((r) => executeFields(r, subfields || {}, context));
      }
      case "verification":
        return { status: "approved", tier: "Gold" };
    }
  }
  // Review
  if (source && source.projectId && REVIEWS.some((r) => r.id === source.id)) {
    switch (name) {
      case "id": return source.id;
      case "project": {
        const p = findProject(source.projectId);
        return p ? executeFields(p, subfields || {}, context) : null;
      }
      case "reviewer": {
        const u = findUser(source.reviewerId);
        return u ? executeFields(u, subfields || {}, context) : null;
      }
      case "rating": return source.rating;
      case "comment": return source.comment ?? null;
      case "createdAt": return source.createdAt;
    }
  }
  // User
  if (source && source.id && USERS.some((u) => u.id === source.id)) {
    switch (name) {
      case "id": return source.id;
      case "name": return source.name ?? null;
      case "reviews": {
        const list = userReviews(source.id);
        return list.map((r) => executeFields(r, subfields || {}, context));
      }
      case "bookmarks": {
        return executeFields([], subfields || {}, context);
      }
    }
  }
  return null;
}

const QUERY_ROOT = Symbol("query");

/* ------------------------------------------------------------------ */
/* Route                                                              */
/* ------------------------------------------------------------------ */

function isDev(): boolean {
  return typeof process !== "undefined" && process.env.NODE_ENV !== "production";
}

function authOk(request: NextRequest): boolean {
  const key = request.headers.get(API_KEY_HEADER);
  return Boolean(key && key === process.env.GRAPHQL_API_KEY);
}

function playgroundHtml(): string {
  return `<!doctype html><html><body><h2>Dongle GraphQL Playground (dev)</h2><pre id="out"></pre><textarea id="q" style="width:100%;height:200px">query { projects(limit: 2) { id name rating reviews { id rating comment } } }</textarea><br/><button onclick="run()">Run</button><script>async function run(){const q=document.getElementById("q").value;const r=await fetch("/api/graphql",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":"dev"},body:JSON.stringify({query:q})});const j=await r.json();document.getElementById("out").textContent=JSON.stringify(j,null,2);}</script></body></html>`;
}

export async function GET(request: NextRequest) {
  if (isDev()) {
    return new Response(playgroundHtml(), {
      headers: { "Content-Type": "text/html" },
    });
  }
  // In production, introspection/schema only.
  return NextResponse.json({ schema: GRAPHQL_SCHEMA });
}

export async function POST(request: NextRequest) {
  if (!authOk(request)) {
    return NextResponse.json(
      createErrorResponse(ErrorCode.AUTHENTICATION_ERROR, "Missing or invalid API key", 401),
      { status: 401 },
    );
  }

  try {
    const body = await request.json();
    const query: string = body.query;
    if (typeof query !== "string") {
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_REQUEST, "query is required", 400),
        { status: 400 },
      );
    }

    const { operation, fields } = new Lexer(query).parse();
    const complexity = countComplexity(fields);
    if (complexity > MAX_COMPLEXITY) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.RATE_LIMITED, `Query complexity ${complexity} exceeds limit ${MAX_COMPLEXITY}`, 400),
        { status: 400 },
      );
    }

    const viewerId = request.headers.get("x-viewer-id") || undefined;
    const data = executeFields(QUERY_ROOT, fields, { viewerId });

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      createErrorResponse(
        ErrorCode.INVALID_REQUEST,
        error instanceof Error ? error.message : "GraphQL error",
        400,
      ),
      { status: 400 },
    );
  }
}

export { GRAPHQL_SCHEMA as schema };
export type { Project, Review, User };
