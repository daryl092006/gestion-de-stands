import React from 'react';

export const Loader: React.FC<{ fullPage?: boolean }> = ({ fullPage = false }) => {
    const loaderContent = (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div className="spinner" />
            <p style={{ color: '#6366f1', fontWeight: 600, fontSize: '14px', letterSpacing: '1px' }}>
                CHARGEMENT...
            </p>
            <style>{`
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #6366f1;
          border-radius: 50%;
          animation: spin 1s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );

    if (fullPage) {
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: '#ffffff', zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {loaderContent}
            </div>
        );
    }

    return loaderContent;
};
