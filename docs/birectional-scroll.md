## Overview

This document outlines the implementation of the component for react-omni-scroll. This component allows users to seamlessly fetch and render data in both directions (upwards and downwards). It uses a dual-sentinel IntersectionObserver approach and a programmatic DOM-measurement hook to solve the "scroll jump" issue when prepending historical data.

## The Core Challenge: Scroll Preservation

When appending data to the bottom of a list, the browser naturally maintains the user's scrollTop position. However, when prepending data to the top, the browser inserts the DOM nodes, pushes existing content down, and the user visually loses their place.

To fix this, we implement a useLayoutEffect hook that calculates the "distance from the bottom" of the scroll container before the new items render, and synchronously restores that distance immediately after the render.

## 1\. Type Definitions

We standardize the API to ensure it feels cohesive with .

TypeScript

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`  import { ReactNode, UIEvent } from 'react';  export interface BidirectionalScrollProps {    /** The content to be rendered, typically an array of mapped elements */    children: ReactNode;    /** The total number of items currently rendered. Crucial for triggering scroll preservation math. */    dataLength: number;    /** Custom class name for the scroll container */    className?: string;    /** Optional callback to track scroll position (useful for "scroll to bottom" buttons) */    onScroll?: (e: UIEvent) => void;    // --- Upward (Historical) Scrolling ---    onLoadPrevious: () => void | Promise;    hasPrevious: boolean;    isLoadingPrevious: boolean;    previousLoader?: ReactNode;    // --- Downward (Future) Scrolling ---    onLoadNext: () => void | Promise;    hasNext: boolean;    isLoadingNext: boolean;    nextLoader?: ReactNode;    // --- Observer Options ---    rootMargin?: string;    threshold?: number | number[];  }  `

## 2\. The Scroll Preservation Hook (useScrollPreservation)

This is the "secret sauce" of the component. It locks the scroll position relative to the bottom of the container whenever new items are prepended.

TypeScript

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`  import { useLayoutEffect, useRef, RefObject } from 'react';  export const useScrollPreservation = (    containerRef: RefObject,    dataLength: number,    isLoadingPrevious: boolean  ) => {    const previousScrollHeight = useRef(0);    const previousScrollTop = useRef(0);    const isPrepending = useRef(false);    // 1. Capture DOM state right before we expect a prepend    useLayoutEffect(() => {      if (isLoadingPrevious && containerRef.current) {        isPrepending.current = true;        previousScrollHeight.current = containerRef.current.scrollHeight;        previousScrollTop.current = containerRef.current.scrollTop;      }    }, [isLoadingPrevious]);    // 2. Adjust scroll position synchronously after the render if data length changed    useLayoutEffect(() => {      if (isPrepending.current && containerRef.current) {        const container = containerRef.current;        const heightDifference = container.scrollHeight - previousScrollHeight.current;        // Instantly push the scrollbar down by the exact height of the newly inserted items        container.scrollTop = previousScrollTop.current + heightDifference;        isPrepending.current = false;      }    }, [dataLength]); // This triggers when the new items are officially in the DOM  };  `

## 3\. The Main Component (BidirectionalScroll)

This component maps the two sentinels (top and bottom) to their respective fetch triggers and wraps the children in an explicitly defined scroll container.

TypeScript

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`  import React, { useCallback, useRef, forwardRef, useImperativeHandle } from 'react';  // (Imports for useSentinelObserver, useScrollPreservation, types)  export const BidirectionalScroll = forwardRef(    (      {        children,        dataLength,        className = '',        onScroll,        onLoadPrevious,        hasPrevious,        isLoadingPrevious,        previousLoader,        onLoadNext,        hasNext,        isLoadingNext,        nextLoader,        rootMargin = '0px',        threshold = 0,      },      forwardedRef    ) => {      const internalContainerRef = useRef(null);      // Allow consumers to access the container ref if they passed one      useImperativeHandle(forwardedRef, () => internalContainerRef.current as HTMLDivElement);      // Initialize Scroll Preservation Math      useScrollPreservation(internalContainerRef, dataLength, isLoadingPrevious);      // --- Top Sentinel (Previous Data) ---      const handleIntersectTop = useCallback(() => {        if (hasPrevious && !isLoadingPrevious) onLoadPrevious();      }, [hasPrevious, isLoadingPrevious, onLoadPrevious]);      const setTopSentinelRef = useSentinelObserver({        root: internalContainerRef.current,        rootMargin,        threshold,        enabled: hasPrevious && !isLoadingPrevious,        onIntersect: handleIntersectTop,      });      // --- Bottom Sentinel (Next Data) ---      const handleIntersectBottom = useCallback(() => {        if (hasNext && !isLoadingNext) onLoadNext();      }, [hasNext, isLoadingNext, onLoadNext]);      const setBottomSentinelRef = useSentinelObserver({        root: internalContainerRef.current,        rootMargin,        threshold,        enabled: hasNext && !isLoadingNext,        onIntersect: handleIntersectBottom,      });      return (  `

        ``ref={internalContainerRef}           className={`react-omni-scroll-container ${className}`}          onScroll={onScroll}          style={{ overflowY: 'auto', height: '100%' }} // Enforce scrolling context        >          {/* Top Sentinel & Loader */}          {hasPrevious && (``

                  `)}          {hasPrevious && isLoadingPrevious && previousLoader}          {/* Payload */}          {children}          {/* Bottom Sentinel & Loader */}          {hasNext && isLoadingNext && nextLoader}          {hasNext && (                      )}      );    }  );  BidirectionalScroll.displayName = 'BidirectionalScroll';`

This implementation guarantees that your component is completely decoupled from business logic (like chat rooms) while providing a rock-solid, visually seamless experience when scrolling upwards into historical data.
