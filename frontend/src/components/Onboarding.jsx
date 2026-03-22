import React, { useState } from 'react';
import './Onboarding.css';

const isElectron = navigator.userAgent.toLowerCase().includes(" electron/");
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isCapacitor = (window.location.origin && window.location.origin.includes("capacitor://")) || (window.location.hostname === 'localhost' && !isElectron);

export default function Onboarding({ onComplete, socketUrl, setSocketUrl }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Radiation Tracker",
      description: "Discover the invisible wireless infrastructure around you. Track WiFi Access Points, Bluetooth devices, and Mesh Networks in real-time.",
      icon: "📡"
    },
    {
      title: "Identify & Secure",
      description: "Automatically identify router brands, mesh networks, and potentially suspicious unknown emitters lurking in your vicinity.",
      icon: "🔍"
    },
    {
      title: "Connection Setup",
      description: (isElectron || (isLocalhost && !isCapacitor))
        ? "You are running the local app! We are connecting automatically to your system's hardware scanner."
        : "You are using a Remote Dashboard. Please enter the IP address of your Desktop Core Node to remotely connect to its scanner. You can find this on your desktop app.",
      isConnection: true
    }
  ];

  const currentStep = steps[step];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // Complete onboarding, save flag
      localStorage.setItem("onboarding_complete", "true");
      onComplete();
    }
  };

  return (
    <div className="onboarding-overlay">
      <div className="glass-card onboarding-card">
        {!currentStep.isConnection && <div className="onboarding-icon">{currentStep.icon}</div>}
        <h2>{currentStep.title}</h2>
        <p className="onboarding-desc">{currentStep.description}</p>
        {currentStep.isConnection && (!isElectron && (!isLocalhost || isCapacitor)) && (
          <div className="connection-setup">
            <label>CORE NODE IP ADDRESS</label>
            <input 
              type="text" 
              value={socketUrl} 
              onChange={(e) => {
                setSocketUrl(e.target.value);
                localStorage.setItem("backend_url", e.target.value);
              }} 
              placeholder="http://192.168.1.x:3001"
              className="onboarding-input"
            />
            <p className="hint">Ensure your Desktop app is running on the same WiFi network.</p>
          </div>
        )}

        <div className="onboarding-footer">
          <div className="step-indicators">
            {steps.map((_, i) => (
              <div key={i} className={`dot ${i === step ? 'active' : ''}`} />
            ))}
          </div>
          <button className="next-btn" onClick={handleNext}>
            {step === steps.length - 1 ? "FINISH AND START" : "NEXT"}
          </button>
        </div>
      </div>
    </div>
  );
}
