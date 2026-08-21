import React from 'react';

/**
 * The app logo.
 *
 * Renders `/crayon-favicon.svg` — the same file the browser tab uses — so the
 * mark on screen and the mark in the tab strip can never drift apart. It used
 * to be rebuilt here out of rotated divs, which meant two definitions of one
 * logo and two places to change it.
 */
export default function CrayonLogo({ size = 120, showText = true, textClass = 'text-2xl' }) {
  return (
    <div className="flex flex-col items-center select-none">
      <img
        src="/crayon-favicon.svg"
        width={size}
        height={size}
        // The wordmark below already names the app; repeating it here would
        // make a screen reader say it twice.
        alt={showText ? '' : 'Crayon Cookout'}
        aria-hidden={showText ? 'true' : undefined}
        style={{ width: size, height: size }}
        draggable="false"
      />
      {showText && (
        <h1 className={`rainbow-text font-display font-bold ${textClass} mt-1 tracking-tight`}>
          Crayon Cookout
        </h1>
      )}
    </div>
  );
}
