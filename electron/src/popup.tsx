/** @jsx jsx */

/** https://atlassian.design/components/popup/examples */

import { useState } from 'react';

import { css, jsx } from '@emotion/react';

import Button from '@atlaskit/button';
// import Button from '@atlaskit/button/standard-button';

import Popup from '@atlaskit/popup';

import { openFolderSelector } from "./App"

// import { useFilePicker } from "use-file-picker";

const contentStyles = css({
    padding: 15,
    width: 600
});

// const content = '/Users/grimmer/git/xwin/server/src/xwins'

// {sum, logMessage, doSomething}: ButtonProps

const PopupDefaultExample = ({ folderPath }: { folderPath?: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Popup
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            placement="bottom-start"
            content={(props) =>
                <div css={contentStyles}>
                    <div style={{ display: "flex" }}>
                        <div style={{ alignItems: "center", display: "flex" }}>
                            <div>
                                {"working folder:"}
                                {folderPath}
                            </div>
                        </div>

                        <div style={{ flex: 1 }}>
                        </div>
                        <div >
                            <Button
                                onClick={() => {
                                    openFolderSelector()
                                    props.update();
                                    // setIsOpen(!isOpen)
                                }}>
                                Select
                            </Button>
                        </div>
                        <div >
                            <Button appearance="primary">
                                Save
                            </Button>
                        </div>

                    </div>
                </div >}
            trigger={(triggerProps) => (
                <Button
                    {...triggerProps}
                    // appearance="primary"
                    isSelected={isOpen}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? '...' : '...'}
                </Button>
            )}
        />
    );
};

export default PopupDefaultExample;