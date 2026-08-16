import { useEffect, useState } from "react";
import {
  artifactPreviewErrorMessage,
  type ChatArtifactRef,
  isHtmlArtifactMimeType,
  isImageArtifactMimeType,
  isTextArtifactMimeType,
  isVideoArtifactMimeType,
  looksLikeUtf8Text,
  resolveArtifactMimeType,
} from "@/lib/chat-artifacts";
import { client, formatError } from "@/lib/client";

type ArtifactPreviewCacheEntry = {
  content: string | null;
  mediaBlob: Blob | null;
};

const previewCache = new Map<string, ArtifactPreviewCacheEntry>();

export function artifactPreviewCacheKey(profileId: string, path: string) {
  return `${profileId}:${path}`;
}

export function clearArtifactPreviewCache() {
  previewCache.clear();
}

function readPreviewCache(key: string): ArtifactPreviewCacheEntry | undefined {
  return previewCache.get(key);
}

function writePreviewCache(
  key: string,
  patch: Partial<ArtifactPreviewCacheEntry>
) {
  const current = previewCache.get(key) ?? { content: null, mediaBlob: null };
  previewCache.set(key, { ...current, ...patch });
}

export function useAuthenticatedImagePreview(
  profileId: string | null | undefined,
  artifactPath: string | null | undefined
): { error: string | null; url: string | null } {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const url = useBlobObjectUrl(blob);

  useEffect(() => {
    if (!(profileId?.trim() && artifactPath?.trim())) {
      setBlob(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setBlob(null);
    setError(null);

    void client
      .readProfileArtifactContent(profileId, artifactPath, { inline: true })
      .then((result) => {
        if (cancelled) {
          return;
        }

        const filename = artifactPath.split("/").pop() ?? artifactPath;
        const contentType = resolveArtifactMimeType(
          result.contentType,
          filename
        );
        if (!isImageArtifactMimeType(contentType)) {
          setBlob(null);
          setError(
            "Preview is not available for this file type. Download instead."
          );
          return;
        }

        setBlob(new Blob([result.data], { type: contentType }));
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setBlob(null);
          setError(artifactPreviewErrorMessage(formatError(fetchError)));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [artifactPath, profileId]);

  return { error, url };
}

function useBlobObjectUrl(blob: Blob | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }

    const nextUrl = URL.createObjectURL(blob);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [blob]);

  return url;
}

export function useArtifactPreviewContent({
  open,
  canPreview,
  isHtml,
  isImage,
  isVideo,
  isWordDocument,
  profileId,
  artifact,
}: {
  open: boolean;
  canPreview: boolean;
  isHtml: boolean;
  isImage: boolean;
  isVideo: boolean;
  isWordDocument: boolean;
  profileId: string;
  artifact: ChatArtifactRef;
}) {
  const cacheKey = artifactPreviewCacheKey(profileId, artifact.path);
  const cached = readPreviewCache(cacheKey);
  const isBinaryMedia = isImage || isVideo;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContentState] = useState<string | null>(
    cached?.content ?? null
  );
  const [mediaBlob, setMediaBlob] = useState<Blob | null>(
    cached?.mediaBlob ?? null
  );
  const [activeCacheKey, setActiveCacheKey] = useState(cacheKey);
  const mediaPreviewUrl = useBlobObjectUrl(mediaBlob);
  // Load image bytes eagerly so chat chips can show a real thumbnail before the panel opens.
  const shouldLoad = open || isImage;

  if (activeCacheKey !== cacheKey) {
    const next = readPreviewCache(cacheKey);
    setActiveCacheKey(cacheKey);
    setContentState(next?.content ?? null);
    setMediaBlob(next?.mediaBlob ?? null);
    setError(null);
    setLoading(false);
  }

  function setContent(next: string) {
    setContentState(next);
    writePreviewCache(cacheKey, { content: next });
  }

  useEffect(() => {
    if (!(shouldLoad && canPreview)) {
      return;
    }

    const cachedEntry = readPreviewCache(cacheKey);
    if (isBinaryMedia) {
      const cachedBlob = cachedEntry?.mediaBlob ?? null;
      if (cachedBlob) {
        setMediaBlob(cachedBlob);
        setLoading(false);
        return;
      }
    } else if (cachedEntry?.content != null) {
      setContentState(cachedEntry.content);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void client
      .readProfileArtifactContent(profileId, artifact.path, {
        inline: true,
        render: isWordDocument ? "markdown" : undefined,
      })
      .then((result) => {
        if (cancelled) {
          return;
        }

        const contentType = resolveArtifactMimeType(
          result.contentType,
          artifact.filename
        );
        const servedAsHtml = isHtmlArtifactMimeType(contentType);
        const servedAsImage = isImageArtifactMimeType(contentType);
        const servedAsVideo = isVideoArtifactMimeType(contentType);

        if (isImage) {
          if (!servedAsImage) {
            setError(
              "Preview is not available for this file type. Download instead."
            );
            return;
          }

          const blob = new Blob([result.data], { type: contentType });
          writePreviewCache(cacheKey, { mediaBlob: blob });
          setMediaBlob(blob);
          return;
        }

        if (isVideo) {
          if (!servedAsVideo) {
            setError(
              "Preview is not available for this file type. Download instead."
            );
            return;
          }

          const blob = new Blob([result.data], { type: contentType });
          writePreviewCache(cacheKey, { mediaBlob: blob });
          setMediaBlob(blob);
          return;
        }

        if (isHtml ? !servedAsHtml : servedAsHtml) {
          setError(
            "Preview is not available for this file type. Download instead."
          );
          return;
        }

        if (
          !(
            isHtml ||
            isTextArtifactMimeType(contentType) ||
            looksLikeUtf8Text(new Uint8Array(result.data))
          )
        ) {
          setError(
            "Preview is not available for this file type. Download instead."
          );
          return;
        }

        const text = new TextDecoder().decode(result.data);
        writePreviewCache(cacheKey, { content: text });
        setContentState(text);
      })
      .catch((fetchError) => {
        if (!cancelled) {
          setError(artifactPreviewErrorMessage(formatError(fetchError)));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    shouldLoad,
    canPreview,
    cacheKey,
    isBinaryMedia,
    isHtml,
    isImage,
    isVideo,
    isWordDocument,
    profileId,
    artifact.path,
    artifact.filename,
  ]);

  return {
    content,
    error,
    imagePreviewUrl: isImage ? mediaPreviewUrl : null,
    loading,
    setContent,
    videoPreviewUrl: isVideo ? mediaPreviewUrl : null,
  };
}
