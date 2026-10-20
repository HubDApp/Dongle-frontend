import { NextRequest } from "next/server";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function hasValidImageSignature(type: string, bytes: Uint8Array): boolean {
  if (type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (type === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((byte, index) => bytes[index] === byte);
  }
  if (type === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  if (type === "image/gif") {
    const signature = String.fromCharCode(...bytes.slice(0, 6));
    return signature === "GIF87a" || signature === "GIF89a";
  }
  return false;
}

export async function POST(request: NextRequest): Promise<Response> {
  const pinataJwt = process.env.PINATA_JWT;
  if (!pinataJwt) {
    return Response.json(
      { error: "Image uploads are not configured. Set PINATA_JWT on the server." },
      { status: 503 },
    );
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch (error) {
    console.error("[api/ipfs/upload] Failed to parse multipart upload", error);
    return Response.json({ error: "Invalid image upload request." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return Response.json({ error: "An image file is required." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return Response.json(
      { error: "Choose a JPEG, PNG, WebP, or GIF image." },
      { status: 415 },
    );
  }
  if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
    return Response.json(
      { error: "Images must be smaller than 10 MB." },
      { status: 413 },
    );
  }

  const signatureBytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!hasValidImageSignature(file.type, signatureBytes)) {
    return Response.json({ error: "The uploaded file is not a valid image." }, { status: 415 });
  }

  const uploadBody = new FormData();
  uploadBody.append("file", file, "project-image");

  let pinataResponse: Response;
  try {
    pinataResponse = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: { Authorization: `Bearer ${pinataJwt}` },
      body: uploadBody,
    });
  } catch (error) {
    console.error("[api/ipfs/upload] Pinata request failed", error);
    return Response.json({ error: "Could not reach the IPFS upload service." }, { status: 502 });
  }

  if (!pinataResponse.ok) {
    console.error("[api/ipfs/upload] Pinata rejected upload", {
      status: pinataResponse.status,
    });
    return Response.json({ error: "The IPFS upload service rejected the image." }, { status: 502 });
  }

  let result: { IpfsHash?: unknown };
  try {
    result = await pinataResponse.json() as { IpfsHash?: unknown };
  } catch (error) {
    console.error("[api/ipfs/upload] Invalid response from Pinata", error);
    return Response.json({ error: "The IPFS upload service returned an invalid response." }, { status: 502 });
  }

  if (typeof result.IpfsHash !== "string" || !/^[a-zA-Z0-9]+$/.test(result.IpfsHash)) {
    console.error("[api/ipfs/upload] Pinata response is missing a valid CID");
    return Response.json({ error: "The IPFS upload service returned an invalid CID." }, { status: 502 });
  }

  return Response.json({
    cid: result.IpfsHash,
    url: `ipfs://${result.IpfsHash}`,
  });
}
