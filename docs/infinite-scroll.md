## Overview

This document outlines the production-grade implementation of the component for react-omni-scroll. It upgrades the previous JavaScript implementation to strict TypeScript, ensures SSR compatibility, and shifts to a safer "Sentinel Node" pattern instead of cloning React children.

## Architectural Upgrades

- **Replacing cloneElement with Sentinels:** The previous code used React.cloneElement to attach the observer ref directly to the first or last child. This is a common anti-pattern in React libraries because if a consumer passes a custom component (e.g., ) that doesn't use forwardRef, the library breaks silently. Instead, we will inject a visually hidden, zero-pixel

  (a "sentinel") to act as the exact target for the observer.

- **SSR Safe Root Resolution:** When implementing scrollableTarget as a string, document.querySelector will crash if it runs on a server (like in Next.js). We will wrap the root resolution in a useEffect so it only fires on the client.
- **Strict Typing:** Exporting comprehensive interfaces ensures excellent IDE intellisense for consumers.

## 1\. Type Definitions

TypeScript

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML` import { ReactNode } from 'react';  export type ScrollDirection = 'top' | 'bottom';  export interface InfiniteScrollProps {    /** The content to be rendered inside the scroll container */    children: ReactNode;    /** Callback fired when the sentinel enters the viewport */    onLoadMore: () => void | Promise;    /** Boolean to indicate if more data can be fetched */    hasMore: boolean;    /** Boolean to prevent duplicate fetches while loading */    isLoading: boolean;    /** Optional element to display while loading new data */    loader?: ReactNode;    /** Optional element to display when hasMore is false */    endMessage?: ReactNode;    /** String selector (e.g., '#scroll-container') to use as the observer root. Defaults to viewport. */    scrollableTarget?: string;    /** Margin around the root. Can have values similar to the CSS margin property. */    rootMargin?: string;    /** Number between 0 and 1 indicating the percentage of the target's visibility needed to trigger. */    threshold?: number | number[];    /** Direction to append new items. Defaults to 'bottom'. */    direction?: ScrollDirection;  } `

## 2\. The Root Resolver Hook (useResolvedRoot)

This hook safely resolves the scrollableTarget string into an actual HTMLElement, ensuring it does not break during Server-Side Rendering.

TypeScript

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML` import { useState, useEffect } from 'react';  export const useResolvedRoot = (scrollableTarget?: string): Element | null | undefined => {    const [root, setRoot] = useState(undefined);    useEffect(() => {      if (typeof window === 'undefined') return;      if (scrollableTarget) {        const element = document.querySelector(scrollableTarget);        setRoot(element);      } else {        // If no target provided, observer defaults to browser viewport (null)        setRoot(null);      }    }, [scrollableTarget]);    return root;  }; `

## 3\. The Observer Hook (useSentinelObserver)

A modernized version of the custom observer hook, fully typed. It uses a callback ref approach to gracefully handle elements mounting and unmounting.

TypeScript

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML` import { useEffect, useRef, useCallback } from 'react';  interface UseSentinelObserverProps {    root?: Element | null;    rootMargin?: string;    threshold?: number | number[];    enabled: boolean;    onIntersect: () => void;  }  export const useSentinelObserver = ({    root,    rootMargin,    threshold,    enabled,    onIntersect,  }: UseSentinelObserverProps) => {    const observerRef = useRef(null);    const targetRef = useRef(null);    const onIntersectRef = useRef(onIntersect);    // Keep callback fresh without re-triggering the observer    useEffect(() => {      onIntersectRef.current = onIntersect;    }, [onIntersect]);    useEffect(() => {      if (!enabled) {        observerRef.current?.disconnect();        return;      }      observerRef.current = new IntersectionObserver(        ([entry]) => {          if (entry.isIntersecting) {            onIntersectRef.current();          }        },        { root, rootMargin, threshold }      );      if (targetRef.current) {        observerRef.current.observe(targetRef.current);      }      return () => observerRef.current?.disconnect();    }, [enabled, root, rootMargin, threshold]);    const setTargetNode = useCallback((node: Element | null) => {      if (targetRef.current && observerRef.current) {        observerRef.current.unobserve(targetRef.current);      }      targetRef.current = node;      if (node && observerRef.current) {        observerRef.current.observe(node);      }    }, []);    return setTargetNode;  }; `

## 4\. The Main Component (InfiniteScroll)

The final component stitches it all together, replacing React.cloneElement with an explicit, visually hidden sentinel

.

TypeScript

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML` import React, { useCallback } from 'react';  // (Imports for types and hooks here)  export const InfiniteScroll: React.FC = ({    children,    onLoadMore,    hasMore,    isLoading,    loader,    endMessage,    scrollableTarget,    rootMargin = '0px',    threshold = 0,    direction = 'bottom',  }) => {    const root = useResolvedRoot(scrollableTarget);    const handleIntersect = useCallback(() => {      if (hasMore && !isLoading) {        onLoadMore();      }    }, [hasMore, isLoading, onLoadMore]);    const setSentinelRef = useSentinelObserver({      root,      rootMargin,      threshold,      enabled: hasMore && !isLoading,      onIntersect: handleIntersect,    });    const isTop = direction === 'top';    return ( `

          `{isTop && (          <>            {!hasMore && !isLoading && endMessage}            {hasMore && isLoading && loader}`

          `{hasMore &&   }        )}        {children}        {!isTop && (          <>            {hasMore &&   }            {hasMore && isLoading && loader}            {!hasMore && !isLoading && endMessage}        )}    );  };`

This plan removes the brittle element cloning, adds bulletproof TypeScript support, and safely accommodates SSR environments like Next.js.

Would you like me to draft the implementation plan for bidirectional-scroll.md next, focusing on that critical useLayoutEffect DOM-measuring logic we discussed?
