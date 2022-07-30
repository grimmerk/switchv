import React, { useState } from "react";
import "./button.css";

interface Props {
    children?: React.ReactNode;
    onClick: () => void;
}

export const HoverButton: React.FC<Props> = ({
    children,
    onClick,
}) => {
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
                className={display}
                onClick={onClick}
            >
                {display === "displayed" ?
                    children : null}
            </button>
        </div>
    );
}
