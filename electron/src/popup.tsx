/** @jsx jsx */
import { useState } from 'react';

import { css, jsx } from '@emotion/react';

import Button from '@atlaskit/button';
// import Button from '@atlaskit/button/standard-button';

import Popup from '@atlaskit/popup';

const contentStyles = css({
    padding: 15,
});

const content = '/Users/grimmer/git/xwin/server/src/xwins'

const PopupDefaultExample = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Popup
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            placement="bottom-start"
            content={() =>
                <div css={contentStyles}>
                    {content}
                    <Button
                    >Select project path</Button>
                    <Button appearance="primary">Save</Button>
                </div>}
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