import { useState } from "react";
import Joyride, { STATUS } from "react-joyride";
import "./onboarding.css";

// Every target is always rendered (Skip is disabled until a call starts), so no step can strand the tour.
const steps = [
  { target: ".start-button", content: "Start connecting with others here.", disableBeacon: true },
  { target: ".skip-button", content: "Once you're in a call, skip to the next person here." },
  { target: ".mute-button", content: "Mute or unmute your mic here." },
  { target: ".video-button", content: "Turn your camera on or off here." },
];

const BUTTON = { minHeight: 44, padding: "0 18px", borderRadius: 999, fontFamily: "inherit", fontSize: 15 };

export default function Onboarding() {
  const [run, setRun] = useState(() => !localStorage.getItem("hasSeenOnboarding"));

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      disableOverlayClose
      disableScrollParentFix
      showSkipButton
      locale={{ last: "Done" }}
      styles={{ options: { zIndex: 10000, primaryColor: "#8f47ff" }, buttonNext: BUTTON, buttonBack: BUTTON, buttonSkip: BUTTON }}
      callback={({ status }) => {
        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
          setRun(false);
          localStorage.setItem("hasSeenOnboarding", "true");
        }
      }}
    />
  );
}
