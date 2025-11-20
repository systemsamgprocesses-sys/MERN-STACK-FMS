
import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');

  useEffect(() => {
    const renderDiagram = async () => {
      if (!chart) return;

      try {
        // Initialize mermaid with better configuration
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          flowchart: {
            useMaxWidth: false,
            htmlLabels: true,
            curve: 'basis',
            padding: 20,
          },
          themeVariables: {
            fontSize: '16px',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          }
        });

        // Generate unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        
        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(id, chart);
        setSvg(renderedSvg);
      } catch (error) {
        console.error('Error rendering Mermaid diagram:', error);
        // Fallback: show the raw chart as pre-formatted text
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `<pre style="text-align: left; padding: 20px; background: #f5f5f5; border-radius: 8px; overflow: auto;">${chart}</pre>`;
        }
      }
    };

    renderDiagram();
  }, [chart]);

  useEffect(() => {
    if (svg && mermaidRef.current) {
      mermaidRef.current.innerHTML = svg;
    }
  }, [svg]);

  return (
    <div 
      ref={mermaidRef} 
      className="mermaid-container w-full flex items-center justify-center"
      style={{ minHeight: '400px' }}
    />
  );
};

export default MermaidDiagram;
