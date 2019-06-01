import React from 'react'
import {SliderPicker, ColorChangeHandler} from 'react-color'
import * as handTrack from 'handtrackjs'
import s from './DrawingBoard.module.css'

type CanvasInfo = {
  ref: HTMLCanvasElement,
  canvasContext: CanvasRenderingContext2D,
}

type State = {
  lineThickness: number, canvasWidth: number, canvasHeight: number, 
  isVideoPlaying: boolean, 
  detectionModel: handTrack.Model | null, 
  isModelLoaded: boolean,
  modelParams: {scoreThreshold: number, flipHorizontal: boolean}
}

type Props = {contextID: '2d'}

class DrawingBoard extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props)
    this.state = {
      lineThickness: 1, canvasWidth: 507, canvasHeight: 380, 
      isVideoPlaying: false, detectionModel: null, isModelLoaded: false,
      modelParams: {scoreThreshold: 0.7, flipHorizontal: true}
    }
  }

  async componentDidMount() {
    const {modelParams} = this.state
    const model = await handTrack.load(modelParams)
    console.log('detection model loaded!')
    this.setState({detectionModel: model, isModelLoaded: true})
  }

  componentWillUnmount() {
    const {detectionModel} = this.state
    if (!detectionModel) {
      return
    }
    detectionModel.dispose()
    handTrack.stopVideo()
  }

  canvases: Array<CanvasInfo> = []

  videoElem!: HTMLVideoElement

  fingerPosition: [number, number] = [0, 0]

  drawingTimerID!: NodeJS.Timeout

  setDrawingBoardRef = (canvasInst: HTMLCanvasElement | null) => {
    if (!canvasInst) {
      return console.log('canvas element no longer exists')
    }
    const {contextID} = this.props
    const canvasContext = canvasInst.getContext(contextID)
    if (!canvasContext) {
      throw Error('could not get webgl context for the canvas element. choose 2d context instead')
    }
    this.canvases.push({ref: canvasInst, canvasContext})
    console.log('canvas element ref has been set as instance property')
    this.attachDrawingBoardEvtListners()
    this.attachWindowEvtListeners()
  }

  attachDrawingBoardEvtListners() {
    const handleOnCanvasMouseMove = this.handleOnCanvasMouseMove
    let isMouseDown = false
    this.canvases.forEach((canvasInfo) => {
      const {ref, canvasContext} = canvasInfo
      ref.onmousedown = function (this: GlobalEventHandlers, ev: MouseEvent) {
        isMouseDown = true
      }
      ref.onmouseup = function (this: GlobalEventHandlers, ev: MouseEvent) {
        isMouseDown = false
        canvasContext.beginPath() // resets path list
      }
      ref.onmousemove = function (this: GlobalEventHandlers, ev: MouseEvent) {
        if (isMouseDown) {
          handleOnCanvasMouseMove(ev, canvasInfo)
        }
      }
    })
  }

  attachWindowEvtListeners = () => {
    const handleWindowResize = this.handleWindowResize
    window.onresize = function (this: GlobalEventHandlers, ev: UIEvent) {
      handleWindowResize(ev.currentTarget as Window)
    }
  }

  handleWindowResize = (windowEvt: Window) => {
    const {innerWidth} = windowEvt
    if (innerWidth < 400) {
      this.resizeCanvasSize(200, 200)
    } else {
      this.resizeCanvasSize(350, 350)
    }
  }

  handleOnCanvasMouseMove = (ev: MouseEvent, canvasInfo: CanvasInfo) => {
    const {offsetX, offsetY} = ev
    const {ref, canvasContext} = canvasInfo
    // console.log('offsetX, offsetY', offsetX, offsetY)
    this.drawIn2D(canvasContext, offsetX, offsetY, ref.id)
  }

  drawIn2D(ctx: CanvasRenderingContext2D, x: number, y: number, canvasID: string) {
    if (canvasID === 'UnDotted') {
      ctx.lineTo(x, y) // from previous path coord to x, y. Previous path coord is stored internally in the path list maintained by calling the beginPath()
      ctx.stroke()
    } else {
      ctx.beginPath()
      ctx.arc(x, y, 1, 0, 2 * Math.PI)
      ctx.stroke()
    }
  }

  clearAllBoards = () => {
    this.canvases.forEach((canvasInfo) => {
      const {canvasContext, ref} = canvasInfo
      canvasContext.clearRect(0, 0, ref.width, ref.height)
      canvasContext.beginPath()
    })
  }

  resizeCanvasSize = (canvasWidth: number, canvasHeight: number) => {
    this.setState({ canvasWidth, canvasHeight })
  }

  handlePathParams = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const paramName = ev.target.name
    switch (paramName) {
      case 'lineThickness':
        const lineThickness = Number(ev.target.value)
        this.setState({ lineThickness })
        this.canvases.forEach((canvasInfo) => {
          const {canvasContext} = canvasInfo
          canvasContext.lineWidth = lineThickness
        })
        break;
      
      case 'scoreThreshold':
        const scoreThreshold = Number(ev.target.value) / 100
        const newModelParams = {...this.state.modelParams, scoreThreshold}
        this.setState({modelParams: newModelParams})
        this.state.detectionModel!.setModelParameters(newModelParams)
        break;
      default: 
        break;
    }
  }

  handleStrokeColorChange: ColorChangeHandler = (color) => {
    this.canvases.forEach((canvasInfo) => {
      const {canvasContext} = canvasInfo
      canvasContext.strokeStyle = color.hex
    })
  }

  setVideoEleRef = (instance: HTMLVideoElement | null) => {
    if (!instance) {
      return console.log('no instance has been found or instance has been destroyed')
    }
    this.videoElem = instance
    console.log('video elem set as instance property')
  }

  handleVideoLifecycle = () => {
    const {isVideoPlaying} = this.state
    if (isVideoPlaying) {
      this.stopVideo()
    } else {
      this.startVideo()
    }
  }

  stopVideo = () => {
    this.setState({isVideoPlaying: false})
    handTrack.stopVideo()
    clearInterval(this.drawingTimerID)
  }

  startVideo = async() => {
    const hasStarted = await handTrack.startVideo(this.videoElem)
    if (!hasStarted) {
      alert("Camera not available")
      return console.log("Camera not available")
    }
    this.setState({isVideoPlaying: true})
    this.runDetection()
    this.drawingTimerID = setInterval(this.drawFingerPointer, 300)
  }

  runDetection = async() => {
    const {detectionModel, isVideoPlaying} = this.state
    const inputSource = this.videoElem
    const predictions = await detectionModel!.detect(inputSource)
    if (predictions.length) {
      const bestPrediction = this.getBestPrediction(predictions)
      const [x, y] = bestPrediction.bbox
      this.calculateRunningAverage(x, y)
    }
    // detectionModel!.renderPredictions(predictions, this.canvases[1].ref, this.canvases[1].canvasContext, inputSource)
    if (isVideoPlaying && inputSource) {
      window.requestAnimationFrame(this.runDetection)
    }
  }

  calculateRunningAverage = (newX: number, newY: number) => {
    const [x, y] = this.fingerPosition
    const newAvgX = (x + newX) / 2
    const newAvgY = (y + newY) / 2
    this.fingerPosition[0] = newAvgX
    this.fingerPosition[1] = newAvgY
  }

  getBestPrediction = (predictions: handTrack.Predictions) => {
    const bestPrediction = predictions.sort((predA, predB) => {
      const [predAx, predAy] = predA.bbox
      const [predBx, predBy] = predB.bbox
      if (predAx < predBx && predAy < predBy) {
        return -1
      } else {
        return 1
      }
    })[0]
    return bestPrediction
  }

  drawFingerPointer = () => {
    const [x, y] = this.fingerPosition
    this.drawIn2D(this.canvases[0].canvasContext, x, y, 'UnDotted')
  }
  
  render() {
    const {lineThickness, canvasHeight, canvasWidth, isVideoPlaying, modelParams} = this.state
    return (
      <div className={s.DrawingBoardContainer}>
        <div className={s.CanvasOptionsContainer}>
          <button onClick={this.clearAllBoards} className={s.CanvasOption}>Clear</button>
          <button onClick={this.handleVideoLifecycle} className={!isVideoPlaying ? s.CanvasOption: `${s.CanvasOption} ${s.StopVideo}`}>{
            isVideoPlaying ? 'Stop Video' : 'Start Video' 
          }</button>
          <label>
            <h3>Line Thickness</h3>
            <input name='lineThickness' value={lineThickness} type='range' min={1} max={10} step={1} onChange={this.handlePathParams} />
          </label>
          <label>
            <h3>Model Threshold</h3>
            <input name='scoreThreshold' value={modelParams.scoreThreshold * 100} type='range' min={1} max={99} step={1} onChange={this.handlePathParams} />
          </label>
          <div className={s.ColorPickerContainer}>
            <SliderPicker onChangeComplete={this.handleStrokeColorChange} />
          </div>
        </div>
        <div className={s.WrapperOfDrawingBoards}>
          <canvas height={canvasHeight} width={canvasWidth} className={s.DrawingBoard} ref={this.setDrawingBoardRef} />
          <canvas height={canvasHeight} width={canvasWidth} id='UnDotted' className={s.DrawingBoard} ref={this.setDrawingBoardRef} />
          <video height={canvasHeight} width={canvasWidth} style={{border: '2px solid black'}} ref={this.setVideoEleRef}></video>
        </div>
      </div>
      );
  }
}

export default DrawingBoard

/**
 * beginPath()
 * 1. Creates a new path. Once created, future drawing commands are directed into the path and used to build the path up.
 * 2. Internally, paths are stored as a list of sub-paths (lines, arcs, etc) which together form a shape.
 * 3. **IMP** - Every time this method is called, the list is reset and we can start drawing new shapes.
 */

/**
 * moveTo(x, y)
 * 1. Doesn't actually draw anything but becomes part of the path list.
 * 2. You can probably best think of this as lifting a pen or pencil from one spot on a piece of paper and placing it on the next.
 * 3. When the canvas is initialized or beginPath() is called, you typically will want to use the moveTo() function to place the starting point somewhere else.
 * 4. We could also use moveTo() to draw unconnected paths.
 */