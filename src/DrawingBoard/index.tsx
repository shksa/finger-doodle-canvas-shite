import React from 'react';
import s from './DrawingBoard.module.css'

type CanvasInfo = {
  ref: HTMLCanvasElement,
  canvasContext: CanvasRenderingContext2D,
}

class DrawingBoard extends React.Component<{contextID: '2d'}> {

  canvases: Array<CanvasInfo> = []

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
  }

  attachDrawingBoardEvtListners() {
    const handleOnCanvasMouseMove = this.handleOnCanvasMouseMove
    const handleOnCanvasMouseEnter = this.handleOnCanvasMouseEnter
    this.canvases.forEach((canvasInfo) => {
      const {ref} = canvasInfo
      ref.onmouseenter = function (this: GlobalEventHandlers, ev: MouseEvent) {
        handleOnCanvasMouseEnter(ev, canvasInfo)
      }
      ref.onmousemove = function (this: GlobalEventHandlers, ev: MouseEvent) {
        handleOnCanvasMouseMove(ev, canvasInfo)
      }
      ref.onmouseleave = function (this: GlobalEventHandlers, ev: MouseEvent) {
        
      }
    })
  }

  handleOnCanvasMouseEnter = (ev: MouseEvent, canvasInfo: CanvasInfo) => {
    const {canvasContext, ref} = canvasInfo
    const {offsetX, offsetY} = ev
    canvasContext.beginPath() // resets path list
    canvasContext.moveTo(offsetX, offsetY) // initializes the path coordinate
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
    })
  }

  render() {
    return (
      <div className={s.DrawingBoardContainer}>
        <div>
          <button onClick={this.clearAllBoards} className={s.CanvasOption}>Clear</button>
        </div>
        <div className={s.WrapperOfDrawingBoards}>
          <canvas height={350} width={350} className={s.DrawingBoard} ref={this.setDrawingBoardRef} />
          <canvas height={350} width={350} id='UnDotted' className={s.DrawingBoard} ref={this.setDrawingBoardRef} />
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