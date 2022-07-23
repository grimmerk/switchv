import React, { useState, useEffect } from 'react';

function invokeVSCode(path: string) {
  console.log({ path });
  console.log({ window });
  (window as any).electronAPI.invokeVSCode(`${path}`);
  /**
   * todo:
   * 1. x fetch win(project) path data from server 
   * 2. x use VSCode command line to open, e.g. send "code /Users/grimmer/git/vite-react-app" to Electron main process to execute
   * */
}

function App() {
  const [pathInfoArray, setPathInfoArray] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      console.log("fetchData")
      const url = "http://localhost:55688/xwins";

      try {
        const resp = await fetch(url);
        const json = await resp.json();
        console.log({ json })
        if (json.length === 0) {
          const fake = "/Users/grimmer/git/vite-react-app";
          setPathInfoArray([{ path: fake }])
        } else {
          setPathInfoArray(json)
        }
      } catch (err) {
        console.log({ err })
      }
    };

    fetchData();

  }, []);

  // update UI 
  const buttonList = pathInfoArray.map((pathInfo) => {
    const { path } = pathInfo;
    return (
      <div key={path} >
        <button onClick={(e) => {
          invokeVSCode(path)
        }} >
          {path}
        </button>
      </div>);
  })

  return (
    <div>
      <h1>Hello, XWin!</h1>
      {buttonList}
    </div>
  );
}

export default App;
