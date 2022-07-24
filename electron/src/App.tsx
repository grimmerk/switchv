import React, { useState, useEffect, useRef } from 'react';

import Highlighter from 'react-highlight-words';

/** candidates */
// import SelectSearch from 'react-select-search';
// import GridTable from '@nadavshaar/react-grid-table';
import Select from 'react-select';
// import { components } from 'react-select';
// const { Control }: { Control: any } = components;


function invokeVSCode(path: string, optionPress = false) {
  console.log({ path });
  console.log({ window });
  // press option for VSCode -r --reuse-window
  // Force to open a file or folder in an already opened window.
  const cmd = `${optionPress ? "-r " : ""}${path}`;
  // console.log({ cmd });
  (window as any).electronAPI.invokeVSCode(`${cmd}`);
}

function hideApp() {
  (window as any).electronAPI.hideApp();
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

// const CustomControl = ({ children, ...props }: { children: any }) => (
//   < Control {...props}>
//     👍 {children}
//   </Control >
// );

// const options = [
//   { value: "Abe", label: "Abe", customAbbreviation: "A" },
//   { value: "John", label: "John", customAbbreviation: "J" },
//   { value: "Dustin", label: "Dustin", customAbbreviation: "D" }
// ];

/** highlight https://github.com/JedWatson/react-select/issues/5 */

const OPTION_KEY = 18

/** https://stackoverflow.com/questions/52819756/react-select-replacing-components-for-custom-option-content */
const formatOptionLabel = ({ value, label, customAbbreviation }: { value: any, label: any, customAbbreviation?: any }, { inputValue }: { inputValue: any }) => {
  // https://stackoverflow.com/a/34899885/7354486
  const path = label.slice(0, label.lastIndexOf('/'));
  const name = label.slice(label.lastIndexOf('/') + 1);
  return (
    <div style={{ display: "flex" }}>
      <div>
        <Highlighter
          searchWords={[inputValue]}
          textToHighlight={name}
        />
      </div>
      <div style={{ marginLeft: "10px", color: "#ccc" }}>
        <Highlighter
          searchWords={[inputValue]}
          textToHighlight={path}
        />
      </div>
    </div>
  );
};

/** Caution it will be invoked twice due to <React.StrictMode> !! */
let loadTimes = 0;
function App() {
  console.log("App");

  const optionPress = useRef(false);

  const [inputValue, setInputValue] = useState("");
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [pathInfoArray, setPathInfoArray] = useState([]);

  useEffect(() => {
    if (loadTimes > 0) {
      return;
    };
    loadTimes += 1;

    // cmd: 93
    function handleKeyDown(e: any) {
      console.log(`down"${e.keyCode};`);
      // 93: cmd. 18:option
      if (e.keyCode === OPTION_KEY) {
        optionPress.current = true;
      }
    }
    function handleKeyUp(e: any) {
      console.log(`up"${e.keyCode}`);
      if (e.keyCode === OPTION_KEY) {
        optionPress.current = false;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);


    const fetchData = async () => {
      const json = await retryFetchData();
      // const resp = await fetch(url);
      // const json = await resp.json();
      console.log({ json })
      // if (json.length === 0) {
      //   const fake = "~/git/vite-react-app";
      //   setPathInfoArray([{ path: fake }])
      // } else {
      setPathInfoArray(json)
      //}
    };

    console.log("register onFocus");

    (window as any).electronAPI.onFocusWindow((_event: any) => {
      console.log("on focus !!!!!!")
      fetchData();
    })

    fetchData();

    // Don't forget to clean up
    return function cleanup() {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    }
  }, []);

  const pathArray = pathInfoArray.map((pathInfo) => {
    const { path } = pathInfo;
    return {
      value: path,
      label: path
    }
  });

  // const styles = {
  //   container: (base: any) => ({
  //     ...base,
  //     height: '100%',
  //   })
  // };

  return (
    <div>
      <Select autoFocus={true}
        maxMenuHeight={450}
        // styles={styles}
        inputValue={inputValue}
        value={selectedOptions}
        openMenuOnFocus={true}
        onKeyDown={(evt) => {
          // here first, then handleKeyDown
          console.log("evt3:", evt.key);
          if (evt.key == "Escape") {
            // this will prevent "handleKeyDown"
            evt.stopPropagation();
            // it will prevent esc to empty input but still pass to handleKeyDown
            evt.preventDefault();

            if (inputValue) {
              console.log("empty")
              setInputValue("")
            } else {
              // hide this app
              hideApp();
            }
          }
        }}
        onInputChange={(evt) => {
          // console.log("evt:", evt);
          setInputValue(evt);
        }}
        onChange={(evt: any) => {
          console.log({ evt })
          // setSelectedOptions(evt);
          invokeVSCode(evt.value, optionPress.current);
        }}
        components={{ DropdownIndicator: null }}
        formatOptionLabel={formatOptionLabel}
        options={pathArray} />
    </div>
  );
}

export default App;
