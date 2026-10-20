import catalog from "./ar-catalog.json";

export interface ArArtifact {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  model: string;
  thumbnail: string;
  target: string;
  targetIndex: number;
  targetPhoto: string;
  targetCaption: string;
  targetOriginal: string;
  targetOriginalSha256: string;
  description: string;
  note: string;
  detail: string;
  author: string;
  source: string;
  license: string;
  status: "published" | "review";
  recognitionCard: string;
}

// The same catalog is fetched by the standalone camera frame.
const artifacts: ArArtifact[] = catalog.map((item) => ({
  ...item,
  status: item.status === "review" ? "review" : "published",
}));
export const AR_ARTIFACTS = artifacts.filter((item) => item.status === "published");
export const AR_REVIEW_ARTIFACTS = artifacts.filter((item) => item.status === "review");
export type ArArtifactId = ArArtifact["id"];
export function readArtifact(value: string | null, includeReview = false): ArArtifact {
  return artifacts.find((item) => item.id === value && (item.status === "published" || includeReview)) ?? AR_ARTIFACTS[0];
}
export function phoneExperiencePath(id: ArArtifactId, includeReview = false): string {
  const artifact = readArtifact(id, true);
  const review = includeReview || artifact.status === "review";
  return `/ar-experience?artifact=${encodeURIComponent(artifact.id)}&view=camera${review ? "&review=1" : ""}`;
}
export const AR_FRAME_TYPES = [
  "AR_READY",
  "AR_TARGET_FOUND",
  "AR_TARGET_LOST",
  "AR_ERROR",
] as const;
export type ArFrameMessage = {
  type: (typeof AR_FRAME_TYPES)[number];
  artifact: ArArtifactId;
  message?: string;
};
export function isArFrameMessage(
  event: Pick<MessageEvent, "origin" | "source" | "data">,
  frame: MessageEventSource | null,
  origin: string,
  artifact: ArArtifactId,
): event is MessageEvent<ArFrameMessage> {
  return (
    frame !== null &&
    event.source === frame &&
    event.origin === origin &&
    typeof event.data === "object" &&
    event.data !== null &&
    event.data.artifact === artifact &&
    AR_FRAME_TYPES.includes(event.data.type)
  );
}
