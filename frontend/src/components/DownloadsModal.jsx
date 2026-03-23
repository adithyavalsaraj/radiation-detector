import React, { useEffect, useState } from 'react';
import './Onboarding.css'; // Reusing some CSS classes for visual consistency

export default function DownloadsModal({ onClose }) {
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

  return (
    <div className="onboarding-overlay" onClick={onClose}>
      <div className="glass-card onboarding-card" onClick={e => e.stopPropagation()}>
        <div className="tooltip-header" style={{ width: '100%', marginBottom: '1rem' }}>
          <h2>Download Native Apps</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <p className="onboarding-desc">
          For the best experience and automatic hardware scanning without IP configuration, download the native app for your platform.
        </p>

        <div className="download-grid">
          <a href="https://github.com/adithyavalsaraj/radiation-detector/releases/latest/download/RadiationTracker-mac.dmg" target="_blank" rel="noopener noreferrer" className="download-btn mac">
            🍏 Mac (DMG) {os === 'mac' && "★"}
          </a>
          <a href="https://github.com/adithyavalsaraj/radiation-detector/releases/latest/download/RadiationTracker-win.exe" target="_blank" rel="noopener noreferrer" className="download-btn win">
            🪟 Windows (Installer) {os === 'win' && "★"}
          </a>
          <a href="https://github.com/adithyavalsaraj/radiation-detector/releases/latest/download/RadiationTracker-win.zip" target="_blank" rel="noopener noreferrer" className="download-btn win">
            🪟 Windows (Portable ZIP)
          </a>
          <a href="https://github.com/adithyavalsaraj/radiation-detector/releases/latest/download/RadiationTracker-linux.AppImage" target="_blank" rel="noopener noreferrer" className="download-btn lin">
            🐧 Linux (AppImage) {os === 'lin' && "★"}
          </a>
          <a href="https://github.com/adithyavalsaraj/radiation-detector/releases/latest/download/RadiationTracker-android.apk" target="_blank" rel="noopener noreferrer" className="download-btn and">
            📱 Android (APK) {os === 'and' && "★"}
          </a>
          <a href="https://github.com/adithyavalsaraj/radiation-detector/releases" target="_blank" rel="noopener noreferrer" className="download-btn ios">
            🍎 iOS (Releases) {os === 'ios' && "★"}
          </a>
        </div>
      </div>
    </div>
  );
}
