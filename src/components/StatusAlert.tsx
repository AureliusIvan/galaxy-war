import React, { useState, useEffect } from 'react';

interface StatusAlertProps {
  message: string;
  duration?: number;
  onComplete: () => void;
}

const StatusAlert: React.FC<StatusAlertProps> = ({ message, duration = 2000, onComplete }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (message) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        // Allow time for fade-out animation before clearing the message
        setTimeout(onComplete, 500);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [message, duration, onComplete]);

  return (
    <div 
      className={`fixed bottom-16 left-1/2 -translate-x-1/2 px-6 py-3 bg-black bg-opacity-70 text-white text-lg font-bold rounded-lg shadow-lg transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
      style={{ textShadow: '0 0 5px #00ffff, 0 0 10px #00ffff' }}
    >
      {message}
    </div>
  );
};

export default StatusAlert; 