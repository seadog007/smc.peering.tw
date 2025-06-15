import React from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles['modal-overlay']}>
      <div className={styles['modal-content']}>
        <div className={styles['modal-header']}>
          <h2 className={styles['modal-title']}>{title}</h2>
          <button className={styles['modal-close']} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles['modal-body']}>
          {children}
        </div>
      </div>
    </div>
  );
} 