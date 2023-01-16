import React, { useState, useEffect, useRef, FC, useCallback } from 'react';

import Highlighter from 'react-highlight-words';

/** candidates */
// import SelectSearch from 'react-select-search';
// import GridTable from '@nadavshaar/react-grid-table';
import Select from 'react-select';

import { components, OptionProps } from 'react-select';
// const { Control }: { Control: any } = components;

import { HoverButton } from './HoverButton';

// const { BUILD_TYPE } = require('./build.json');
// console.log({ BUILD_TYPE })

import { isDebug } from './utility';
// console.log({ isDebug })

function invokeVSCode(path: string, optionPress = false) {
  // console.log({ path });
  // console.log({ window });
  // press option for VSCode -r --reuse-window
  // Force to open a file or folder in an already opened window.
  const option = `${optionPress ? "-r " : ""}`;
  // console.log({ cmd });
  (window as any).electronAPI.invokeVSCode(`${path}`, option);
}

function hideApp() {
  (window as any).electronAPI.hideApp();
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const SERVER_URL = "http://localhost:55688/xwins";

const deleteXWin = async (path: string) => {
  // console.log("deleteXwin,", path)
  const url = `${SERVER_URL}`

  let headers = {
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  await fetch(url, {
    body: JSON.stringify({ path }), method: 'DELETE', headers
  })
}

const retryFetchData = async (): Promise<any[]> => {
  if (isDebug) {
    console.log("retryFetchData")
  }
  const url = `${SERVER_URL}`

  let retryTimes = 20;
  let succeed = false;
  let json = [];
  while (!succeed && retryTimes > 0) {
    try {
      // at least 6/5*50 milliseconds needed for serve start time
      // most of the times are 7 or 6 times 
      /** TODO: use ping URL first */
      if (isDebug) {
        console.log("retry fetchData");
      }
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
  const searchWords = (inputValue ?? "").split(" ").filter((sub: string) => sub)

  const path = label.slice(0, label.lastIndexOf('/'));
  let name = label.slice(label.lastIndexOf('/') + 1);
  name = name.replace(/\.code-workspace/, ' (Workspace)');

  // api-ff.code-workspace -> api-ff (Workspace)

  return (
    <div style={{ display: "flex" }}>
      <div>
        <Highlighter
          searchWords={searchWords}
          textToHighlight={name}
        />
      </div>
      <div style={{ marginLeft: "10px", color: "#ccc" }}>
        <Highlighter
          searchWords={searchWords}
          textToHighlight={path}
        />
      </div>
    </div>
  );
};

export interface SelectInputOptionInterface {
  readonly value: string;
  readonly label: string;
  isDisabled: boolean;
  isSelected: boolean;
}

// ref
// 1. https://github.com/JedWatson/react-select/issues/4126#issuecomment-658955445
// 2. https://codesandbox.io/s/restless-brook-oe3qz3?file=/src/App.tsx:745-751
const OptionUI: FC<OptionProps<SelectInputOptionInterface>> = (props, onDeleteClick) => {
  const { selectOption, selectProps, data } = props;
  // console.log({ OptionUI })
  const { value, label } = data;

  return (
    <div
      key={value}
      style={{
        // padding: "2px",
        display: "flex",
        // border: "1px solid",
        // justifyContent: "space-between"
      }}
    >
      {/* <input type="checkbox" checked={props.isSelected} onChange={() => null} /> */}
      {/* <div> */}
      <components.Option {...props} />
      <div>
        <HoverButton width={25} onClick={() => {
          // console.log("delete:", data);
          if (onDeleteClick) {
            onDeleteClick(data);
          }
        }}>
          X
        </HoverButton>
      </div>


      {/* </div> */}

    </div >
  );
};

/** Caution it will be invoked twice due to <React.StrictMode> !! */
let loadTimes = 0;
function App() {

  const optionPress = useRef(false);

  const ref = useRef(null);
  const forceFocusOnInput = () => {
    ref.current.focus();
  };

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
      // console.log(`down"${e.keyCode};`);
      // 93: cmd. 18:option
      if (e.keyCode === OPTION_KEY) {
        optionPress.current = true;
      }
    }
    function handleKeyUp(e: any) {
      // console.log(`up"${e.keyCode}`);
      if (e.keyCode === OPTION_KEY) {
        optionPress.current = false;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('click', (e) => {
      // console.log("click");
      // e.preventDefault();
      forceFocusOnInput();
    });

    const fetchData = async () => {
      const json = await retryFetchData();
      // const resp = await fetch(url);
      // const json = await resp.json();
      // console.log({ json })
      // if (json.length === 0) {
      //   const fake = "~/git/vite-react-app";
      //   setPathInfoArray([{ path: fake }])
      // } else {
      if (json && Array.isArray(json)) {
        setPathInfoArray(json)
      }
      //}
    };

    // console.log("register onFocus");

    (window as any).electronAPI.onFocusWindow((_event: any) => {
      // console.log("on focus !!!!!!")
      fetchData();
    });

    (window as any).electronAPI.onXWinNotFound((_event: any) => {
      // console.log("onXWinNotFound !!!!!!")
      /** currently the popup message is done by electron native UI */
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

  const onDeleteClick = useCallback(async (data: any) => {
    // console.log("ondelete:", data)

    const { value } = data;
    await deleteXWin(value);

    const json = await retryFetchData();

    if (json && Array.isArray(json)) {
      setPathInfoArray(json)
    }
  }, []);



  const filterOptions = (
    candidate: { label: string; value: string; data: any },
    input: string
  ) => {
    let allFound = true;

    if (input) {
      const inputArray = input.split(" ");
      for (const subInput of inputArray) {
        if (subInput) {
          if (!candidate.value.includes(subInput)) {
            allFound = false;
            break;
          }
        }
      }
    } else {
      return true;
    }

    // false means all filtered (not match)
    return allFound;
  };


  return (
    <div
    >
      <Select
        filterOption={filterOptions}
        ref={ref}
        noOptionsMessage={() => {
          if (pathArray.length > 0) {
            // console.log("not found");
            return 'not found';
          }
          // console.log("no data");
          return 'no data';
        }}
        menuIsOpen={true}
        autoFocus={true}
        maxMenuHeight={450}
        inputValue={inputValue}
        value={selectedOptions}
        openMenuOnFocus={true}
        onKeyDown={(evt) => {
          // here first, then handleKeyDown
          // console.log("evt3:", evt.key);
          if (evt.key == "Escape") {
            // this will prevent "handleKeyDown"
            evt.stopPropagation();
            // it will prevent esc to empty input but still pass to handleKeyDown
            evt.preventDefault();

            if (inputValue) {
              // console.log("empty")
              setInputValue("")
            } else {
              // hide this app
              hideApp();
            }
          }
        }}
        onInputChange={(evt) => {
          setInputValue(evt);
        }}
        onChange={(evt: any) => {
          // setSelectedOptions(evt);
          invokeVSCode(evt.value, optionPress.current);
        }}
        // use selectProps instead of directly pass? https://stackoverflow.com/a/60375724/7354486?
        components={{ DropdownIndicator: null, Option: ((props) => OptionUI(props, onDeleteClick)) }}
        formatOptionLabel={formatOptionLabel}
        options={pathArray} />
    </div>
  );
}

export default App;
