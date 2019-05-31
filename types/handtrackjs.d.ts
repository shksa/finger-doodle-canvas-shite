/**
 * [x, y, width, height]
 */
type BBox = [number, number, number, number]

type Prediction = {
  bbox: BBox,
  class: 'hand',
  score: number
}

type Predictions = Array<Prediction>

type InputSource = HTMLImageElement | HTMLVideoElement | HTMLCanvasElement

export interface Model {
  detect: (input: InputSource) => Promise<Predictions>,
  getFPS: () => number,
  renderPredictions: (predictions: Predictions, canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, inputSource: InputSource) => void,
  getModelParameters: () => ModelParams,
  setModelParameters: (modelParams: Partial<ModelParams>) => void
  dispose: () => void
}

declare module 'handtrackjs' {
  export function load(modelParams?: Partial<ModelParams>): Promise<Model>
  export function startVideo(video: HTMLVideoElement): Promise<Status> // status
  export function stopVideo(): void
}

type ModelParams = {
  flipHorizontal: boolean,   // flip e.g for video 
  imageScaleFactor: number,  // reduce input image size for gains in speed.
  maxNumBoxes: number,        // maximum number of boxes to detect
  iouThreshold: number,      // ioU threshold for non-max suppression
  scoreThreshold: number,    // confidence threshold for predictions.
}

type Status = boolean