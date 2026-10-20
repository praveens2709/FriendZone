import React from "react";
import { BottomSheetBackdrop, BottomSheetBackdropProps } from "@gorhom/bottom-sheet";

export const renderSheetBackdrop = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop
    {...props}
    appearsOnIndex={0}
    disappearsOnIndex={-1}
    pressBehavior="close"
    opacity={0.45}
  />
);
