import { FC, useCallback, useEffect, useRef, useState } from 'react';
import Highlighter from 'react-highlight-words';
import Select, { components, OptionProps } from 'react-select';
import { HoverButton } from './HoverButton';
import PopupDefaultExample from './popup';
import { isDebug } from './utility';

function invokeVSCode(path: string, optionPress = false) {
  // press option for VSCode -r --reuse-window
  // Force to open a file or folder in an already opened window.
  const option = `${optionPress ? '-r ' : ''}`;
  (window as any).electronAPI.invokeVSCode(`${path}`, option);
}

function hideApp() {
  (window as any).electronAPI.hideApp();
}

function searchWorkingFolder(path: string) {
  (window as any).electronAPI.searchWorkingFolder(path);
}

export function openFolderSelector() {
  (window as any).electronAPI.openFolderSelector();
}

export function closeAppClick() {
  (window as any).electronAPI.closeAppClick();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SERVER_URL = 'http://localhost:55688';

const fetchWorkingFolder = async (): Promise<{
  id: number;
  workingFolder?: string;
}> => {
  console.log('fetchWorkingFolder');
  const url = `${SERVER_URL}/user`;
  const resp = await fetch(url);
  const json = await resp.json();
  return json;
};

const saveWorkingFolder = async (workingFolder: string) => {
  const url = `${SERVER_URL}/user`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const resp = await fetch(url, {
    body: JSON.stringify({ workingFolder }),
    method: 'POST',
    headers,
  });
  const json = await resp.json();
  return json;
};

const deleteXWin = async (path: string) => {
  const url = `${SERVER_URL}/xwins`;

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  await fetch(url, {
    body: JSON.stringify({ path }),
    method: 'DELETE',
    headers,
  });
};

const retryFetchXwinData = async (): Promise<any[]> => {
  if (isDebug) {
    console.log('retryFetchData');
  }
  const url = `${SERVER_URL}/xwins`;

  let retryTimes = 20;
  let succeed = false;
  let json = [];
  while (!succeed && retryTimes > 0) {
    try {
      // at least 6/5*50 milliseconds needed for serve start time
      // most of the times are 7 or 6 times
      if (isDebug && retryTimes != 20) {
        console.log('retrying fetchData');
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
};

const OPTION_KEY = 18;

/** https://stackoverflow.com/questions/52819756/react-select-replacing-components-for-custom-option-content */
const formatOptionLabel = (
  {
    value,
    label,
    everOpened,
  }: { value: string; label: string; everOpened: boolean },
  { inputValue }: { inputValue: string },
) => {
  // https://stackoverflow.com/a/34899885/7354486
  const searchWords = (inputValue ?? '')
    .split(' ')
    .filter((sub: string) => sub);

  const path = label.slice(0, label.lastIndexOf('/'));
  let name = label.slice(label.lastIndexOf('/') + 1);
  name = name.replace(/\.code-workspace/, ' (Workspace)');

  const nameStyle: any = {};
  const pathStyle: any = {};
  if (!everOpened) {
    nameStyle['color'] = '#6A9955';
    pathStyle['color'] = '#ccc';
  }

  return (
    <div style={{ display: 'flex', ...nameStyle }}>
      <div>
        <Highlighter searchWords={searchWords} textToHighlight={name} />
      </div>
      <div style={{ marginLeft: '10px', color: 'grey', ...pathStyle }}>
        <Highlighter searchWords={searchWords} textToHighlight={path} />
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
const OptionUI: FC<OptionProps<SelectInputOptionInterface>> = (
  props,
  onDeleteClick,
) => {
  const { selectOption, selectProps, data } = props;
  const { value, label } = data;

  return (
    <div
      key={value}
      style={{
        // padding: "2px",
        display: 'flex',
        // border: "1px solid",
        // justifyContent: "space-between"
      }}
    >
      {/* <input type="checkbox" checked={props.isSelected} onChange={() => null} /> */}
      {/* <div> */}
      <components.Option {...props} />
      <div>
        <HoverButton
          width={25}
          onClick={() => {
            if (onDeleteClick) {
              onDeleteClick(data);
            }
          }}
        >
          X
        </HoverButton>
      </div>
    </div>
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

  const [inputValue, setInputValue] = useState('');
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [pathInfoArray, setPathInfoArray] = useState([]);
  const [workingFolderPath, setWorkingFolderPath] = useState('');
  const [workingPathInfoArray, setWorkingPathInfoArray] = useState([]);

  const updateWorkingPathUIAndList = async (path: string) => {
    setWorkingFolderPath(path);

    if (path) {
      searchWorkingFolder(path);
    }
  };

  const fetchXWinData = async () => {
    const json = await retryFetchXwinData();

    if (json && Array.isArray(json)) {
      setPathInfoArray(json);
    }
  };

  const fetchWorkingFolderAndUpdate = async () => {
    const user = await fetchWorkingFolder();
    updateWorkingPathUIAndList(user.workingFolder);
  };

  useEffect(() => {
    if (loadTimes > 0) {
      return;
    }
    loadTimes += 1;

    function handleKeyDown(e: any) {
      // 93: cmd. 18:option
      if (e.keyCode === OPTION_KEY) {
        optionPress.current = true;
      }
    }
    function handleKeyUp(e: any) {
      if (e.keyCode === OPTION_KEY) {
        optionPress.current = false;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('click', (e) => {
      forceFocusOnInput();
    });

    (window as any).electronAPI.onFocusWindow((_event: any) => {
      fetchXWinData();

      /** pros: use the latest list
       * cons: query workingFolder multiple times
       */
      fetchWorkingFolderAndUpdate();
    });

    (window as any).electronAPI.onWorkingFolderIterated(
      async (_event: any, paths: string[]) => {
        setWorkingPathInfoArray(paths);
      },
    );

    (window as any).electronAPI.onXWinNotFound((_event: any) => {
      /** currently the popup message is done by electron native UI */
    });

    (window as any).electronAPI.onFolderSelected(
      async (_event: any, folderPath: string) => {
        if (!folderPath) {
          return;
        }

        const resp = await saveWorkingFolder(folderPath);
        if (resp?.status === 'ok') {
          updateWorkingPathUIAndList(folderPath);
        } else {
          /**
           * roll back to old path
           * NOTE: show some alert
           */
          (window as any).electronAPI.popupAlert('failed to save');
        }
      },
    );

    /** pros: query one time in early stage
     * cons: it may need to retry when it is starting
     * also onFocusWindow will be triggered when the 1st time cmd +ctrl +r is used
     * redundant
     */
    /** onFocusWindow will trigger it, buf if we use cmd + w to close it,
     * then we must call it here, onFocusWindow will not be triggered in that case
     */
    fetchXWinData();
    fetchWorkingFolderAndUpdate();

    // Don't forget to clean up
    return function cleanup() {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const openPathSet = new Set();
  const openPathArray = pathInfoArray.map((pathInfo) => {
    const { path } = pathInfo;
    openPathSet.add(path);
    return {
      value: path,
      label: path,
      everOpened: true,
    };
  });

  const workingInfoArray: Array<{
    value: string;
    label: string;
    everOpened: boolean;
  }> = [];
  workingPathInfoArray.forEach((path: string) => {
    if (!openPathSet.has(path)) {
      workingInfoArray.push({
        value: path,
        label: path,
        everOpened: false,
      });
    }
  });
  const pathArray = openPathArray.concat(workingInfoArray);
  console.log({
    openPathArray: openPathArray.length,
    workingPathInfoArray: workingPathInfoArray.length,
    pathArray: pathArray.length,
  });

  const onDeleteClick = useCallback(async (data: any) => {
    const { value } = data;
    await deleteXWin(value);

    fetchXWinData();
  }, []);

  const filterOptions = (
    candidate: { label: string; value: string; data: any },
    input: string,
  ) => {
    let allFound = true;
    const target = candidate.value.toLowerCase();

    if (input) {
      const inputArray = input.toLowerCase().split(' ');
      for (const subInput of inputArray) {
        if (subInput) {
          if (!target.includes(subInput)) {
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
    <div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-end',
        }}
      >
        <PopupDefaultExample workingFolderPath={workingFolderPath} />
      </div>

      <Select
        filterOption={filterOptions}
        ref={ref}
        noOptionsMessage={() => {
          if (pathArray.length > 0) {
            return 'not found';
          }
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
          if (evt.key == 'Escape') {
            // this will prevent "handleKeyDown"
            evt.stopPropagation();
            // it will prevent esc to empty input but still pass to handleKeyDown
            evt.preventDefault();

            if (inputValue) {
              setInputValue('');
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
          invokeVSCode(evt.value, optionPress.current);
        }}
        // use selectProps instead of directly pass? https://stackoverflow.com/a/60375724/7354486?
        components={{
          DropdownIndicator: null,
          Option: (props) => OptionUI(props, onDeleteClick),
        }}
        formatOptionLabel={formatOptionLabel}
        options={pathArray}
      />
    </div>
  );
}

export default App;
