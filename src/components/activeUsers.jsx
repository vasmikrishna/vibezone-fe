const StatusWithNumber = ({ number }) => {
  return (
    <div className="active-users" aria-label={`${number} people online`} data-testid="active-users">
      <span style={{ width: '10px', height: '10px', backgroundColor: '#32CD32', borderRadius: '50%' }} />
      <span style={{ fontWeight: 600 }}>{number.toLocaleString()}</span>
    </div>
  );
};

export default StatusWithNumber;
