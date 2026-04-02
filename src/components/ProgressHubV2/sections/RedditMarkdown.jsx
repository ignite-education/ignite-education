import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components = {
  a: ({ node, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
};

const RedditMarkdown = ({ content, className = '' }) => (
  <div className={`reddit-md ${className}`}>
    <style>{`
      .reddit-md p { margin-bottom: 0.5em; }
      .reddit-md p:last-child { margin-bottom: 0; }
      .reddit-md ul { list-style-type: disc; padding-left: 1.25rem; margin: 0.5em 0; }
      .reddit-md ol { list-style-type: decimal; padding-left: 1.25rem; margin: 0.5em 0; }
      .reddit-md li { margin-bottom: 0.25em; }
      .reddit-md li > ul, .reddit-md li > ol { margin: 0.25em 0; }
      .reddit-md blockquote { border-left: 2px solid #a855f7; padding-left: 0.75rem; font-style: italic; opacity: 0.8; margin: 0.5em 0; }
      .reddit-md pre { background: rgba(0,0,0,0.4); padding: 0.75rem; border-radius: 0.375rem; overflow-x: auto; margin: 0.5em 0; }
      .reddit-md code { background: rgba(255,255,255,0.1); padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.85em; }
      .reddit-md pre code { background: none; padding: 0; }
      .reddit-md h1, .reddit-md h2, .reddit-md h3 { font-weight: 600; margin: 0.75em 0 0.25em; }
      .reddit-md h1 { font-size: 1.1em; }
      .reddit-md h2 { font-size: 1.05em; }
      .reddit-md h3 { font-size: 1em; }
      .reddit-md hr { border-color: rgba(255,255,255,0.2); margin: 0.5em 0; }
      .reddit-md a { color: #c084fc; text-decoration: underline; }
      .reddit-md a:hover { color: #d8b4fe; }
      .reddit-md strong { font-weight: 600; }
      .reddit-md table { border-collapse: collapse; width: 100%; margin: 0.5em 0; }
      .reddit-md th, .reddit-md td { border: 1px solid rgba(255,255,255,0.2); padding: 0.25rem 0.5rem; text-align: left; }
      .reddit-md th { font-weight: 600; }
      .reddit-md del { opacity: 0.5; }
    `}</style>
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content || ''}
    </ReactMarkdown>
  </div>
);

export default RedditMarkdown;
