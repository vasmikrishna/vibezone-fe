import React, { useState, useEffect } from "react";
import Joyride from "react-joyride";
import "./onboarding.css";

export default function OnboardingFlow() {
  const [run, setRun] = useState(false); // Initially false to prevent running the flow immediately

  // Check localStorage when the component loads
  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (!hasSeenOnboarding) {
      setRun(true); // Start the onboarding flow
    }
  }, []);

  const steps = [
    {
      target: ".start-button",
      content: "Start connecting with others here.",
    },
    {
      target: ".skip-button",
      content: "Skip to the next user here.",
    },
    {
      target: ".video-button",
      content: "Mute or unmute your mic here.",
    },
    {
      target: ".mute-button",
      content: "Enable or disable your video here.",
    },
  ];

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true}
      showSkipButton={false}
      disableOverlayClose={true}
      disableScrollParentFix={true}
      spotlightClicks={false}
      styles={{
        options: {
          zIndex: 10000,
        },
      }}
      callback={({ status }) => {
        // When onboarding finishes or is skipped, set the localStorage flag
        if (status === "finished" || status === "skipped") {
          setRun(false);
          localStorage.setItem("hasSeenOnboarding", "true"); // Mark as seen
        }
      }}
    />
  );
}
