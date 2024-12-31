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
      <span style={{ color: '#32CD32', fontWeight: 'bold' }}>{number}</span>
    </div>
  );
};

export default StatusWithNumber;
