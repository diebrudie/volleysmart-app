import React from "react";

const URL_REGEX = /(https?:\/\/[^\s<]+)/g;

export const Linkify: React.FC<{ children: string; className?: string }> = ({
  children,
  className,
}) => {
  const parts = children.split(URL_REGEX);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline break-all"
          >
            {part}
          </a>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </span>
  );
};
