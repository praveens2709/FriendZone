import React from "react";
import LegalDocument from "@/components/LegalDocument";
import { PRIVACY_SECTIONS } from "@/constants/legal";

export default function PrivacyScreen() {
  return (
    <LegalDocument
      title="Privacy Policy"
      intro="Here is what FriendZone collects, why, and what control you have."
      sections={PRIVACY_SECTIONS}
    />
  );
}
