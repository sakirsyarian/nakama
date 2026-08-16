import {
  File01Icon,
  Image01Icon,
  Video01Icon,
  ViewIcon,
} from "hugeicons-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArtifactAttachmentPanelActions } from "@/components/chat/artifact-attachment-panel-actions";
import { ArtifactAttachmentPanelBody } from "@/components/chat/artifact-attachment-panel-body";
import {
  artifactCanEdit,
  artifactCanTogglePreviewSource,
  artifactPanelBodyClassName,
  artifactPanelDefaultWidth,
  artifactPanelHeaderMeta,
  downloadActionLabel,
} from "@/components/chat/artifact-attachment-panel-body.shared";
import { ArtifactMarkdownTocSelect } from "@/components/chat/artifact-markdown-preview";
import {
  type ArtifactPreviewMode,
  ArtifactPreviewModeToggle,
} from "@/components/chat/artifact-preview-mode-toggle";
import {
  ArtifactShareMenuItem,
  ArtifactSharePublishDialogFromState,
} from "@/components/chat/artifact-share-controls";
import { useArtifactPreviewContent } from "@/components/chat/use-artifact-preview-content";
import { useArtifactShareControls } from "@/components/chat/use-artifact-share-controls";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/context/use-auth";
import { useChatAttachmentPanel } from "@/context/use-chat-attachment-panel";
import { useUpdateArtifactMutation } from "@/hooks/use-resource-mutations";
import {
  artifactCodeLanguage,
  artifactContentWritePath,
  buildArtifactContentUrl,
  type ChatArtifactRef,
  isDocxFile,
  isHtmlArtifactMimeType,
  isImageArtifactMimeType,
  isLegacyDocFile,
  isMarkdownArtifactMimeType,
  isTextArtifactMimeType,
  isUnknownArtifactMimeType,
  isVideoArtifactMimeType,
  resolveArtifactMimeType,
} from "@/lib/chat-artifacts";
import { client, formatError } from "@/lib/client";
import { formatBytes } from "@/lib/knowledge-base-files";
import {
  extractMarkdownToc,
  MARKDOWN_TOC_MIN_HEADINGS,
} from "@/lib/markdown-toc";
import { cn } from "@/lib/utils";

interface ArtifactAttachmentPreviewProps {
  artifact: ChatArtifactRef;
  className?: string;
  id: string;
  profileId: string;
  /** `chip` is the chat attachment chip; `icon` is an icon-only view button. */
  variant?: "chip" | "icon";
}

function ArtifactAttachmentPreviewPanelBody({
  kind,
  textFormat,
  language,
  loading,
  error,
  content,
  imagePreviewUrl,
  videoPreviewUrl,
  canPreview,
  artifact,
  previewMode,
}: {
  kind: "image" | "video" | "html" | "text";
  textFormat: "markdown" | "plain";
  language: string | null;
  loading: boolean;
  error: string | null;
  content: string | null;
  imagePreviewUrl: string | null;
  videoPreviewUrl: string | null;
  canPreview: boolean;
  artifact: ChatArtifactRef;
  previewMode: ArtifactPreviewMode;
}) {
  if (kind === "image") {
    return (
      <ArtifactAttachmentPanelBody
        artifact={artifact}
        canPreview={canPreview}
        error={error}
        imagePreviewUrl={imagePreviewUrl}
        kind="image"
        loading={loading}
      />
    );
  }

  if (kind === "video") {
    return (
      <ArtifactAttachmentPanelBody
        artifact={artifact}
        canPreview={canPreview}
        error={error}
        kind="video"
        loading={loading}
        videoPreviewUrl={videoPreviewUrl}
      />
    );
  }

  if (kind === "html") {
    return (
      <ArtifactAttachmentPanelBody
        artifact={artifact}
        canPreview={canPreview}
        content={content}
        error={error}
        kind="html"
        loading={loading}
        previewMode={previewMode}
      />
    );
  }

  return (
    <ArtifactAttachmentPanelBody
      artifact={artifact}
      canPreview={canPreview}
      content={content}
      error={error}
      format={textFormat}
      kind="text"
      language={language}
      loading={loading}
      previewMode={previewMode}
    />
  );
}

export function ArtifactAttachmentPreview({
  profileId,
  id,
  artifact,
  className,
  variant = "chip",
}: ArtifactAttachmentPreviewProps) {
  const { show, update, activeId, isFullscreen } = useChatAttachmentPanel();
  const share = useArtifactShareControls({
    artifactPath: artifact.path,
    profileId,
  });
  const open = activeId === id;
  const fullscreen = open && isFullscreen;
  const [copied, setCopied] = useState(false);
  const [previewMode, setPreviewMode] =
    useState<ArtifactPreviewMode>("preview");
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const draftRef = useRef("");
  const editorMountedRef = useRef(false);
  const saveArtifactRef = useRef<() => Promise<void>>(async () => undefined);
  const { activeOrg } = useAuth();
  const updateArtifact = useUpdateArtifactMutation();
  const downloadUrl = `${client.baseUrl}${buildArtifactContentUrl(profileId, artifact.path)}`;
  const mimeType = resolveArtifactMimeType(
    artifact.mimeType,
    artifact.filename
  );
  const isHtml = isHtmlArtifactMimeType(mimeType);
  const isImage = isImageArtifactMimeType(mimeType);
  const isVideo = isVideoArtifactMimeType(mimeType);
  const isWordDocument =
    isDocxFile(artifact.filename, mimeType) ||
    isLegacyDocFile(artifact.filename, mimeType);
  const isMarkdown = isMarkdownArtifactMimeType(mimeType) || isWordDocument;
  const canEdit =
    (activeOrg?.role === "admin" || activeOrg?.role === "member") &&
    artifactCanEdit({ filename: artifact.filename, mimeType });
  const canTogglePreview = artifactCanTogglePreviewSource({
    isHtml,
    isMarkdown,
  });
  const showPreviewToggle = canTogglePreview;
  const header = artifactPanelHeaderMeta({
    filename: artifact.filename,
    mimeType,
    showPreviewToggle: canTogglePreview,
    sizeBytes: artifact.sizeBytes,
  });
  const language = artifactCodeLanguage(artifact.filename);
  const canPreview =
    isHtml ||
    isImage ||
    isVideo ||
    isWordDocument ||
    isTextArtifactMimeType(mimeType) ||
    isUnknownArtifactMimeType(mimeType);
  const downloadLabel = downloadActionLabel(mimeType);
  const {
    loading,
    error,
    content,
    imagePreviewUrl,
    videoPreviewUrl,
    setContent,
  } = useArtifactPreviewContent({
    artifact,
    canPreview,
    isHtml,
    isImage,
    isVideo,
    isWordDocument,
    open,
    profileId,
  });
  const previewText = dirty ? draftRef.current : (content ?? "");
  const toc = useMemo(() => extractMarkdownToc(previewText), [previewText]);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeout = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  function handlePreviewModeChange(next: ArtifactPreviewMode) {
    if (editing) {
      editorMountedRef.current = false;
      setEditing(false);
    }
    setPreviewMode(next);
  }

  function handleDraftChange(next: string) {
    draftRef.current = next;
    const nextDirty = next !== (content ?? "");
    setDirty((current) => (current === nextDirty ? current : nextDirty));
  }

  function buildPanelBody(
    loadingOverride?: boolean,
    mode: ArtifactPreviewMode = previewMode
  ) {
    if (editing && !(loadingOverride ?? loading)) {
      const initial = dirty ? draftRef.current : (content ?? "");
      draftRef.current = initial;
      return (
        <ArtifactTextEditor
          initialValue={initial}
          onChange={handleDraftChange}
          onSave={() => void saveArtifactRef.current()}
        />
      );
    }

    const panelKind = isImage
      ? "image"
      : isVideo
        ? "video"
        : isHtml
          ? "html"
          : "text";
    return (
      <ArtifactAttachmentPreviewPanelBody
        artifact={artifact}
        canPreview={canPreview}
        content={dirty ? draftRef.current : content}
        error={error}
        imagePreviewUrl={imagePreviewUrl}
        kind={panelKind}
        language={language}
        loading={loadingOverride ?? loading}
        previewMode={mode}
        textFormat={isMarkdown ? "markdown" : "plain"}
        videoPreviewUrl={videoPreviewUrl}
      />
    );
  }

  function buildPanelConfig(mode: ArtifactPreviewMode = previewMode) {
    const showTocSelect =
      isMarkdown &&
      !editing &&
      mode === "preview" &&
      toc.length >= MARKDOWN_TOC_MIN_HEADINGS;

    return {
      bodyClassName: artifactPanelBodyClassName({
        editing,
        isHtml,
        isImage,
        isMarkdown,
        isVideo,
        previewMode: mode,
      }),
      content: buildPanelBody(undefined, mode),
      fullscreen,
      headerActions: (
        <>
          <ArtifactAttachmentPanelActions
            additionalMenuItems={<ArtifactShareMenuItem share={share} />}
            canEdit={canEdit && !canTogglePreview}
            content={content}
            copied={copied}
            copyDisabled={isImage || isVideo}
            downloadLabel={downloadLabel}
            downloadUrl={downloadUrl}
            editing={editing || dirty}
            filename={artifact.filename}
            fullscreen={fullscreen}
            loading={loading}
            onCancelEdit={cancelEditing}
            onCopy={() => void copyArtifact()}
            onEdit={startEditing}
            onSave={() => void saveArtifactRef.current()}
            onToggleFullscreen={() =>
              update(id, {
                fullscreen: !fullscreen,
                resizable: fullscreen,
              })
            }
            saveDisabled={!dirty}
            saving={updateArtifact.isPending}
          />
          <ArtifactSharePublishDialogFromState
            artifactPath={artifact.path}
            share={share}
          />
        </>
      ),
      leading:
        showPreviewToggle || showTocSelect ? (
          <>
            {showPreviewToggle ? (
              <ArtifactPreviewModeToggle
                editDisabled={loading && !content}
                mode={editing ? "edit" : mode}
                onChange={handlePreviewModeChange}
                onEdit={startEditing}
                showEdit={canEdit}
              />
            ) : null}
            {showTocSelect ? <ArtifactMarkdownTocSelect entries={toc} /> : null}
          </>
        ) : null,
      resizable: !fullscreen,
      subtitle: saveError ?? header.subtitle,
      subtitleClassName: saveError ? "text-destructive" : undefined,
      title: showTocSelect ? "" : header.title,
      typeLabel: null,
    };
  }

  useEffect(() => {
    if (!open) {
      editorMountedRef.current = false;
      return;
    }

    const config = buildPanelConfig();
    if (editing && !loading) {
      if (editorMountedRef.current) {
        update(id, {
          bodyClassName: config.bodyClassName,
          fullscreen: config.fullscreen,
          headerActions: config.headerActions,
          leading: config.leading,
          resizable: config.resizable,
          subtitle: config.subtitle,
          subtitleClassName: config.subtitleClassName,
          title: config.title,
          typeLabel: config.typeLabel,
        });
        return;
      }

      editorMountedRef.current = true;
      update(id, config);
      return;
    }

    editorMountedRef.current = false;
    update(id, config);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    update,
    id,
    artifact.filename,
    artifact.mimeType,
    artifact.path,
    artifact.sizeBytes,
    fullscreen,
    isHtml,
    isImage,
    isVideo,
    isMarkdown,
    language,
    mimeType,
    loading,
    error,
    content,
    imagePreviewUrl,
    videoPreviewUrl,
    canPreview,
    copied,
    downloadLabel,
    downloadUrl,
    share.busy,
    share.publishDialogOpen,
    previewMode,
    showPreviewToggle,
    header.subtitle,
    header.title,
    canEdit,
    editing,
    dirty,
    toc,
    saveError,
    updateArtifact.isPending,
  ]);

  function startEditing() {
    if (editing) {
      return;
    }
    if (!dirty) {
      draftRef.current = content ?? "";
    }
    setSaveError(null);
    editorMountedRef.current = false;
    setEditing(true);
  }

  function cancelEditing() {
    draftRef.current = content ?? "";
    setDirty(false);
    setSaveError(null);
    editorMountedRef.current = false;
    setEditing(false);
  }

  function resetEditor() {
    setEditing(false);
    setDirty(false);
    draftRef.current = "";
    setSaveError(null);
    editorMountedRef.current = false;
  }

  async function saveArtifact() {
    const nextContent = draftRef.current;
    if (nextContent === (content ?? "") || updateArtifact.isPending) {
      return;
    }

    try {
      await updateArtifact.mutateAsync({
        content: nextContent,
        path: artifactContentWritePath(artifact.path),
        profileId,
      });
      setContent(nextContent);
      setEditing(false);
      setDirty(false);
      setSaveError(null);
    } catch (saveFailure) {
      setSaveError(formatError(saveFailure));
    }
  }

  saveArtifactRef.current = saveArtifact;

  async function copyArtifact() {
    if (isImage || isVideo) {
      return;
    }

    try {
      let text = content;
      if (!text) {
        const result = await client.readProfileArtifactContent(
          profileId,
          artifactContentWritePath(artifact.path),
          {
            inline: true,
            render: isWordDocument ? "markdown" : undefined,
          }
        );
        text = new TextDecoder().decode(result.data);
        setContent(text);
      }

      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // Clipboard may be unavailable outside secure contexts.
    }
  }

  function openPanel() {
    setCopied(false);
    setPreviewMode("preview");
    resetEditor();
    show({
      ...buildPanelConfig("preview"),
      content: buildPanelBody(
        canPreview &&
          (isImage || isVideo
            ? (isImage ? imagePreviewUrl : videoPreviewUrl) === null
            : content === null) &&
          error === null,
        "preview"
      ),
      defaultWidth: artifactPanelDefaultWidth(artifact.filename, mimeType),
      fullscreen: false,
      id,
      onClose: () => {
        setCopied(false);
        setPreviewMode("preview");
        resetEditor();
      },
      resizable: true,
    });
  }

  return (
    <ArtifactAttachmentPreviewTrigger
      artifact={artifact}
      className={className}
      imagePreviewUrl={imagePreviewUrl}
      isImage={isImage}
      isVideo={isVideo}
      onOpen={openPanel}
      variant={variant}
    />
  );
}

function ArtifactTextEditor({
  initialValue,
  onChange,
  onSave,
}: {
  initialValue: string;
  onChange: (value: string) => void;
  onSave: () => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <textarea
        className="min-h-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-4 py-3 font-mono text-sm leading-relaxed outline-none"
        data-artifact-inner-scroll=""
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          onChange(next);
        }}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "s") {
            event.preventDefault();
            onSave();
          }
        }}
        spellCheck
        value={value}
      />
    </div>
  );
}

function ArtifactAttachmentPreviewTrigger({
  artifact,
  className,
  imagePreviewUrl,
  isImage,
  isVideo,
  onOpen,
  variant,
}: {
  artifact: ChatArtifactRef;
  className?: string;
  imagePreviewUrl: string | null;
  isImage: boolean;
  isVideo: boolean;
  onOpen: () => void;
  variant: "chip" | "icon";
}) {
  if (variant === "icon") {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label="View"
              className={className}
              onClick={onOpen}
              size="icon-sm"
              title="View"
              type="button"
              variant="outline"
            >
              <ViewIcon aria-hidden className="size-3.5" />
            </Button>
          }
        />
        <TooltipContent side="top" sideOffset={8}>
          View
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isImage) {
    return (
      <button
        className={cn(
          "relative flex w-1/2 max-w-full shrink-0 flex-col gap-2 overflow-hidden rounded-lg border border-border bg-muted p-2 text-left transition-colors hover:bg-muted/70",
          className
        )}
        onClick={onOpen}
        type="button"
      >
        {imagePreviewUrl ? (
          <img
            alt=""
            className="aspect-[4/3] w-full rounded-md border border-border object-cover outline outline-1 outline-black/10 dark:outline-white/10"
            src={imagePreviewUrl}
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-center justify-center rounded-md border border-border bg-background">
            <Image01Icon aria-hidden className="size-6 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 px-0.5">
          <p className="truncate font-medium text-foreground text-xs">
            {artifact.filename}
          </p>
          <p className="text-2xs text-muted-foreground">
            {artifact.sizeBytes > 0
              ? `${formatBytes(artifact.sizeBytes)} · `
              : null}
            Artifact
          </p>
        </div>
      </button>
    );
  }

  return (
    <button
      className={cn(
        "relative inline-flex max-w-full shrink-0 items-center gap-2 rounded-lg border border-border bg-muted px-2 py-2 text-left transition-colors hover:bg-muted/70",
        className
      )}
      onClick={onOpen}
      type="button"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-background">
        {isVideo ? (
          <Video01Icon aria-hidden className="size-4 text-muted-foreground" />
        ) : (
          <File01Icon aria-hidden className="size-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 max-w-[12rem]">
        <p className="truncate font-medium text-foreground text-xs">
          {artifact.filename}
        </p>
        <p className="text-2xs text-muted-foreground">
          {artifact.sizeBytes > 0
            ? `${formatBytes(artifact.sizeBytes)} · `
            : null}
          Artifact
        </p>
      </div>
    </button>
  );
}
