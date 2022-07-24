import React, { useState, useEffect } from 'react';

/** candidates */
// import SelectSearch from 'react-select-search';
// import GridTable from '@nadavshaar/react-grid-table';
import Select from 'react-select';

function invokeVSCode(path: string) {
  console.log({ path });
  console.log({ window });
  (window as any).electronAPI.invokeVSCode(`${path}`);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const retryFetchData = async (): Promise<any[]> => {
  console.log("fetchData")
  const url = "http://localhost:55688/xwins";

  let retryTimes = 20;
  let succeed = false;
  let json = [];
  while (!succeed && retryTimes > 0) {
    try {
      // at least 6/5*50 milliseconds needed for serve start time
      // most of the times are 7 or 6 times 
      console.log("retry fetchData");
      const resp = await fetch(url);
      json = await resp.json();
      succeed = true;
    } catch (err) {
      retryTimes -= 1;
      await sleep(50);
    }
  }
  return json;
}

const options = [
  { value: 'blues', label: 'Blues' },
  { value: 'rock', label: 'Rock' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'orchestra', label: 'Orchestra' }
];

// const SelectSearchOptions = [
//   { name: 'Swedish', value: 'sv' },
//   { name: 'English', value: 'en' },
// ];

/** Caution it will be invoked twice due to <React.StrictMode> !! */
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
      const json = await retryFetchData();
      // const resp = await fetch(url);
      // const json = await resp.json();
      console.log({ json })
      if (json.length === 0) {
        const fake = "/Users/grimmer/git/vite-react-app";
        setPathInfoArray([{ path: fake }])
      } else {
        setPathInfoArray(json)
      }
    };

    console.log("register onFocus");

    (window as any).electronAPI.onFocusWindow((_event: any) => {
      console.log("on focus !!!!!!")
      fetchData();
    })

    fetchData();

  }, []);

  const pathArray = pathInfoArray.map((pathInfo) => {
    const { path } = pathInfo;
    return {
      value: path,
      label: path
    }
  });

  return (
    <div>
      {/* <SelectSearch search={true} options={SelectSearchOptions} placeholder="Choose your language" /> */}
      <Select autoFocus={true}
        openMenuOnFocus={true}
        onChange={(evt) => {
          console.log({ evt })
          invokeVSCode(evt.value)
        }}
        components={{ DropdownIndicator: null }}
        options={pathArray} />
    </div>
  );
}

export default App;
