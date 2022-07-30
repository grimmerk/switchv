import React, { useState } from "react";
import "./button.css";

interface Props {
    height?: number;
    width?: number;
    children?: React.ReactNode;
    onClick: () => void;
}

export const HoverButton: React.FC<Props> = (props) => {
    const { children, onClick, ...style } = props;
    const [display, setDisplay] = useState("notdisplayed");
    return (
        <div
            onMouseEnter={(e) => {
                e.preventDefault();
                console.log("enter")
                setDisplay("displayed");
            }}
            onMouseLeave={(e) => {
                e.preventDefault();
                console.log("leave");
                setDisplay("notdisplayed");
            }}>
            <button
                style={style}
                className={display}
                onClick={onClick}
            >
                {display === "displayed" ?
                    children : null}
            </button>
        </div>
    );
}
