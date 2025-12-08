export type SettingsItemType = {
  title: string;
  subTitle?: string;
  iconName?: string;
  onPress: () => void;
};

export type SectionType = {
  title: string;
  data: SettingsItemType[];
};
