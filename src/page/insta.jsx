import React from 'react';

const InstagramCTA = () => {
  return (
    <div >
      <a 
        href="https://www.instagram.com/vibezone_org/profilecard/?igsh=ODJ3NWRjM2V6bDBk" 
        target="_blank" 
        rel="noopener noreferrer" 
        style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', fontSize: '0.9rem',  }}
      >
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png" 
          alt="Instagram"  width={15} style={{ marginRight: '5px'}}
        />
          @vibezone_org
      </a>
    </div>
  );
};


export default InstagramCTA;
