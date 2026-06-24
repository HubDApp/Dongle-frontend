"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Submit() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/projects/new");
  }, [router]);

  return null;
}