import React from 'react';

const ConfirmationModal = ({ isOpen, message, onConfirm, onCancel, confirmText = "Yes", cancelText = "No" }) => {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000,
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '20px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                maxWidth: '320px',
                width: '90%',
                textAlign: 'center',
                fontFamily: "'Outfit', sans-serif",
            }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#1E293B' }}>{message}</h3>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: '#F1F5F9',
                            color: '#64748B',
                            fontWeight: '700',
                            cursor: 'pointer',
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: '#EF4444',
                            color: 'white',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)',
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
