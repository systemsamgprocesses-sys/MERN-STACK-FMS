
import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
    });

    if (mermaidRef.current) {
      mermaidRef.current.innerHTML = chart;
      mermaid.contentLoaded();
    }
  }, [chart]);

  return <div ref={mermaidRef} className="mermaid" />;
};

export default MermaidDiagram;
