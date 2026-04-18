import React from 'react';

interface WelcomeProps {
  onEnter: () => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onEnter }) => {
  return (
    <div className="welcome-container" style={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#000',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Liquid Background Blobs */}
      <div className="liquid-bg">
        <div className="glow-blob" style={{ top: '10%', left: '10%' }}></div>
        <div className="glow-blob" style={{ bottom: '10%', right: '10%' }}></div>
        <div className="glow-blob" style={{ top: '50%', left: '50%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(96, 165, 250, 0.2) 0%, transparent 70%)' }}></div>
      </div>

      <div className="fade-in" style={{ textAlign: 'center', zIndex: 10 }}>
        <h1 className="text-glow" style={{ 
          fontSize: '4.5rem', 
          fontWeight: 800, 
          letterSpacing: '-2px',
          background: 'linear-gradient(to bottom, #fff 0%, #a1a1aa 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '1rem'
        }}>
          Nutrition Tracker Pro
        </h1>
        <p style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '1.4rem', 
          maxWidth: '600px', 
          margin: '0 auto 3rem',
          lineHeight: 1.6
        }}>
          探索健康飲食的奧秘，打造專屬您的營養管家。
        </p>

        <button 
          className="btn-primary" 
          onClick={onEnter}
          style={{ 
            padding: '1.2rem 4rem', 
            fontSize: '1.2rem',
            borderRadius: '50px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
        >
          🚀 進入 Nutrition Tracker Pro
        </button>
      </div>

      <div style={{ 
        position: 'absolute', 
        bottom: '2rem', 
        fontSize: '0.9rem', 
        color: 'rgba(255,255,255,0.2)' 
      }}>
        Crafted with Liquid Glass Aesthetics
      </div>
    </div>
  );
};

export default Welcome;
