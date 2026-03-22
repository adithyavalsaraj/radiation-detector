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
          <a href="/downloads/RadiationTracker-Mac.dmg" className="download-btn mac" onClick={(e) => { e.preventDefault(); alert("Creating DMG in final build."); }}>
            🍏 Mac (DMG) {os === 'mac' && "★"}
          </a>
          <a href="/downloads/RadiationTracker-Win.exe" className="download-btn win" onClick={(e) => { e.preventDefault(); alert("Creating EXE in final build."); }}>
            🪟 Windows (EXE) {os === 'win' && "★"}
          </a>
          <a href="/downloads/RadiationTracker-Linux.AppImage" className="download-btn lin" onClick={(e) => { e.preventDefault(); alert("Creating AppImage in final build."); }}>
            🐧 Linux (AppImage) {os === 'lin' && "★"}
          </a>
          <a href="/downloads/RadiationTracker-Android.apk" className="download-btn and" onClick={(e) => { e.preventDefault(); alert("Creating APK in final build."); }}>
            📱 Android (APK) {os === 'and' && "★"}
          </a>
          <a href="#" className="download-btn ios" onClick={(e) => { e.preventDefault(); alert("iOS requires TestFlight/Sideloading."); }}>
            🍎 iOS (IPA) {os === 'ios' && "★"}
          </a>
        </div>
      </div>
    </div>
  );
}
