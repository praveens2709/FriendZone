export interface AppColors {
  text: string;
  background: string;
  primary: string;
  tint: string;
  buttonText: string;
  border: string;
  textDim: string;
  isDark: boolean;
  gradient: readonly [string, string, ...string[]];
  tabBarBackground: string;
  tabBarBorder: string;
  tabBarActive: string;
  tabBarInactive: string;
  success: string;
  error: string;
  info: string;
  backgroundSecondary: string;
  textSecondary: string;
  buttonBackgroundSecondary: string;
  buttonTextSecondary: string;
  selectedItemBackground: string;
  overlay: string;
  storyGradient1: string;
  storyGradient2: string;
  red: string;
  overlayLight: string;
  outline: string;
  accent: string;
}

type BaseColors = Omit<AppColors, 'outline' | 'accent'>;

export const LightThemeColors: BaseColors = {
  background: '#FFFFFF',
  text: '#000',
  textDim: '#2b2b2b',
  border: '#CCCCCC',
  primary: '#2b2b2b',
  gradient: ['#EEEEEE', '#F0f0f0'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#DDDDDD',
  tabBarActive: '#2b2b2b',
  tabBarInactive: '#888888',
  isDark: false,
  tint: '#2b2b2b',
  success: '#4CAF50',
  error: '#F44336',
  info: '#2196F3',
  backgroundSecondary: '#F8F8F8',
  textSecondary: '#333333',
  buttonBackgroundSecondary: '#E0E0E0',
  buttonTextSecondary: '#2b2b2b',
  selectedItemBackground: '#E0E0E0',
  overlay: 'rgba(0,0,0,0.3)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(0,0,0,0.1)',
};

export const DarkThemeColors: BaseColors = {
  background: '#121212',
  text: '#FFFFFF',
  textDim: '#888',
  border: '#555555',
  primary: '#b0b0b0',
  gradient: ['#1A1A1A', '#171717'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#1A1A1A',
  tabBarBorder: '#333333',
  tabBarActive: '#FFFFFF',
  tabBarInactive: '#888',
  isDark: true,
  tint: '#FFFFFF',
  success: '#66BB6A',
  error: '#EF5350',
  info: '#42A5F5',
  backgroundSecondary: '#1C1C1C',
  textSecondary: '#E0E0E0',
  buttonBackgroundSecondary: '#444444',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#3A3A3A',
  overlay: 'rgba(0,0,0,0.5)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(255,255,255,0.1)',
};

export const OreoThemeColors: BaseColors = {
  background: '#2b2b2b',
  text: '#FFFFFF',
  textDim: '#FEFEFE',
  border: '#DDDDDD',
  primary: '#F0F0F0',
  gradient: ['#2b2b2b', '#d9d9d9'],
  buttonText: '#757474',
  tabBarBackground: '#2b2b2b',
  tabBarBorder: '#F0F0F0',
  tabBarActive: '#F0F0F0',
  tabBarInactive: '#FEFEFE',
  isDark: true,
  tint: '#F0F0F0',
  success: '#9CCC65',
  error: '#EF9A9A',
  info: '#90CAF9',
  backgroundSecondary: '#3A3A3A',
  textSecondary: '#EFEFEF',
  buttonBackgroundSecondary: '#666666',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#555555',
  overlay: 'rgba(0,0,0,0.4)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(255,255,255,0.1)',
};

export const YinyangThemeColors: BaseColors = {
  background: '#949396',
  text: '#FFFFFF',
  textDim: '#BBBBBB',
  border: '#ADADAD',
  primary: '#FFFFFF',
  gradient: ['#949396', '#1A1A1A'],
  buttonText: '#000000',
  tabBarBackground: '#000000',
  tabBarBorder: '#333333',
  tabBarActive: '#FFFFFF',
  tabBarInactive: '#BBBBBB',
  isDark: true,
  tint: '#FFFFFF',
  success: '#DCE775',
  error: '#FFCDD2',
  info: '#BBDEFB',
  backgroundSecondary: '#78787C',
  textSecondary: '#EFEFEF',
  buttonBackgroundSecondary: '#3B3B3B',
  buttonTextSecondary: '#000000',
  selectedItemBackground: '#A0A0A0',
  overlay: 'rgba(0,0,0,0.5)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(255,255,255,0.1)',
};

export const OceanThemeColors: BaseColors = {
  background: '#0288D1',
  text: '#034F84',
  textDim: '#15466A',
  border: '#88C2E3',
  primary: '#0288D1',
  gradient: ['#0288D1', '#26C6DA'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#D0F0FD',
  tabBarBorder: '#88C2E3',
  tabBarActive: '#0288D1',
  tabBarInactive: '#15466A',
  isDark: false,
  tint: '#0288D1',
  success: '#66BB6A',
  error: '#EF5350',
  info: '#42A5F5',
  backgroundSecondary: '#E0F5FF',
  textSecondary: '#034F84',
  buttonBackgroundSecondary: '#E0F5FF',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#B3E5FC',
  overlay: 'rgba(0,0,0,0.3)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(0,0,0,0.1)',
};

export const ForestThemeColors: BaseColors = {
  background: '#4CAF50',
  text: '#154F1A',
  textDim: '#70631f',
  border: '#2a8031',
  primary: '#1f7025',
  gradient: ['#4CAF50', '#81C784'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#E8F5E9',
  tabBarBorder: '#A5C68E',
  tabBarActive: '#1f7025',
  tabBarInactive: '#70631f',
  isDark: false,
  tint: '#1f7025',
  success: '#81C784',
  error: '#FFAB91',
  info: '#C5E1A5',
  backgroundSecondary: '#E8F5E9',
  textSecondary: '#154F1A',
  buttonBackgroundSecondary: '#E8F5E9',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#C8E6C9',
  overlay: 'rgba(0,0,0,0.3)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(0,0,0,0.1)',
};

export const MidnightThemeColors: BaseColors = {
  background: '#2d0961',
  text: '#d7bff5',
  textDim: '#C2A6FF',
  border: '#5D3FD3',
  primary: '#6b15e8',
  gradient: ['#000000', '#2d0961'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#121212',
  tabBarBorder: '#5D3FD3',
  tabBarActive: '#d7bff5',
  tabBarInactive: '#C2A6FF',
  isDark: true,
  tint: '#d7bff5',
  success: '#8E24AA',
  error: '#D32F2F',
  info: '#7E57C2',
  backgroundSecondary: '#1A0436',
  textSecondary: '#E0CCFF',
  buttonBackgroundSecondary: '#1A0436',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#3F1A73',
  overlay: 'rgba(0,0,0,0.6)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(255,255,255,0.1)',
};

export const CandyThemeColors: BaseColors = {
  background: '#EC407A',
  text: '#FFFFFF',
  textDim: '#f0daee',
  border: '#F8BBD0',
  primary: '#d91e5e',
  gradient: ['#EC407A', '#AB47BC'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#FFE6F7',
  tabBarBorder: '#F8BBD0',
  tabBarActive: '#d91e5e',
  tabBarInactive: '#AB47BC',
  isDark: false,
  tint: '#d91e5e',
  success: '#BA68C8',
  error: '#FF8A80',
  info: '#F06292',
  backgroundSecondary: '#FCE4EC',
  textSecondary: '#880E4F',
  buttonBackgroundSecondary: '#f05b8e',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#F8BBD0',
  overlay: 'rgba(0,0,0,0.3)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(0,0,0,0.1)',
};

export const EarthThemeColors: BaseColors = {
  background: '#452d25',
  text: '#210e08',
  textDim: '#d6bfb0',
  border: '#B29988',
  primary: '#8f7a72',
  gradient: ['#8a6a5f', '#452d25'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#F4EFEA',
  tabBarBorder: '#B29988',
  tabBarActive: '#452d25',
  tabBarInactive: '#8f7a72',
  isDark: false,
  tint: '#452d25',
  success: '#A1887F',
  error: '#BF360C',
  info: '#D7CCC8',
  backgroundSecondary: '#8a6a5f',
  textSecondary: '#210e08',
  buttonBackgroundSecondary: '#8A6A5F',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#BCAAA4',
  overlay: 'rgba(0,0,0,0.3)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(0,0,0,0.1)',
};

export const DesertThemeColors: BaseColors = {
  background: '#b37c1e',
  text: '#4E342E',
  textDim: '#4a301b',
  border: '#8a5e3d',
  primary: '#6B8E23',
  gradient: ['#f0b859', '#ba8b09'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#FFF5E1',
  tabBarBorder: '#D7B24E',
  tabBarActive: '#ba8b09',
  tabBarInactive: '#4E342E',
  isDark: false,
  tint: '#ba8b09',
  success: '#A2E12F',
  error: '#D50000',
  info: '#FFEB3B',
  backgroundSecondary: '#FFF9E8',
  textSecondary: '#4E342E',
  buttonBackgroundSecondary: '#edbe3e',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#FDD835',
  overlay: 'rgba(0,0,0,0.3)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(0,0,0,0.1)',
};

export const MintThemeColors: BaseColors = {
  background: '#00796B',
  text: '#FFFFFF',
  textDim: '#b0f5ee',
  border: '#80CBC4',
  primary: '#00796B',
  gradient: ['#00796B', '#26A69A'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#E0F2F1',
  tabBarBorder: '#80CBC4',
  tabBarActive: '#00796B',
  tabBarInactive: '#004D40',
  isDark: false,
  tint: '#00796B',
  success: '#4CAF50',
  error: '#F44336',
  info: '#00BCD4',
  backgroundSecondary: '#E0F2F1',
  textSecondary: '#004D40',
  buttonBackgroundSecondary: '#175750',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#B2DFDB',
  overlay: 'rgba(0,0,0,0.3)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(0,0,0,0.1)',
};

export const SteelThemeColors: BaseColors = {
  background: '#607D8B',
  text: '#37474F',
  textDim: '#425a66',
  border: '#B0BEC5',
  primary: '#607D8B',
  gradient: ['#607D8B', '#90A4AE'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#ECEFF1',
  tabBarBorder: '#B0BEC5',
  tabBarActive: '#37474F',
  tabBarInactive: '#425a66',
  isDark: false,
  tint: '#37474F',
  success: '#8BC34A',
  error: '#FF5722',
  info: '#9E9E9E',
  backgroundSecondary: '#CFD8DC',
  textSecondary: '#263238',
  buttonBackgroundSecondary: '#b8c9d1',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#B0BEC5',
  overlay: 'rgba(0,0,0,0.3)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(0,0,0,0.1)',
};

export const RoyalThemeColors: BaseColors = {
  background: '#190c5c',
  text: '#d5d7db',
  textDim: '#8479a8',
  border: '#D1B3FF',
  primary: '#5E35B1',
  gradient: ['#190c5c', '#5007a8'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#F5F0FF',
  tabBarBorder: '#D1B3FF',
  tabBarActive: '#5007a8',
  tabBarInactive: '#8479a8',
  isDark: true,
  tint: '#5007a8',
  success: '#7B1FA2',
  error: '#D32F2F',
  info: '#9C27B0',
  backgroundSecondary: '#2C0A74',
  textSecondary: '#E0DFFF',
  buttonBackgroundSecondary: '#2f085e',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#3F1E8C',
  overlay: 'rgba(0,0,0,0.5)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(255,255,255,0.1)',
};

export const LavenderThemeColors: BaseColors = {
  background: '#AB47BC',
  text: '#FFFFFF',
  textDim: '#dbd3e6',
  border: '#CE93D8',
  primary: '#AB47BC',
  gradient: ['#AB47BC', '#BA68C8'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#F3E5F5',
  tabBarBorder: '#CE93D8',
  tabBarActive: '#AB47BC',
  tabBarInactive: '#4A148C',
  isDark: false,
  tint: '#AB47BC',
  success: '#9CCC65',
  error: '#EF5350',
  info: '#CE93D8',
  backgroundSecondary: '#EDE7F6',
  textSecondary: '#4A148C',
  buttonBackgroundSecondary: '#873a94',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#E1BEE7',
  overlay: 'rgba(0,0,0,0.3)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(0,0,0,0.1)',
};

export const PlatinumThemeColors: BaseColors = {
  background: '#BDBDBD',
  text: '#212121',
  textDim: '#858383',
  border: '#ACACAC',
  primary: '#9E9E9E',
  gradient: ['#BDBDBD', '#E0E0E0'],
  buttonText: '#000000',
  tabBarBackground: '#F8F8F8',
  tabBarBorder: '#BDBDBD',
  tabBarActive: '#212121',
  tabBarInactive: '#858383',
  isDark: false,
  tint: '#212121',
  success: '#A5D6A7',
  error: '#FFCDD2',
  info: '#B0BEC5',
  backgroundSecondary: '#E0E0E0',
  textSecondary: '#212121',
  buttonBackgroundSecondary: '#c4c4c4',
  buttonTextSecondary: '#000000',
  selectedItemBackground: '#EEEEEE',
  overlay: 'rgba(0,0,0,0.3)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(0,0,0,0.1)',
};

export const BlushThemeColors: BaseColors = {
  background: '#EC407A',
  text: '#880E4F',
  textDim: '#D81B60',
  border: '#F8BBD0',
  primary: '#EC407A',
  gradient: ['#EC407A', '#F48FB1'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#FFF5F7',
  tabBarBorder: '#F8BBD0',
  tabBarActive: '#EC407A',
  tabBarInactive: '#880E4F',
  isDark: false,
  tint: '#EC407A',
  success: '#E57373',
  error: '#EF5350',
  info: '#F06292',
  backgroundSecondary: '#FFEBEE',
  textSecondary: '#880E4F',
  buttonBackgroundSecondary: '#FFEBEE',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#F8BBD0',
  overlay: 'rgba(0,0,0,0.3)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(0,0,0,0.1)',
};

export const RosegoldThemeColors: BaseColors = {
  background: '#B76E79',
  text: '#bf3b3b',
  textDim: '#875c5c',
  border: '#F7C6C7',
  primary: '#b53f3f',
  gradient: ['#B76E79', '#F7C6C7'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#FFF5F5',
  tabBarBorder: '#F7C6C7',
  tabBarActive: '#b53f3f',
  tabBarInactive: '#875c5c',
  isDark: false,
  tint: '#b53f3f',
  success: '#D4C4C2',
  error: '#C62828',
  info: '#F8BBD0',
  backgroundSecondary: '#FFF0F0',
  textSecondary: '#bf3b3b',
  buttonBackgroundSecondary: '#FFF0F0',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#FFCDD2',
  overlay: 'rgba(0,0,0,0.3)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(0,0,0,0.1)',
};

export const CoffeeThemeColors: BaseColors = {
  background: '#795548',
  text: '#332522',
  textDim: '#4a3935',
  border: '#5c4b48',
  primary: '#795548',
  gradient: ['#795548', '#BCAAA4'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#b08d82',
  tabBarBorder: '#6b5249',
  tabBarActive: '#795548',
  tabBarInactive: '#332522',
  isDark: false,
  tint: '#795548',
  success: '#C5E1A5',
  error: '#FF8A65',
  info: '#D7CCC8',
  backgroundSecondary: '#BCAAA4',
  textSecondary: '#332522',
  buttonBackgroundSecondary: '#9c847c',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#D7CCC8',
  overlay: 'rgba(0,0,0,0.3)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(0,0,0,0.1)',
};

export const IceThemeColors: BaseColors = {
  background: '#03A9F4',
  text: '#01579B',
  textDim: '#0288D1',
  border: '#a2dbf5',
  primary: '#03A9F4',
  gradient: ['#03A9F4', '#81D4FA'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#E0F7FF',
  tabBarBorder: '#81D4FA',
  tabBarActive: '#03A9F4',
  tabBarInactive: '#01579B',
  isDark: false,
  tint: '#03A9F4',
  success: '#4FC3F7',
  error: '#FFEB3B',
  info: '#03A9F4',
  backgroundSecondary: '#F0FAFF',
  textSecondary: '#01579B',
  buttonBackgroundSecondary: '#F0FAFF',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#B3E5FC',
  overlay: 'rgba(0,0,0,0.3)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(0,0,0,0.1)',
};

export const SakuraThemeColors: BaseColors = {
  background: '#FF69B4',
  text: '#B03060',
  textDim: '#c24c78',
  border: '#F8C1D2',
  primary: '#FF69B4',
  gradient: ['#FF69B4', '#F8BBD0'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#FFF0F5',
  tabBarBorder: '#F8C1D2',
  tabBarActive: '#FF69B4',
  tabBarInactive: '#B03060',
  isDark: false,
  tint: '#FF69B4',
  success: '#F48FB1',
  error: '#FF8A80',
  info: '#F8BBD0',
  backgroundSecondary: '#FFF8F9',
  textSecondary: '#B03060',
  buttonBackgroundSecondary: '#FFF8F9',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#FCE4EC',
  overlay: 'rgba(0,0,0,0.3)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(0,0,0,0.1)',
};

export const FireThemeColors: BaseColors = {
  background: '#FF5722',
  text: '#FFFFFF',
  textDim: '#FFFFFF',
  border: '#DFDFDF',
  primary: '#FF5722',
  gradient: ['#FF5722', '#FFC107'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#FFF4E6',
  tabBarBorder: '#FF8A65',
  tabBarActive: '#FF5722',
  tabBarInactive: '#a63c1b',
  isDark: false,
  tint: '#FF5722',
  success: '#FFC107',
  error: '#D32F2F',
  info: '#FF8A65',
  backgroundSecondary: '#302f2f',
  textSecondary: '#E65100',
  buttonBackgroundSecondary: '#a63c1b',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#FFE0B2',
  overlay: 'rgba(0,0,0,0.3)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(0,0,0,0.1)',
};

export const MysticForestThemeColors: BaseColors = {
  background: '#0a1a14ff',
  text: '#d0e0d0',
  textDim: '#708070',
  border: '#2a4a2c',
  primary: '#3d8041',
  gradient: ['#011E16', '#000403'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#102413',
  tabBarBorder: '#2a4a2c',
  tabBarActive: '#d0e0d0',
  tabBarInactive: '#708070',
  isDark: true,
  tint: '#d0e0d0',
  success: '#4CAF50',
  error: '#EF5350',
  info: '#2196F3',
  backgroundSecondary: '#122414',
  textSecondary: '#a0b0a0',
  buttonBackgroundSecondary: '#163026',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#304032',
  overlay: 'rgba(0,0,0,0.6)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(255,255,255,0.1)',
};

export const SeafoamThemeColors: BaseColors = {
  background: '#08171c',
  text: '#FFFFFF',
  textDim: '#A0A0A0',
  border: '#84b1c4',
  primary: '#2BBECF',
  gradient: ['#0b2129', '#0A0A0F'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#0F2027',
  tabBarBorder: '#2C2F36',
  tabBarActive: '#2BBECF',
  tabBarInactive: '#A0A0A0',
  isDark: true,
  tint: '#2BBECF',
  success: '#4CAF50',
  error: '#C62828',
  info: '#03A9F4',
  backgroundSecondary: '#071c24',
  textSecondary: '#A0A0A0',
  buttonBackgroundSecondary: '#234754',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#2C2F36',
  overlay: 'rgba(0,0,0,0.6)',
  storyGradient1: '#2BBECF',
  storyGradient2: '#03A9F4',
  red: '#F44336',
  overlayLight: 'rgba(255,255,255,0.1)',
};

export const OrchidThemeColors: BaseColors = {
  background: '#2e1028',
  text: '#FFFFFF',
  textDim: '#b5a0b7',
  border: '#6f2c71',
  primary: '#820860',
  gradient: ['#290020', '#0A0107'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#2d002f',
  tabBarBorder: '#6f2c71',
  tabBarActive: '#c72e9d',
  tabBarInactive: '#b5a0b7',
  isDark: true,
  tint: '#c72e9d',
  success: '#BA68C8',
  error: '#DC143C',
  info: '#9C27B0',
  backgroundSecondary: '#290020',
  textSecondary: '#f0e0f2',
  buttonBackgroundSecondary: '#631f56',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#e7c1e8',
  overlay: 'rgba(0,0,0,0.6)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(255,255,255,0.1)',
};

export const SkyThemeColors: BaseColors = {
  background: '#00003c',
  text: '#FFFFFF',
  textDim: '#a8c6f2',
  border: '#154881',
  primary: '#0e4880',
  gradient: ['#010844', '#02020C'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#000020',
  tabBarBorder: '#154881',
  tabBarActive: '#1e90ff',
  tabBarInactive: '#a8c6f2',
  isDark: true,
  tint: '#1e90ff',
  success: '#2E8B57',
  error: '#DC143C',
  info: '#1E90FF',
  backgroundSecondary: '#051121',
  textSecondary: '#f0f8ff',
  buttonBackgroundSecondary: '#062340',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#154881',
  overlay: 'rgba(0,0,0,0.6)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(255,255,255,0.1)',
};

export const AquamarineThemeColors: BaseColors = {
  background: '#032936',
  text: '#FFFFFF',
  textDim: '#70b0b0',
  border: '#00796B',
  primary: '#10828A',
  gradient: ['#01222D', '#010608'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#002525',
  tabBarBorder: '#00796B',
  tabBarActive: '#00e0b3',
  tabBarInactive: '#70b0b0',
  isDark: true,
  tint: '#00e0b3',
  success: '#2E8B57',
  error: '#DC143C',
  info: '#1E90FF',
  backgroundSecondary: '#022626',
  textSecondary: '#e0f8ff',
  buttonBackgroundSecondary: '#03181f',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#00796B',
  overlay: 'rgba(0,0,0,0.6)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(255,255,255,0.1)',
};

export const CherryBlossomThemeColors: BaseColors = {
  background: '#14010f',
  text: '#FFFFFF',
  textDim: '#b5a0b7',
  border: '#993366',
  primary: '#D92A98',
  gradient: ['#2D0021', '#0A0107'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#2d002f',
  tabBarBorder: '#993366',
  tabBarActive: '#FF69B4',
  tabBarInactive: '#b5a0b7',
  isDark: true,
  tint: '#FF69B4',
  success: '#BA68C8',
  error: '#DC143C',
  info: '#9C27B0',
  backgroundSecondary: '#3d0932',
  textSecondary: '#f0e0f2',
  buttonBackgroundSecondary: '#37002D',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#993366',
  overlay: 'rgba(0,0,0,0.6)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(255,255,255,0.1)',
};

export const GraphiteThemeColors: BaseColors = {
  background: '#0d191f',
  text: '#FFFFFF',
  textDim: '#888888',
  border: '#3c3c3c',
  primary: '#627585',
  gradient: ['#182A33', '#060709'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#131617',
  tabBarBorder: '#3c3c3c',
  tabBarActive: '#4d7b91',
  tabBarInactive: '#888888',
  isDark: true,
  tint: '#607D8B',
  success: '#757575',
  error: '#D32F2F',
  info: '#9E9E9E',
  backgroundSecondary: '#0F181E',
  textSecondary: '#b0b0b0',
  buttonBackgroundSecondary: '#1C2A34',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#37474f',
  overlay: 'rgba(0,0,0,0.6)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(255,255,255,0.1)',
};

export const SunsetThemeColors: BaseColors = {
  background: '#210202',
  text: '#FFFFFF',
  textDim: '#ffcdd2',
  border: '#a21b1b',
  primary: '#DE4A19',
  gradient: ['#4C0000', '#1C0301'],
  buttonText: '#FFFFFF',
  tabBarBackground: '#4d0000',
  tabBarBorder: '#a21b1b',
  tabBarActive: '#FF5722',
  tabBarInactive: '#ffcdd2',
  isDark: true,
  tint: '#FF5722',
  success: '#E65100',
  error: '#D32F2F',
  info: '#FF8A65',
  backgroundSecondary: '#3d0000',
  textSecondary: '#ffcdd2',
  buttonBackgroundSecondary: '#510000',
  buttonTextSecondary: '#FFFFFF',
  selectedItemBackground: '#a21b1b',
  overlay: 'rgba(0,0,0,0.6)',
  storyGradient1: '#8a3ab9',
  storyGradient2: '#cd486b',
  red: '#F44336',
  overlayLight: 'rgba(255,255,255,0.1)',
};

const parseHex = (value: string): [number, number, number] | null => {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(value.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16)) as [number, number, number];
};

const toHex = (rgb: number[]) =>
  '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

const luminance = (rgb: number[]) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: number[], b: number[]) => {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const mix = (from: number[], to: number[], t: number) => from.map((v, i) => v + (to[i] - v) * t);

const minContrast = (fg: number[], surfaces: number[][]) =>
  Math.min(...surfaces.map((s) => contrast(fg, s)));

// Palettes were picked by eye and several have icons, links or text that nearly match the
// surface they sit on. Nudge only the colours that fail, using each theme's own colours.
const withReadableColors = (theme: BaseColors): AppColors => {
  const bg = parseHex(theme.background);
  const text = parseHex(theme.text);
  if (!bg || !text) return { ...theme, outline: theme.border, accent: theme.primary };

  const gradient = theme.gradient.map(parseHex).filter((c): c is [number, number, number] => !!c);
  const bgSecondary = parseHex(theme.backgroundSecondary);
  // The first gradient stop is what sits behind most content; the far stop can be a different tone.
  const screen = [bg, ...gradient.slice(0, 1)];
  const cards = [...screen, ...(bgSecondary ? [bgSecondary] : [])];
  const extremes = [text, [0, 0, 0], [255, 255, 255]];

  // Smallest push of `base` toward text/black/white that reaches `target` on every surface.
  const readable = (base: number[], surfaces: number[][], target: number) => {
    if (minContrast(base, surfaces) >= target) return base;
    let best = base;
    let bestScore = minContrast(base, surfaces);
    for (const end of extremes) {
      for (let t = 0.05; t <= 1.0001; t += 0.05) {
        const candidate = mix(base, end, t);
        const score = minContrast(candidate, surfaces);
        if (score >= target) return candidate;
        if (score > bestScore) {
          best = candidate;
          bestScore = score;
        }
      }
    }
    return best;
  };

  const fix = (value: string, surfaces: (number[] | null)[], target: number) => {
    const rgb = parseHex(value);
    const against = surfaces.filter((s): s is number[] => !!s);
    if (!rgb || !against.length) return value;
    return toHex(readable(rgb, against, target));
  };

  // Themes with dark cards on a bright screen rely on `text` being readable on both, so keep
  // the cards in the check whenever they currently work.
  const textSurfaces = bgSecondary && contrast(text, bgSecondary) >= 4.5 ? [...screen, bgSecondary] : screen;
  const textColor = fix(theme.text, textSurfaces, 3.5);
  return {
    ...theme,
    text: textColor,
    textDim: fix(theme.textDim, cards, 4.5),
    tabBarActive: fix(theme.tabBarActive, [parseHex(theme.tabBarBackground)], 3),
    tabBarInactive: fix(theme.tabBarInactive, [parseHex(theme.tabBarBackground)], 3),
    buttonText: fix(theme.buttonText, [parseHex(theme.primary)], 4.5),
    buttonTextSecondary: fix(theme.buttonTextSecondary, [parseHex(theme.buttonBackgroundSecondary)], 4.5),
    error: fix(theme.error, cards, 3),
    success: fix(theme.success, cards, 3),
    info: fix(theme.info, cards, 3),
    outline: fix(theme.border, screen, 3),
    // `primary` doubles as a fill colour and is often close to the background, so icons and
    // links use this readable stand-in instead.
    accent: fix(theme.primary, cards, 3),
  };
};

const themes = {
  light: LightThemeColors,
  dark: DarkThemeColors,
  oreo: OreoThemeColors,
  yinyang: YinyangThemeColors,
  ocean: OceanThemeColors,
  forest: ForestThemeColors,
  midnight: MidnightThemeColors,
  candy: CandyThemeColors,
  earth: EarthThemeColors,
  desert: DesertThemeColors,
  mint: MintThemeColors,
  steel: SteelThemeColors,
  royal: RoyalThemeColors,
  lavender: LavenderThemeColors,
  platinum: PlatinumThemeColors,
  blush: BlushThemeColors,
  rosegold: RosegoldThemeColors,
  coffee: CoffeeThemeColors,
  ice: IceThemeColors,
  sakura: SakuraThemeColors,
  fire: FireThemeColors,
  mysticForest: MysticForestThemeColors,
  seafoam: SeafoamThemeColors,
  orchid: OrchidThemeColors,
  sky: SkyThemeColors,
  aquamarine: AquamarineThemeColors,
  cherryBlossom: CherryBlossomThemeColors,
  graphite: GraphiteThemeColors,
  sunset: SunsetThemeColors,
};

export const Colors = Object.fromEntries(
  Object.entries(themes).map(([name, theme]) => [name, withReadableColors(theme)])
) as { [K in keyof typeof themes]: AppColors };
