import React from 'react';
import s from './App.module.css';
import DrawingBoard from './DrawingBoard';

class App extends React.Component<{}, {hasError: boolean, contextID: '2d'}> {

  constructor(props: any) {
    super(props);
    this.state = { hasError: false, contextID: '2d' };
  }

  componentDidCatch(error: Error) {
    // Display fallback UI
    this.setState({ hasError: true });
    // You can also log the error to an error reporting service
    // logErrorToMyService(error, info);
  }

  setFallbackContextID = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    this.setState({ hasError: false, contextID: '2d' })
  }

  render() {
    const {contextID, hasError} = this.state
    return (
      <div className={s.App}>
        {
          hasError 
          ?
          <div className={s.OnErrorFallback}>
            <h2>could not get WebGL context for the canvas element. falling back to 2D context instead</h2>
            <button onClick={this.setFallbackContextID} className={s.OkButton}>OK</button>
          </div> 
          :
          <DrawingBoard contextID={contextID} />
        }
      </div>
    )
  }
}

export default App;
