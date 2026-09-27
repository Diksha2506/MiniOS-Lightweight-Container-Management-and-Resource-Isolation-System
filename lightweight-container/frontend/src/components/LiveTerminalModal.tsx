import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, X } from 'lucide-react';

interface LiveTerminalModalProps {
  containerName: string;
  onClose: () => void;
}

export default function LiveTerminalModal({ containerName, onClose }: LiveTerminalModalProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Open websocket
    const ws = new WebSocket(`ws://localhost:8000/api/containers/${containerName}/logs`);
    
    ws.onmessage = (event) => {
      setLogs((prev) => [...prev, event.data]);
    };

    ws.onerror = (err) => {
      setLogs((prev) => [...prev, `\n[WebSocket Error] Connection failed.`]);
    };

    ws.onclose = () => {
      setLogs((prev) => [...prev, `\n[WebSocket] Connection closed.`]);
    };

    return () => {
      ws.close();
    };
  }, [containerName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-950 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col border border-gray-800" style={{ height: '70vh' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-2 text-gray-400">
            <TerminalIcon size={16} className="text-blue-400" />
            <span className="text-sm font-mono font-medium">Live Terminal: {containerName}</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Terminal Output */}
        <div className="flex-1 p-4 overflow-y-auto font-mono text-sm text-gray-300 whitespace-pre-wrap select-text">
          {logs.map((log, index) => (
            <span key={index}>{log}</span>
          ))}
          {logs.length === 0 && <span className="text-gray-600 italic">Waiting for output...</span>}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
