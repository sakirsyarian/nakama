import { afterEach, beforeEach, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  listArtifacts,
  readArtifactFile,
  writeArtifactFile,
} from "./artifacts";
import { getProfileArtifactsDir } from "./soul/resolve";

const SAMPLE_DOCX_PATH = path.join(
  import.meta.dir,
  "__fixtures__",
  "sample.docx"
);

const ORG_ID = "org_test";
const PROFILE_ID = "profile_test";

let configDir: string;
let previousConfigDir: string | undefined;

beforeEach(async () => {
  previousConfigDir = process.env.NAKAMA_CONFIG_DIR;
  configDir = await mkdtemp(path.join(tmpdir(), "nakama-artifacts-"));
  process.env.NAKAMA_CONFIG_DIR = configDir;
  await mkdir(getProfileArtifactsDir(ORG_ID, PROFILE_ID), { recursive: true });
});

afterEach(async () => {
  if (previousConfigDir === undefined) {
    delete process.env.NAKAMA_CONFIG_DIR;
  } else {
    process.env.NAKAMA_CONFIG_DIR = previousConfigDir;
  }

  await rm(configDir, { force: true, recursive: true });
});

async function writeArtifact(
  relativePath: string,
  content: string
): Promise<void> {
  const target = path.join(
    getProfileArtifactsDir(ORG_ID, PROFILE_ID),
    relativePath
  );
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, content, "utf8");
}

test("serves a markdown artifact without a sidecar as text/markdown", async () => {
  await writeArtifact("report.md", "# Title\n");

  const artifact = await readArtifactFile({
    filename: "report.md",
    orgId: ORG_ID,
    profileId: PROFILE_ID,
  });

  expect(artifact.contentType).toBe("text/markdown");
  expect(artifact.bytes.toString("utf8")).toBe("# Title\n");
});

test("prefers the sidecar mime type when present", async () => {
  await writeArtifact("page.html", "<p>hi</p>");
  await writeArtifact(
    "page.html.nakama-meta.json",
    JSON.stringify({
      mimeType: "text/html",
      savedAt: "2026-01-01T00:00:00.000Z",
      sizeBytes: 9,
    })
  );

  const artifact = await readArtifactFile({
    filename: "page.html",
    orgId: ORG_ID,
    profileId: PROFILE_ID,
  });

  expect(artifact.contentType).toBe("text/html");
});

test("keeps the binary fallback for unknown extensions", async () => {
  await writeArtifact("blob.bin", "raw");

  const artifact = await readArtifactFile({
    filename: "blob.bin",
    orgId: ORG_ID,
    profileId: PROFILE_ID,
  });

  expect(artifact.contentType).toBe("application/octet-stream");
});

test("serves a docx as raw bytes for download, and as markdown for preview", async () => {
  const target = path.join(
    getProfileArtifactsDir(ORG_ID, PROFILE_ID),
    "laporan.docx"
  );
  await copyFile(SAMPLE_DOCX_PATH, target);

  const download = await readArtifactFile({
    filename: "laporan.docx",
    orgId: ORG_ID,
    profileId: PROFILE_ID,
  });

  expect(download.contentType).toBe(
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
  expect(download.bytes).toEqual(readFileSync(SAMPLE_DOCX_PATH));

  const preview = await readArtifactFile({
    filename: "laporan.docx",
    orgId: ORG_ID,
    profileId: PROFILE_ID,
    render: "markdown",
  });

  expect(preview.contentType).toBe("text/markdown");
  expect(preview.bytes.toString("utf8")).toContain("Laporan Mingguan");
});

test("previews HTML that an agent saved under a Word extension", async () => {
  await writeArtifact(
    "palsu.docx",
    "<html><head><style>body { font-family: Calibri; }</style></head><body><h1>Laporan</h1></body></html>"
  );

  const preview = await readArtifactFile({
    filename: "palsu.docx",
    orgId: ORG_ID,
    profileId: PROFILE_ID,
    render: "markdown",
  });

  expect(preview.bytes.toString("utf8")).toContain("# Laporan");
  expect(preview.bytes.toString("utf8")).not.toContain("font-family");
});

test("refuses to preview a genuine legacy OLE .doc with an actionable message", async () => {
  const target = path.join(
    getProfileArtifactsDir(ORG_ID, PROFILE_ID),
    "lama.doc"
  );
  await writeFile(
    target,
    Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
  );

  expect(
    readArtifactFile({
      filename: "lama.doc",
      orgId: ORG_ID,
      profileId: PROFILE_ID,
      render: "markdown",
    })
  ).rejects.toThrow(/Convert the file to \.docx/);
});

test("lists sidecar-less artifacts with an inferred mime type", async () => {
  await writeArtifact("weekly/summary.md", "# Weekly\n");

  const listing = await listArtifacts(ORG_ID, PROFILE_ID);
  const summary = listing.artifacts.find((file) =>
    file.filename.endsWith("summary.md")
  );

  expect(summary?.mimeType).toBe("text/markdown");
  expect(listing.total).toBe(listing.artifacts.length);
});

test("overwrites a markdown artifact in place and refreshes the sidecar", async () => {
  await writeArtifact("script.md", "# Draft\n");
  await writeArtifact(
    "script.md.nakama-meta.json",
    JSON.stringify({
      mimeType: "text/markdown",
      savedAt: "2026-01-01T00:00:00.000Z",
      sizeBytes: 8,
    })
  );

  const written = await writeArtifactFile({
    content: "# Final hook\n",
    filename: "script.md",
    orgId: ORG_ID,
    profileId: PROFILE_ID,
  });

  const artifact = await readArtifactFile({
    filename: "script.md",
    orgId: ORG_ID,
    profileId: PROFILE_ID,
  });
  const sidecar = JSON.parse(
    await readFileSync(
      path.join(
        getProfileArtifactsDir(ORG_ID, PROFILE_ID),
        "script.md.nakama-meta.json"
      ),
      "utf8"
    )
  ) as { mimeType: string; sizeBytes: number; savedAt: string };

  expect(written.filename).toBe("script.md");
  expect(artifact.bytes.toString("utf8")).toBe("# Final hook\n");
  expect(sidecar.mimeType).toBe("text/markdown");
  expect(sidecar.sizeBytes).toBe(Buffer.byteLength("# Final hook\n", "utf8"));
  expect(sidecar.savedAt).not.toBe("2026-01-01T00:00:00.000Z");
  expect(
    await listArtifacts(ORG_ID, PROFILE_ID).then((listing) =>
      listing.artifacts.map((file) => file.filename)
    )
  ).toEqual(["script.md"]);
});

test("writes a sidecar when the artifact had none", async () => {
  await writeArtifact("weekly/notes.txt", "old");

  await writeArtifactFile({
    content: "new notes",
    filename: "weekly/notes.txt",
    orgId: ORG_ID,
    profileId: PROFILE_ID,
  });

  const sidecar = JSON.parse(
    await readFileSync(
      path.join(
        getProfileArtifactsDir(ORG_ID, PROFILE_ID),
        "weekly/notes.txt.nakama-meta.json"
      ),
      "utf8"
    )
  ) as { mimeType: string; sizeBytes: number };

  expect(sidecar.mimeType).toBe("text/plain");
  expect(sidecar.sizeBytes).toBe(Buffer.byteLength("new notes", "utf8"));
});

test("accepts an artifacts/ prefix when overwriting", async () => {
  await writeArtifact("script.md", "# Draft\n");

  const written = await writeArtifactFile({
    content: "# From prefix\n",
    filename: "artifacts/script.md",
    orgId: ORG_ID,
    profileId: PROFILE_ID,
  });

  const artifact = await readArtifactFile({
    filename: "script.md",
    orgId: ORG_ID,
    profileId: PROFILE_ID,
  });

  expect(written.filename).toBe("script.md");
  expect(artifact.bytes.toString("utf8")).toBe("# From prefix\n");
});

test("refuses binary, Word, missing, and sidecar paths", async () => {
  await writeArtifact("photo.png", "not-an-image");
  await copyFile(
    SAMPLE_DOCX_PATH,
    path.join(getProfileArtifactsDir(ORG_ID, PROFILE_ID), "laporan.docx")
  );

  await expect(
    writeArtifactFile({
      content: "nope",
      filename: "photo.png",
      orgId: ORG_ID,
      profileId: PROFILE_ID,
    })
  ).rejects.toThrow();

  await expect(
    writeArtifactFile({
      content: "# overwritten",
      filename: "laporan.docx",
      orgId: ORG_ID,
      profileId: PROFILE_ID,
    })
  ).rejects.toThrow();

  await expect(
    writeArtifactFile({
      content: "ghost",
      filename: "missing.md",
      orgId: ORG_ID,
      profileId: PROFILE_ID,
    })
  ).rejects.toThrow();

  await expect(
    writeArtifactFile({
      content: "{}",
      filename: "script.md.nakama-meta.json",
      orgId: ORG_ID,
      profileId: PROFILE_ID,
    })
  ).rejects.toThrow();
});

test("paginates artifacts with limit and offset", async () => {
  for (let index = 0; index < 5; index += 1) {
    await writeArtifact(`file-${index}.txt`, `content ${index}`);
  }

  const page1 = await listArtifacts(ORG_ID, PROFILE_ID, {
    limit: 2,
    offset: 0,
  });
  expect(page1.total).toBe(5);
  expect(page1.artifacts).toHaveLength(2);
  expect(page1.limit).toBe(2);
  expect(page1.offset).toBe(0);

  const page2 = await listArtifacts(ORG_ID, PROFILE_ID, {
    limit: 2,
    offset: 2,
  });
  expect(page2.artifacts).toHaveLength(2);
  expect(page2.offset).toBe(2);

  const page3 = await listArtifacts(ORG_ID, PROFILE_ID, {
    limit: 2,
    offset: 4,
  });
  expect(page3.artifacts).toHaveLength(1);
});
