import React, { useState, useEffect } from 'react';

function invokeVSCode(path: string) {
  console.log({ path });
  console.log({ window });
  (window as any).electronAPI.invokeVSCode(`${path}`);
}

/** Caution it will be invoked twice !! */
let loadTimes = 0;
function App() {
  console.log("App");

  const [pathInfoArray, setPathInfoArray] = useState([]);

  useEffect(() => {
    if (loadTimes > 0) {
      return;
    };
    loadTimes += 1;
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

    console.log("register onFocus");

    (window as any).electronAPI.onFocusWindow((_event: any) => {
      console.log("on focus !!!!!!")
      fetchData();
    })

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
