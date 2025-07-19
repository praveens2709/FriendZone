import React from 'react';
import ContentLoader, { Rect, Circle } from 'react-content-loader/native';
import { useTheme } from '@/context/ThemeContext';
import { Dimensions } from 'react-native';

interface UserSearchLoaderProps {
  height?: number;
  horizontalPadding?: number;
}

const UserSearchLoader: React.FC<UserSearchLoaderProps> = ({ height = 70, horizontalPadding = 10 }) => {
  const { colors } = useTheme();

  const screenWidth = Dimensions.get('window').width;
  const loaderWidth = screenWidth - (horizontalPadding * 2);

  const avatarRadius = 25;
  const avatarX = 10 + avatarRadius;

  const textStartX = avatarX + avatarRadius + 15;

  const buttonWidth = 100;
  const buttonHeight = 30;
  const buttonX = loaderWidth - buttonWidth - 15;

  return (
    <ContentLoader
      speed={1}
      width={loaderWidth}
      height={height}
      viewBox={`0 0 ${loaderWidth} ${height}`}
      backgroundColor={colors.buttonBackgroundSecondary}
      foregroundColor={colors.textSecondary}
      opacity={0.8}
    >
      <Circle cx={avatarX} cy="35" r={avatarRadius} />
      <Rect x={textStartX} y="20" rx="4" ry="4" width="150" height="15" />
      <Rect x={textStartX} y="45" rx="3" ry="3" width="100" height="10" />
      <Rect x={buttonX} y="25" rx="15" ry="15" width={buttonWidth} height={buttonHeight} />
    </ContentLoader>
  );
};

export default UserSearchLoader;