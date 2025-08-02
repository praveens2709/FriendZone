import React from 'react';
import { StyleSheet, FlatList, TouchableOpacity, Image, Dimensions, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import ThemedSafeArea from '@/components/ThemedSafeArea';
import { useRouter } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

const SCREEN_HORIZONTAL_PADDING = 20;
const CARD_HORIZONTAL_GAP = 15;
const CARD_VERTICAL_GAP = 15;
const NUM_COLUMNS = 2;

const availableWidthForCards = screenWidth - (SCREEN_HORIZONTAL_PADDING * 2);
const totalGapWidthInRow = CARD_HORIZONTAL_GAP * (NUM_COLUMNS - 1);
const CARD_WIDTH = (availableWidthForCards - totalGapWidthInRow) / NUM_COLUMNS;

interface GameCardData {
  id: string;
  name: string;
  imageUri: any;
  minPlayers: number;
  maxPlayers: number;
}

const MOCK_GAMES: GameCardData[] = [
  { id: 'chess', name: 'Chess', imageUri: require('@/assets/images/chess.png'), minPlayers: 2, maxPlayers: 2 },
  { id: 'tic_tac_toe', name: 'Tic-Tac-Toe', imageUri: require('@/assets/images/tictactoe.png'), minPlayers: 2, maxPlayers: 2 },
  { id: 'wordhunt', name: 'Word Hunt', imageUri: require('@/assets/images/wordhunt.png'), minPlayers: 2, maxPlayers: 4 },
  { id: 'checkers', name: 'Checkers', imageUri: require('@/assets/images/checkers.png'), minPlayers: 2, maxPlayers: 2 },
  { id: 'connect4', name: 'Connect Four', imageUri: require('@/assets/images/connect4.png'), minPlayers: 2, maxPlayers: 2 },
  { id: 'uno', name: 'UNO', imageUri: require('@/assets/images/uno.png'), minPlayers: 2, maxPlayers: 8 },
  { id: 'sudoku', name: 'Sudoku', imageUri: require('@/assets/images/sudoku.png'), minPlayers: 1, maxPlayers: 1 },
  { id: 'minesweeper', name: 'Minesweeper', imageUri: require('@/assets/images/minesweeper.png'), minPlayers: 1, maxPlayers: 1 },
  { id: 'snake_ladder', name: 'Snake and Ladder', imageUri: require('@/assets/images/snake_ladder.png'), minPlayers: 2, maxPlayers: 4 },
  { id: 'skribble', name: 'Skribble', imageUri: require('@/assets/images/skribble.png'), minPlayers: 2, maxPlayers: 8 },
];

export default function GamesScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const handlePlayPress = (game: GameCardData) => {
    router.push({
      pathname: '/(tabs)/games/InviteFriendsToGameScreen',
      params: {
        gameId: game.id,
        gameName: game.name,
        gameImage: game.imageUri,
        minPlayers: String(game.minPlayers),
        maxPlayers: String(game.maxPlayers),
      },
    });
  };

  const renderGameCard = ({ item }: { item: GameCardData }) => (
    <View style={styles.gameCardColumnWrapper}>
      <ThemedView style={[styles.gameCard, { backgroundColor: colors.buttonBackgroundSecondary }]}>
        <Image source={item.imageUri} style={styles.gameImage} resizeMode="cover" />
        <View style={styles.imageDarkOverlay} />

        <ThemedView style={[styles.gameNameLabel, { backgroundColor: colors.primary }]}>
          <ThemedText style={[styles.gameNameText, { color: colors.buttonText }]}>
            {item.name}
          </ThemedText>
        </ThemedView>

        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: colors.primary }]}
          onPress={() => handlePlayPress(item)}
        >
          <ThemedText style={[styles.playButtonText, { color: colors.buttonText }]}>
            Play
          </ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </View>
  );

  return (
    <LinearGradient colors={colors.gradient} style={styles.gradientContainer}>
      <ThemedSafeArea style={styles.safeArea}>
        <FlatList
          data={MOCK_GAMES}
          renderItem={renderGameCard}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContentContainer}
          ListEmptyComponent={() => (
            <ThemedView style={styles.emptyListContainer}>
              <ThemedText style={[styles.emptyText, { color: colors.textDim }]}>
                No games available at the moment.
              </ThemedText>
            </ThemedView>
          )}
        />
      </ThemedSafeArea>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingBottom: Platform.OS === 'ios' ? 50 : 20
  },
  listContentContainer: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingVertical: CARD_VERTICAL_GAP,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: CARD_VERTICAL_GAP,
  },
  gameCardColumnWrapper: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.2,
  },
  gameCard: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  gameImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 12,
    zIndex: 0,
  },
  imageDarkOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    zIndex: 1,
  },
  gameNameLabel: {
    position: 'absolute',
    top: 12,
    left: 0,
    paddingHorizontal: 10,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    zIndex: 3,
  },
  gameNameText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  playButton: {
    paddingHorizontal: 25,
    paddingVertical: 2,
    borderRadius: 15,
    zIndex: 2,
    marginBottom: 10
  },
  playButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    backgroundColor: 'transparent',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});