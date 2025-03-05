/** https://atlassian.design/components/popup/examples */
import Button from '@atlaskit/button';
import Popup from '@atlaskit/popup';
import { css } from '@emotion/react';
import { useState } from 'react';
import { closeAppClick, openFolderSelector } from './App';

const contentStyles = css({
  padding: 15,
  width: 600,
});

const PopupDefaultExample = ({
  workingFolderPath,
  saveCallback,
  openCallback,
}: {
  workingFolderPath?: string;
  saveCallback?: any;
  openCallback?: any;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Popup
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      placement="bottom-start"
      content={(props) => (
        <div css={contentStyles}>
          <div style={{ display: 'flex' }}>
            <div style={{ alignItems: 'center', display: 'flex' }}>
              <div style={{ color: '#6A9955' }}>{'working folder:'}</div>
              <div style={{ color: '#ccc', padding: 5 }}>
                {`${workingFolderPath}`}
              </div>
            </div>

            <div style={{ flex: 1 }}></div>
            <div>
              <Button
                onClick={() => {
                  openFolderSelector();
                }}
              >
                Select
              </Button>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'flex-end',
              margin: 8,
            }}
          >
            <Button
              onClick={() => {
                // const window = BrowserWindow.getFocusedWindow();
                // window.close();
                closeAppClick();
              }}
              appearance="warning"
            >
              {'[> Quit SwitchV'}
            </Button>
          </div>
        </div>
      )}
      trigger={(triggerProps) => (
        <Button
          {...triggerProps}
          // appearance="primary"
          isSelected={isOpen}
          onClick={() => {
            if (openCallback) {
              openCallback();
            }
            setIsOpen(!isOpen);
          }}
        >
          {isOpen ? '...' : '...'}
        </Button>
      )}
    />
  );
};

export default PopupDefaultExample;
