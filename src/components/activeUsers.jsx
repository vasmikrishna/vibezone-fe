const StatusWithNumber = ({ number }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} aria-label={`${number} people online`}>
      <span style={{ width: '12px', height: '12px', backgroundColor: '#32CD32', borderRadius: '50%' }} />
      <span style={{ color: '#007bff', fontWeight: 'bold', fontSize: '18px' }}>{number}</span>
    </div>
  );
};

export default StatusWithNumber;
