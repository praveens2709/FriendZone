import React from "react";
import LegalDocument from "@/components/LegalDocument";
import { TERMS_SECTIONS } from "@/constants/legal";

export default function TermsScreen() {
  return (
    <LegalDocument
      title="Terms of Service"
      intro="Please read these Terms. They are short and written to be understood."
      sections={TERMS_SECTIONS}
    />
  );
}
