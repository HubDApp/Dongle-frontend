import { GET as getTagSuggestions } from "./suggest/route";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
	return getTagSuggestions(request);
}