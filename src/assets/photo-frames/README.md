# Personal Cu Chi frames

The three PNGs are supplied by the user for this project. They retain their original 1080×1080 artwork and alpha channel; the transparent central window must remain transparent.

`selfie_segmenter.tflite` is the official MediaPipe Selfie Segmenter float16 model, downloaded from:
https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite

It runs on the user's device through the existing MediaPipe runtime. No uploaded personal photograph is sent to a segmentation service. The segmentation module caches only a per-File cutout Blob in a WeakMap while the source File remains referenced.

Browser regression uses Google's official sample image at https://storage.googleapis.com/mediapipe-assets/portrait.jpg (stored under scripts/fixtures only). The application's existing cartoon portrait fixture is intentionally unsuitable for person segmentation.
