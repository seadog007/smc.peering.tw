import * as React from 'react';
import './Modal.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
  fullHeight?: boolean;
}

export default function Modal({ isOpen, onClose, title, children, maxWidth = '90vw', fullHeight = true }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div
        className={`modal-content ${fullHeight ? 'full-height' : ''}`}
        style={{ maxWidth }}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
