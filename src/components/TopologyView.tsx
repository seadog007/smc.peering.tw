import React from 'react';
import './TopologyView.css';

interface Node {
  id: string;
  name: string;
  type: 'smc' | 'iisp' | 'eisp';
  x: number;
  y: number;
}

interface Connection {
  from: string;
  to: string;
}

const TopologyView: React.FC = () => {
  // Define the network topology data
  const nodes: Node[] = [
    // SMC Layer (Submarine Cables)
    { id: 'smc1', name: 'SMC1', type: 'smc', x: 20, y: 20 },
    { id: 'smc2', name: 'SMC2', type: 'smc', x: 40, y: 20 },
    { id: 'smc3', name: 'SMC3', type: 'smc', x: 60, y: 20 },
    
    // I.ISP Layer (International ISPs)
    { id: 'iisp1', name: 'I.ISP1', type: 'iisp', x: 20, y: 50 },
    { id: 'iisp2', name: 'I.ISP2', type: 'iisp', x: 40, y: 50 },
    { id: 'iisp3', name: 'I.ISP3', type: 'iisp', x: 60, y: 50 },
    { id: 'iisp4', name: 'I.ISP4', type: 'iisp', x: 80, y: 50 },
    
    // E.ISP Layer (End-user ISPs)
    { id: 'eisp1', name: 'E.ISP1', type: 'eisp', x: 20, y: 80 },
    { id: 'eisp2', name: 'E.ISP2', type: 'eisp', x: 40, y: 80 },
    { id: 'eisp3', name: 'E.ISP3', type: 'eisp', x: 60, y: 80 },
    { id: 'eisp4', name: 'E.ISP4', type: 'eisp', x: 80, y: 80 },
  ];

  const connections: Connection[] = [
    // SMC to I.ISP connections
    { from: 'smc1', to: 'iisp1' },
    { from: 'smc1', to: 'iisp3' },
    { from: 'smc2', to: 'iisp2' },
    { from: 'smc2', to: 'iisp4' },
    { from: 'smc3', to: 'iisp3' },
    { from: 'smc3', to: 'iisp4' },
    
    // I.ISP to E.ISP connections
    { from: 'iisp1', to: 'eisp1' },
    { from: 'iisp1', to: 'eisp2' },
    { from: 'iisp2', to: 'eisp1' },
    { from: 'iisp3', to: 'eisp1' },
    { from: 'iisp3', to: 'eisp3' },
    { from: 'iisp4', to: 'eisp2' },
    { from: 'iisp4', to: 'eisp4' },
  ];

  const getNodeClass = (type: string) => {
    switch (type) {
      case 'smc': return 'node-smc';
      case 'iisp': return 'node-iisp';
      case 'eisp': return 'node-eisp';
      default: return 'node-default';
    }
  };

  const getConnectionPath = (fromNode: Node, toNode: Node) => {
    const startX = fromNode.x;
    const startY = fromNode.y;
    const endX = toNode.x;
    const endY = toNode.y;
    
    // Create a curved path for better visualization
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const controlOffset = Math.abs(endY - startY) * 0.3;
    
    return `M ${startX} ${startY} Q ${midX} ${midY - controlOffset} ${endX} ${endY}`;
  };

  return (
    <div className="topology-view">
      <div className="topology-header">
        <h3>Network Topology</h3>
        <div className="topology-legend">
          <div className="legend-item">
            <div className="legend-color smc"></div>
            <span>Submarine Cable (SMC)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color iisp"></div>
            <span>International ISP (I.ISP)</span>
          </div>
          <div className="legend-item">
            <div className="legend-color eisp"></div>
            <span>End-user ISP (E.ISP)</span>
          </div>
        </div>
      </div>
      
      <div className="topology-svg-container">
        <svg viewBox="0 0 100 100" className="topology-svg">
          {/* Render connections */}
          {connections.map((connection, index) => {
            const fromNode = nodes.find(n => n.id === connection.from);
            const toNode = nodes.find(n => n.id === connection.to);
            
            if (!fromNode || !toNode) return null;
            
            return (
              <path
                key={index}
                d={getConnectionPath(fromNode, toNode)}
                className="connection-line"
                fill="none"
                stroke="#4a90e2"
                strokeWidth="0.5"
                markerEnd="url(#arrowhead)"
              />
            );
          })}
          
          {/* Render nodes */}
          {nodes.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r="3"
                className={`topology-node ${getNodeClass(node.type)}`}
              />
              <text
                x={node.x}
                y={node.y + 6}
                className="node-label"
                textAnchor="middle"
                fontSize="2"
                fill="#fff"
              >
                {node.name}
              </text>
            </g>
          ))}
          
          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#4a90e2"
              />
            </marker>
          </defs>
        </svg>
      </div>
      
      <div className="topology-description">
        <h4>Network Flow</h4>
        <div className="flow-description">
          <p><strong>SMC Layer:</strong> Submarine cables provide international connectivity</p>
          <p><strong>I.ISP Layer:</strong> International ISPs aggregate and distribute traffic</p>
          <p><strong>E.ISP Layer:</strong> End-user ISPs provide services to consumers</p>
        </div>
      </div>
    </div>
  );
};

export default TopologyView;
