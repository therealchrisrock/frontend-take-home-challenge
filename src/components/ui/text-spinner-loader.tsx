import React from "react";
import "~/styles/text-spinner.css";

export default function TextSpinnerLoader() {
  const text = "GOOD LUCK, HAVE FUN AND GG";
  const characters = text.split("");

  const radius = 80;
  const fontSize = "18px";
  const letterSpacing = 12.5;

  return (
    <div className="text-spinner-circle" style={{ width: radius * 2 }}>
      <p aria-label={text} />
      <p aria-hidden="true" className="text-spinner-text">
        {characters.map((ch, i) => (
          <span
            key={i}
            className={`text-spinner-letter letter-${i}`}
            style={{
              transformOrigin: `0 ${radius}px`,
              transform: `rotate(${i * letterSpacing}deg)`,
              fontSize,
              animationDelay: `${i * 0.035}s`,
            }}
          >
            {ch}
          </span>
        ))}
      </p>
    </div>
  );
}
