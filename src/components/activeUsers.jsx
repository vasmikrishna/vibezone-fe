import React from 'react';

const StatusWithNumber = ({ number }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        fontSize: '1.5rem',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: '20px',
          height: '20px',
          backgroundColor: '#32CD32', // Lime green color
          borderRadius: '50%', // Makes it a circle
          marginRight: '10px', // Space between circle and number

        }}
      ></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ color: '#007bff', fontWeight: 'bold', fontSize: '18px' }}>
          {number}
        </span>
      </div>

    </div>
  );
};

export default StatusWithNumber;
