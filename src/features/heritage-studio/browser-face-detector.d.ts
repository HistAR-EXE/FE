interface FaceDetectorResult {
  readonly boundingBox: DOMRectReadOnly
}

interface FaceDetector {
  detect(source: ImageBitmapSource): Promise<FaceDetectorResult[]>
}

interface FaceDetectorConstructor {
  new (options?: { fastMode?: boolean; maxDetectedFaces?: number }): FaceDetector
}

interface Window {
  FaceDetector?: FaceDetectorConstructor
}

declare const FaceDetector: FaceDetectorConstructor | undefined
