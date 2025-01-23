import React from 'react';

const InstagramCTA = () => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column'}}>
      <a 
        href="https://x.com/vibezoneorg" 
        target="_blank" 
        rel="noopener noreferrer" 
        style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', fontSize: '1.5rem', color:'white'}}
      >
        {/* <img 
          src="https://about.x.com/content/dam/about-twitter/x/brand-toolkit/logo-black.png.twimg.1920.png" 
          alt="X"  width={15} style={{ marginRight: '5px'}}
        /> */}
          𝕏
      </a>
      <p style={{ fontSize: '1.5rem', color:'white'}}>CA: 8QEA8DMUZaZH2xui1VyY97nVfeN3dhxfEBjdYXYpump</p>
    </div>
  );
};


export default InstagramCTA;
