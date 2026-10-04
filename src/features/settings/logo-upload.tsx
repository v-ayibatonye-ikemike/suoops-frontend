"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import Image from "next/image";
import { useState } from "react";

import { apiClient } from "@/api/client";
import type { components } from "@/api/types";
import { Button } from "@/components/ui/button";

type CurrentUser = components["schemas"]["UserOut"] & {
  storefront_cover_url?: string | null;
};

type BrandingImageKind = "logo" | "storefront-cover";

const BRANDING_IMAGE_CONFIG = {
  logo: {
    field: "logo_url" as const,
    endpoint: "/users/me/logo",
    label: "Logo",
    description: "Shown on your invoices, receipts, and storefront",
    recommendation: "Square image, minimum 200x200px",
    previewClass: "h-24 w-24 rounded-xl p-2",
    imageClass: "object-contain",
    sizes: "96px",
  },
  "storefront-cover": {
    field: "storefront_cover_url" as const,
    endpoint: "/users/me/storefront-cover",
    label: "Storefront cover",
    description: "Shown as the wide landscape image at the top of your storefront",
    recommendation: "Landscape image, ideally 1600x600px",
    previewClass: "aspect-[8/3] w-full max-w-xl rounded-lg",
    imageClass: "object-cover",
    sizes: "(max-width: 640px) 100vw, 576px",
  },
};

const getErrorMessage = (err: unknown, fallback: string): string => {
  if (isAxiosError(err)) {
    const detail = err.response?.data?.detail;

    // Handle structured backend errors.
    if (detail && typeof detail === "object" && "message" in detail) {
      return String(detail.message);
    }

    // Handle string detail
    if (typeof detail === "string") {
      return detail;
    }

    return err.message || fallback;
  }
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  return fallback;
};

function BrandingImageUpload({ kind }: { kind: BrandingImageKind }) {
  const config = BRANDING_IMAGE_CONFIG[kind];
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const queryClient = useQueryClient();

  const {
    data: user,
    isLoading,
    error: userError,
  } = useQuery<CurrentUser>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const response = await apiClient.get<CurrentUser>("/users/me");
      return response.data;
    },
    retry: false,
    staleTime: 60000, // 1 minute
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post(config.endpoint, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setSelectedFile(null);
      setPreviewUrl(null);
      setError("");
    },
    onError: (err: unknown) => {
      setError(getErrorMessage(err, `Failed to upload ${config.label.toLowerCase()}`));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete(config.endpoint);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setSelectedFile(null);
      setPreviewUrl(null);
      setError("");
    },
    onError: (err: unknown) => {
      setError(getErrorMessage(err, `Failed to remove ${config.label.toLowerCase()}`));
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/svg+xml",
    ];
    if (!validTypes.includes(file.type)) {
      setError("Please select a PNG, JPG, JPEG, or SVG file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setError("");
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result;
      if (typeof result === "string") {
        setPreviewUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  const handleRemove = () => {
    if (
      typeof window === "undefined" ||
      window.confirm(
        `Are you sure you want to remove your ${config.label.toLowerCase()}?`
      )
    ) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-32 w-32 rounded-lg bg-brand-background" />
          <div className="h-10 w-full rounded bg-brand-background" />
        </div>
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-brand-textMuted">
          Unable to load {config.label.toLowerCase()} settings.
        </p>
      </div>
    );
  }

  const currentImage = user[config.field];
  const displayImage = previewUrl || currentImage;
  const inputId = `${kind}-upload`;

  return (
    <div className="space-y-4">
      {displayImage && (
        <div className={kind === "logo" ? "flex items-center gap-4 text-brand-text" : "space-y-3 text-brand-text"}>
          <div className={`relative overflow-hidden border border-brand-border bg-white ${config.previewClass}`}>
            <Image
              src={displayImage}
              alt={config.label}
              fill
              sizes={config.sizes}
              className={config.imageClass}
              unoptimized
            />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-textMuted">
              {previewUrl ? "Preview" : `Current ${config.label}`}
            </p>
            <p className="mt-1.5 text-sm text-brand-text">
              {config.description}
            </p>
          </div>
          {currentImage && !previewUrl && (
            <Button
              onClick={handleRemove}
              disabled={deleteMutation.isPending}
              variant="danger"
              size="sm"
            >
              {deleteMutation.isPending ? "Removing" : "Remove"}
            </Button>
          )}
        </div>
      )}

      {!currentImage || previewUrl ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label
              htmlFor={inputId}
              className="cursor-pointer rounded-lg border border-brand-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-text transition hover:bg-brand-background"
            >
              {previewUrl ? "Choose Different File" : "Choose File"}
            </label>
            <input
              id={inputId}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml"
              onChange={handleFileSelect}
              className="hidden"
            />
            {selectedFile && (
              <span className="text-sm text-brand-textMuted">
                {selectedFile.name}
              </span>
            )}
          </div>

          {previewUrl && (
            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="min-w-[140px]"
              >
                  {uploadMutation.isPending ? "Uploading" : `Upload ${config.label}`}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setError("");
                }}
              >
                Cancel
              </Button>
            </div>
          )}

          <p className="text-xs text-brand-textMuted">
            Accepted formats: PNG, JPG, JPEG, SVG • Max size: 5MB • Recommended:
            {config.recommendation}
          </p>
        </div>
      ) : (
        <label
          htmlFor={`${inputId}-replace`}
          className="inline-block cursor-pointer rounded-lg border border-brand-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand-text transition hover:bg-brand-background"
        >
          Replace {config.label}
          <input
            id={`${inputId}-replace`}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      )}

      {/* Success Message */}
      {uploadMutation.isSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {config.label} uploaded successfully
        </div>
      )}

      {deleteMutation.isSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {config.label} removed successfully
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

    </div>
  );
}

export function LogoUpload() {
  return <BrandingImageUpload kind="logo" />;
}

export function StorefrontCoverUpload() {
  return <BrandingImageUpload kind="storefront-cover" />;
}
