"use client";

/**
 * Interactive API documentation page using Swagger UI
 */

import { useEffect, useRef } from "react";

export default function APIDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Dynamically load Swagger UI
    const loadSwaggerUI = async () => {
      // Load Swagger UI CSS
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css";
      document.head.appendChild(link);

      // Load Swagger UI JS
      const script = document.createElement("script");
      script.src = "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js";
      script.async = true;
      
      script.onload = () => {
        // Initialize Swagger UI
        if (window.SwaggerUIBundle && containerRef.current) {
          window.SwaggerUIBundle({
            url: "/api/openapi",
            dom_id: "#swagger-ui",
            deepLinking: true,
            presets: [
              window.SwaggerUIBundle.presets.apis,
              window.SwaggerUIBundle.SwaggerUIStandalonePreset,
            ],
            layout: "StandaloneLayout",
            tryItOutEnabled: true,
            filter: true,
            syntaxHighlight: {
              activate: true,
              theme: "monokai",
            },
          });
        }
      };

      document.body.appendChild(script);
    };

    loadSwaggerUI();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">API Documentation</h1>
          <p className="mt-1 text-sm text-gray-600">
            Interactive REST API documentation with live examples
          </p>
        </div>
      </header>

      <div id="swagger-ui" ref={containerRef} />
    </div>
  );
}

declare global {
  interface Window {
    SwaggerUIBundle: any;
  }
}
