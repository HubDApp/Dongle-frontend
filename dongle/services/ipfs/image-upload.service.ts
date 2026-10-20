"use client";

export interface IpfsImageUploadResponse {
  url: string;
  cid: string;
}

export function uploadImageToIpfs(
  file: File,
  onProgress: (progress: number) => void,
): Promise<IpfsImageUploadResponse> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const body = new FormData();
    body.append("file", file);

    request.open("POST", "/api/ipfs/upload");
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onerror = () => reject(new Error("Image upload failed. Check your connection and try again."));
    request.onabort = () => reject(new Error("Image upload was cancelled."));
    request.onload = () => {
      const response = request.response as (IpfsImageUploadResponse & { error?: string }) | null;
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(response?.error ?? "Image upload failed."));
        return;
      }
      if (!response?.url || !response.cid) {
        reject(new Error("The IPFS service returned an invalid response."));
        return;
      }
      onProgress(100);
      resolve(response);
    };
    request.send(body);
  });
}
