import React, { useEffect, useState } from 'react';
import pkg from '../../package.json';

export default function DownloadsModal({ onClose }) {
  const version = pkg.version;
  const [os, setOs] = useState('unknown');

  useEffect(() => {
    // Basic OS detection for highlighting recommended download
    const platform = window.navigator.platform.toLowerCase();
    if (platform.includes('mac')) setOs('mac');
    else if (platform.includes('win')) setOs('win');
    else if (platform.includes('linux')) setOs('lin');
    else if (/android/i.test(navigator.userAgent)) setOs('and');
    else if (/ipad|iphone|ipod/.test(platform) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) setOs('ios');
  }, []);

  const getUrl = (file) => `https://github.com/adithyavalsaraj/radiation-detector/releases/download/v${version}/${file}`;

  return (
    <div className="onboarding-overlay" onClick={onClose}>
      <div className="glass-card onboarding-card" onClick={e => e.stopPropagation()}>
        <div className="tooltip-header" style={{ width: '100%', marginBottom: '1rem' }}>
          <h2>Download Native Apps (v{version})</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <p className="onboarding-desc">
          For the best experience and automatic hardware scanning without IP configuration, download the native app for your platform.
        </p>

        <div className="download-grid">
          <a href={getUrl('RadiationTracker-mac-dmg.dmg')} target="_blank" rel="noopener noreferrer" className="download-btn mac">
            🍏 Mac (DMG) {os === 'mac' && "★"}
          </a>
          <a href={getUrl('RadiationTracker-win-nsis.exe')} target="_blank" rel="noopener noreferrer" className="download-btn win">
            🪟 Windows (Installer) {os === 'win' && "★"}
          </a>
          <a href={getUrl('RadiationTracker-win-portable.exe')} target="_blank" rel="noopener noreferrer" className="download-btn win">
            🪟 Windows (Portable EXE)
          </a>
          <a href={getUrl('RadiationTracker-win-zip.zip')} target="_blank" rel="noopener noreferrer" className="download-btn win">
            🪟 Windows (Portable ZIP)
          </a>
          <a href={getUrl('RadiationTracker-linux-appimage.AppImage')} target="_blank" rel="noopener noreferrer" className="download-btn lin">
            🐧 Linux (AppImage) {os === 'lin' && "★"}
          </a>
          <a href={getUrl('RadiationTracker-android.apk')} target="_blank" rel="noopener noreferrer" className="download-btn and">
            📱 Android (APK) {os === 'and' && "★"}
          </a>
          <div className="download-btn ios disabled" style={{ opacity: 0.6, cursor: 'not-allowed' }}>
            🍎 iOS (Coming Soon) {os === 'ios' && "★"}
          </div>
        </div>
      </div>
    </div>
  );
}
