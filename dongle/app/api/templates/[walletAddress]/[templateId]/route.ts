/**
 * API Route: /api/templates/[walletAddress]/[templateId]
 *
 * PUT    – create or update a user form template
 * DELETE – remove a template
 * GET    – retrieve a single template
 */

import { NextRequest, NextResponse } from "next/server";
import type { FormTemplate } from "@/types/form-template";
import {
  getWalletTemplates,
  isValidWalletAddress,
} from "@/services/form-template/template-store";

function isValidTemplateId(id: string): boolean {
  return /^[\w\-]{1,100}$/.test(id);
}

interface RouteParams {
  walletAddress: string;
  templateId: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<RouteParams> },
): Promise<NextResponse> {
  const { walletAddress, templateId } = await params;

  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }
  if (!isValidTemplateId(templateId)) {
    return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
  }

  const template = getWalletTemplates(walletAddress).get(templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json(template);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<RouteParams> },
): Promise<NextResponse> {
  const { walletAddress, templateId } = await params;

  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }
  if (!isValidTemplateId(templateId)) {
    return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
  }

  let body: FormTemplate;
  try {
    body = (await req.json()) as FormTemplate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Template name is required" }, { status: 400 });
  }
  if (!body.data || typeof body.data !== "object") {
    return NextResponse.json({ error: "Missing or invalid template data" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const existing = getWalletTemplates(walletAddress).get(templateId);
  const stored: FormTemplate = {
    id: templateId,
    name: body.name.trim(),
    description: body.description,
    category: body.category || "general",
    data: body.data,
    isBuiltIn: false,
    walletAddress,
    createdAt: existing?.createdAt ?? body.createdAt ?? now,
    updatedAt: now,
  };

  getWalletTemplates(walletAddress).set(templateId, stored);
  return NextResponse.json(stored, { status: 200 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<RouteParams> },
): Promise<NextResponse> {
  const { walletAddress, templateId } = await params;

  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }
  if (!isValidTemplateId(templateId)) {
    return NextResponse.json({ error: "Invalid template ID" }, { status: 400 });
  }

  const existed = getWalletTemplates(walletAddress).delete(templateId);
  if (!existed) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
